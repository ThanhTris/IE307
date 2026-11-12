import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zlib
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import gm33_capture as gm33


def png_fixture(width=1, height=1):
    def chunk(label, payload):
        data = label + payload
        return struct.pack('>I', len(payload)) + data + struct.pack('>I', zlib.crc32(data))
    return (gm33.PNG_HEADER + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes((width + 1) * height))) + chunk(b'IEND', b''))


class CaptureTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()
        apk = self.root / 'pilot.apk'
        with ZipFile(apk, 'w') as archive:
            archive.writestr('assets/index.android.bundle', b'synthetic fixture http://127.0.0.1:54531\x00')
        self.digest = hashlib.sha256(apk.read_bytes()).hexdigest()
        self.args = SimpleNamespace(adb='adb', serial='private-usb-id', qa_manifest=Path('manifest.json'),
                                    apk=apk, case='P06', client='A', checkpoint='after-ack', figma_node='638:9369')
        self.check = {
            'blockers': [], 'appSourceRevision': 'app-revision',
            'qa': {'runId': 'qa-fixture', 'sealSha256': 'qa-seal', 'apiPort': 54531, 'functionInventorySha256': 'qa-functions',
                   'catalogues': {'real': {'count': 39}}},
            'regression': {'sha256': 'gm32-receipt'},
        }
        self.commands = []

    def fake_adb(self, adb, serial, *command):
        self.assertEqual((adb, serial), (self.args.adb, self.args.serial))
        self.commands.append(command)
        fixtures = {
            ('shell', 'pm', 'path', gm33.PACKAGE): b'package:/data/app/~~test/pilot==/base.apk\n',
            ('shell', 'sha256sum', '/data/app/~~test/pilot==/base.apk'): self.digest.encode() + b'  base.apk\n',
            ('shell', 'getprop', 'ro.build.version.sdk'): b'35\n',
            ('shell', 'wm', 'density'): b'Physical density: 420\nOverride density: 320\n',
            ('shell', 'settings', 'get', 'system', 'font_scale'): b'2.0\n',
            ('shell', 'dumpsys', 'activity', 'activities'):
                b'topResumedActivity=ActivityRecord{123 u0 vn.gicungduoc.mobile/.MainActivity t1}',
            ('exec-out', 'screencap', '-p'): png_fixture(640, 1),
        }
        return fixtures[command]

    def capture(self, transport='device usb:1-1'):
        inventory = subprocess.CompletedProcess([], 0, 'List of devices attached\nprivate-usb-id ' + transport)
        with (patch.object(gm33, 'ROOT', self.root),
              patch.object(gm33, 'preflight', return_value=self.check),
              patch.object(gm33, 'run_command', return_value=inventory),
              patch.object(gm33, 'read_adb', side_effect=self.fake_adb)):
            return self.root / gm33.capture(self.args)

    def test_capture_records_pinned_unreviewed_private_evidence(self):
        path = self.capture()
        record = json.loads((path / 'capture.json').read_text())
        self.assertEqual(path.parent.name, 'qa-fixture')
        self.assertEqual(record['assessment'], 'Unreviewed')
        self.assertEqual(record['apkSha256'], self.digest)
        self.assertIs(record['embeddedQaOriginVerified'], True)
        self.assertEqual(record['bundleSha256'], hashlib.sha256(
            b'synthetic fixture http://127.0.0.1:54531\x00').hexdigest())
        self.assertEqual(record['gm32EvidenceSha256'], 'gm32-receipt')
        self.assertEqual(record['viewport']['displayWidthDp'], 320)
        self.assertEqual(record['viewport']['fontScale'], 2)
        self.assertEqual(record['imageSha256'], hashlib.sha256((path / 'app.png').read_bytes()).hexdigest())
        self.assertNotIn(self.args.serial, json.dumps(record))
        if os.name != 'nt':
            self.assertEqual(path.stat().st_mode & 0o777, 0o700)
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.capture()

    def test_blocked_gate_and_non_usb_device_do_not_read_device(self):
        self.check['blockers'] = ['GM-32 still blocked']
        with self.assertRaisesRegex(ValueError, 'preflight blocked'):
            self.capture()
        self.check['blockers'] = []
        with self.assertRaisesRegex(ValueError, 'authorized physical USB'):
            self.capture(transport='device product:wireless')
        self.assertEqual(self.commands, [])

    def test_apk_mismatch_does_not_capture(self):
        self.args.apk.write_bytes(b'wrong build')
        with self.assertRaisesRegex(ValueError, 'installed APK differs'):
            self.capture()
        self.assertNotIn(('exec-out', 'screencap', '-p'), self.commands)
        self.assertFalse((self.root / '.work').exists())

    def test_rejects_background_activity_and_truncated_png(self):
        self.assertFalse(gm33.foreground_is_app(
            'ActivityRecord{123 u0 vn.gicungduoc.mobile/.MainActivity t1}\n'
            'topResumedActivity=ActivityRecord{456 u0 com.android.settings/.Settings t2}'))
        with self.assertRaisesRegex(ValueError, 'PNG'):
            gm33.viewport(png_fixture()[:-12], 'Physical density: 320', '1.0')

    def test_stale_embedded_qa_origin_does_not_capture(self):
        # The installed APK matches exactly, but its cached bundle targets a
        # different run. A matching APK checksum alone must not validate it.
        with self.assertRaisesRegex(ValueError, 'verified QA origin'):
            gm33.verify_embedded_qa_origin(self.args.apk, 54541)
        self.check['qa']['apiPort'] = 54541
        with self.assertRaisesRegex(ValueError, 'rebuild the JS bundle'):
            self.capture()
        self.assertNotIn(('exec-out', 'screencap', '-p'), self.commands)
        self.assertFalse((self.root / '.work').exists())
        with self.assertRaisesRegex(ValueError, 'Invalid QA API port'):
            gm33.verify_embedded_qa_origin(self.args.apk, '54531')

    def test_missing_bundle_and_origin_prefix_are_rejected(self):
        for name, content in [('assets/index.android.bundle', b'http://127.0.0.1:545310'),
                              ('assets/other', b'http://127.0.0.1:54531')]:
            with ZipFile(self.args.apk, 'w') as archive:
                archive.writestr(name, content)
            with self.assertRaises(ValueError):
                gm33.verify_embedded_qa_origin(self.args.apk, 54531)


if __name__ == '__main__':
    unittest.main()
