"""Run the menu notebook cells in order without requiring a Jupyter kernel."""
from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
from pathlib import Path
import platform
import traceback

BASE = Path(__file__).resolve().parents[1]
DEFAULT_NOTEBOOK = BASE / 'notebooks/prepare_thu_duc_menus.ipynb'


def execute(path: Path, offline: bool = False, refresh: bool = False, allow_api: bool = False) -> Path:
    notebook = json.loads(path.read_text(encoding='utf-8'))
    namespace = {'__name__': '__main__', 'NOTEBOOK_OPTIONS': {
        'offline': offline, 'refresh': refresh, 'allow_api': allow_api}}
    outputs = []
    stream = io.StringIO()

    def flush():
        value = stream.getvalue()
        if value:
            outputs.append({'output_type': 'stream', 'name': 'stdout', 'text': value})
            stream.seek(0)
            stream.truncate(0)

    def display(value):
        flush()
        data = {'text/plain': repr(value)}
        render = getattr(value, '_repr_html_', None)
        if callable(render):
            data['text/html'] = render()
        outputs.append({'output_type': 'display_data', 'data': data, 'metadata': {}})

    namespace['display'] = display
    for cell in notebook['cells']:
        if cell['cell_type'] == 'code':
            cell.update(outputs=[], execution_count=None)
    count, failure = 0, None
    original = Path.cwd()
    try:
        os.chdir(path.parent)
        for cell in notebook['cells']:
            if cell['cell_type'] != 'code':
                continue
            count += 1
            outputs = []
            source = cell['source']
            if isinstance(source, list):
                source = ''.join(source)
            try:
                with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
                    exec(compile(source, f'{path.name}:cell-{count}', 'exec'), namespace)
            except Exception as exc:
                failure = exc
                flush()
                outputs.append({'output_type': 'error', 'ename': type(exc).__name__,
                                'evalue': str(exc), 'traceback': traceback.format_exc().splitlines()})
            else:
                flush()
            cell.update(outputs=outputs, execution_count=count)
            print(f'Cell {count}: {"ERROR" if failure else "OK"}', flush=True)
            if failure:
                break
    finally:
        os.chdir(original)
    reports = Path(namespace.get('REPORTS_DIR', BASE / 'datasets/thu-duc-menus/reports'))
    reports.mkdir(parents=True, exist_ok=True)
    report = reports / f'{path.stem}.executed.ipynb'
    notebook['metadata']['language_info']['version'] = platform.python_version()
    notebook['metadata']['execution'] = {'engine': 'Python exec; no Jupyter kernel',
                                       'offline_override': offline, 'refresh_override': refresh,
                                       'allow_api': allow_api}
    report.write_text(json.dumps(notebook, ensure_ascii=False, indent=1)+'\n', encoding='utf-8')
    print(f'Report: {report}', flush=True)
    if failure:
        raise RuntimeError(f'Cell {count} failed; inspect {report}') from failure
    print(json.dumps(namespace.get('stats', {}), ensure_ascii=False, indent=2))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('notebook', nargs='?', type=Path, default=DEFAULT_NOTEBOOK)
    parser.add_argument('--offline', action='store_true', help='Use snapshots only.')
    parser.add_argument('--refresh', action='store_true', help='Refresh public HTML snapshots.')
    parser.add_argument('--allow-api', action='store_true', help='Opt into bounded Vilao pilot calls (never offline).')
    args = parser.parse_args()
    if args.offline and args.refresh:
        parser.error('--offline and --refresh cannot be combined')
    if args.offline and args.allow_api:
        parser.error('--offline and --allow-api cannot be combined')
    execute(args.notebook.resolve(), offline=args.offline, refresh=args.refresh, allow_api=args.allow_api)


if __name__ == '__main__':
    main()
