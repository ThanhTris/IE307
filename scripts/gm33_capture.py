"""Collect a private, revision-pinned Stage 3B Android checkpoint."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess
import sys
import tempfile
from zipfile import BadZipFile, ZipFile

from gm33_preflight import ROOT, device_transports, preflight, run_command

PACKAGE = 'vn.gicungduoc.mobile'
CASE_IDS = tuple(f'P{index:02}' for index in range(1, 17))
PNG_HEADER = b'\x89PNG\r\n\x1a\n'


def read_adb(adb, serial, *args):
    result = subprocess.run([adb, '-s', serial, *args], cwd=ROOT, capture_output=True, timeout=30)
    if result.returncode:
        raise ValueError('ADB could not read the selected device')
    return result.stdout


def foreground_is_app(activities):
    # Require the resumed activity, rather than any stale task in the stack.
    resumed = [line for line in activities.splitlines()
               if ('topResumedActivity=' in line or 'mResumedActivity:' in line)
               and 'ActivityRecord{' in line]
    return bool(resumed) and all(re.search(r'\bu\d+\s+' + re.escape(PACKAGE) + r'/', line)
                                 for line in resumed)


def installed_apk_sha(read):
    output = read('shell', 'pm', 'path', PACKAGE).decode()
    paths = [line.removeprefix('package:') for line in output.splitlines() if line.startswith('package:')]
    if len(paths) != 1 or not re.fullmatch(r'/data/app/[A-Za-z0-9/_.=+~-]+/base\.apk', paths[0]):
        raise ValueError('Expected one standalone installed APK for the pilot package')
    line = read('shell', 'sha256sum', paths[0]).decode().strip()
    digest = line.split(maxsplit=1)[0] if line else ''
    if not re.fullmatch(r'[0-9a-f]{64}', digest):
        raise ValueError('ADB did not return the installed APK checksum')
    return digest


def apk_sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as apk:
        for chunk in iter(lambda: apk.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def verify_embedded_qa_origin(path, port):
    """Reject stale embedded JS bundles left by incremental native builds."""
    if type(port) is not int or not 1024 <= port <= 65535:
        raise ValueError('Invalid QA API port')
    try:
        with ZipFile(path) as apk:
            info = apk.getinfo('assets/index.android.bundle')
            if info.file_size > 64 * 1024 * 1024:
                raise ValueError('Embedded QA bundle exceeds the capture size limit')
            bundle = apk.read(info)
    except (BadZipFile, KeyError):
        raise ValueError('Expected a standalone APK with embedded JavaScript') from None
    expected = f'http://127.0.0.1:{port}'.encode('ascii')
    if not re.search(re.escape(expected) + rb'(?![0-9])', bundle):
        raise ValueError('Embedded APK does not contain the verified QA origin; rebuild the JS bundle')
    return hashlib.sha256(bundle).hexdigest()


def viewport(png, density, scale):
    if (len(png) < 45 or not png.startswith(PNG_HEADER + b'\x00\x00\x00\x0dIHDR')
            or not png.endswith(b'\x00\x00\x00\x00IEND\xaeB\x60\x82')):
        raise ValueError('ADB did not return a PNG screenshot')
    width, height = struct.unpack('>II', png[16:24])
    values = re.findall(r'(?:Physical|Override) density:\s*(\d+)', density)
    if (not width or not height or not values or int(values[-1]) <= 0
            or not re.fullmatch(r'[0-9]+(?:\.[0-9]+)?', scale) or float(scale) <= 0):
        raise ValueError('ADB did not return viewport and font-scale metadata')
    dpi = int(values[-1])
    return {'widthPx': width, 'heightPx': height, 'densityDpi': dpi,
            'displayWidthDp': round(width * 160 / dpi, 2), 'fontScale': float(scale)}


def capture(args):
    check = preflight(args.adb, args.qa_manifest)
    if check['blockers']:
        raise ValueError('Pilot preflight blocked: ' + '; '.join(check['blockers']))

    inventory = run_command(args.adb, 'devices', '-l')
    inventory.check_returncode()
    if device_transports(inventory.stdout).get(args.serial) != 'usb':
        raise ValueError('Select an authorized physical USB Android device')

    def read(*command):
        return read_adb(args.adb, args.serial, *command)

    expected_sha = apk_sha(args.apk)
    if expected_sha != installed_apk_sha(read):
        raise ValueError('The installed APK differs from the selected build artifact')
    bundle_sha = verify_embedded_qa_origin(args.apk, check['qa']['apiPort'])
    sdk = read('shell', 'getprop', 'ro.build.version.sdk').decode().strip()
    if not re.fullmatch(r'\d+', sdk):
        raise ValueError('ADB did not return an Android API level')
    density = read('shell', 'wm', 'density').decode()
    scale = read('shell', 'settings', 'get', 'system', 'font_scale').decode().strip()
    if scale == 'null':
        scale = '1.0'  # Android's default when the system setting is unset.
    activity = ('shell', 'dumpsys', 'activity', 'activities')
    if not foreground_is_app(read(*activity).decode()):
        raise ValueError('Bring the pilot app to the foreground before capture')
    png = read('exec-out', 'screencap', '-p')
    if not foreground_is_app(read(*activity).decode()):
        raise ValueError('Pilot app left the foreground during capture')

    qa = check['qa']
    summary = {
        'kind': 'stage-3b-usb-checkpoint', 'capturedAt': datetime.now(timezone.utc).isoformat(),
        'case': args.case, 'client': args.client, 'checkpoint': args.checkpoint, 'figmaNode': args.figma_node,
        'checkoutRevision': check['appSourceRevision'], 'apkSha256': expected_sha, 'androidApi': int(sdk),
        'embeddedQaOriginVerified': True, 'bundleSha256': bundle_sha,
        'viewport': viewport(png, density, scale),
        'qaRunId': qa['runId'], 'qaManifestSealSha256': qa['sealSha256'], 'qaApiPort': qa['apiPort'],
        'qaFunctionInventorySha256': qa['functionInventorySha256'], 'catalogues': qa['catalogues'],
        'gm32EvidenceSha256': check['regression']['sha256'], 'assessment': 'Unreviewed',
        'imageSha256': hashlib.sha256(png).hexdigest(),
    }

    # Keep raw frames private and make each checkpoint append-only.
    output = ROOT / '.work/gm33/captures' / qa['runId']
    if output.resolve() != output:
        raise ValueError('GM-33 evidence directory must not be symlinked')
    output.mkdir(mode=0o700, parents=True, exist_ok=True)
    target = output / f"{args.case}-{args.client}-{args.checkpoint}"
    if target.exists() or target.is_symlink():
        raise ValueError('Checkpoint already exists; choose another checkpoint name')
    with tempfile.TemporaryDirectory(dir=output) as temporary:
        staging = Path(temporary) / 'checkpoint'
        staging.mkdir(mode=0o700)
        (staging / 'app.png').write_bytes(png)
        (staging / 'capture.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
        staging.rename(target)
    return target.relative_to(ROOT)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--adb', default='adb')
    parser.add_argument('--serial', required=True, help='Explicit authorized USB transport')
    parser.add_argument('--qa-manifest', required=True, type=Path)
    parser.add_argument('--apk', required=True, type=Path, help='Local standalone APK used for this pilot')
    parser.add_argument('--case', required=True, choices=CASE_IDS)
    parser.add_argument('--client', required=True, choices=('A', 'B'))
    parser.add_argument('--checkpoint', required=True, help='Unique short checkpoint name such as after-ack')
    parser.add_argument('--figma-node', help='Exact frame node ID if used for visual comparison')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,39}', args.checkpoint):
        parser.error('checkpoint must contain only lowercase letters, digits and dashes')
    if args.figma_node and not re.fullmatch(r'\d+:\d+', args.figma_node):
        parser.error('Figma node must have the format 123:456')
    try:
        output = capture(args)
    except ValueError as error:
        # The parser and ADB helper expose only fixed diagnostic text.
        print(f'GM-33 capture stopped. {error}', file=sys.stderr)
        return 1
    except (KeyError, OSError, subprocess.SubprocessError):
        print('GM-33 capture could not read the build, checkout or selected USB device', file=sys.stderr)
        return 2
    print(f'Unreviewed checkpoint saved at {output}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
