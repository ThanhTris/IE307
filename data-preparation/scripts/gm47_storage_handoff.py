"""Build GM-47's offline Storage handoff from locally reviewed WebP files."""
import argparse
import csv
from hashlib import sha256
from io import BytesIO, StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image

import gm47_illustrations as illustrations
from gm47_release_editorial import ARTWORK, OUTPUT, build, gm41


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--images', type=Path, default=OUTPUT / 'images')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write-metadata', action='store_true',
                      help='Refresh the checked-in file metadata from the prepared derivatives')
    mode.add_argument('--reviewed-only', action='store_true',
                      help='Export only human-approved pairs for the Storage upload')
    parser.add_argument('--with-illustrations', action='store_true',
                        help='Include the category icons, licence and assignments in the reviewed upload ZIP')
    args = parser.parse_args()
    if args.with_illustrations and not args.reviewed_only:
        parser.error('--with-illustrations requires --reviewed-only')
    artwork = gm41.dc.load_json(ARTWORK)
    rows = artwork['images']
    if args.reviewed_only:
        rows = [row for row in rows if row['aiCheck']['verdict'] == 'real_photo']
        if not rows:
            parser.error('No human-approved image pairs to export')
    files = {}
    credits = ['# Ghi công ảnh GM-47', '',
               'Ảnh chính đã cắt và nén. Ảnh danh sách được giảm kích thước từ ảnh chính.', '']
    for row in rows:
        expected_name = f"{row['dishId']}.webp"
        if Path(row['file']).name != expected_name or row['file'] != expected_name:
            raise ValueError(f"Unexpected local filename for {row['dishId']}")
        original = (args.images / expected_name).read_bytes()
        if len(original) != row['bytes'] or sha256(original).hexdigest() != row['sha256']:
            raise ValueError(f"Main asset differs from review evidence for {row['dishId']}")
        with Image.open(BytesIO(original)) as image:
            if image.format != 'WEBP' or image.size != (row['width'], row['height']):
                raise ValueError(f"Invalid WebP or dimensions for {row['dishId']}")
            small = image.resize((400, 300), Image.Resampling.LANCZOS)
            output = BytesIO()
            small.save(output, format='WEBP', quality=80, method=6)
        derivative = output.getvalue()
        main_key = f'images/{expected_name}'
        thumbnail = {'objectKey': f'thumbnails/{expected_name}', 'width': 400, 'height': 300,
                     'bytes': len(derivative), 'sha256': sha256(derivative).hexdigest()}
        if args.write_metadata:
            row.update(objectKey=main_key, thumbnail=thumbnail)
        elif row['objectKey'] != main_key or row['thumbnail'] != thumbnail:
            raise ValueError(f"Storage metadata differs for {row['dishId']}")
        files[main_key] = original
        files[thumbnail['objectKey']] = derivative
        credits.extend([f"## {row['name']} ({row['dishId']})", '', row['attribution'], '',
                        f"- [Nguồn ảnh]({row['source']})",
                        f"- [Giấy phép {row['license']}]({row['licenseUrl']})", ''])

    _, report = build(artwork=artwork)
    metadata = gm41.dc.encoded(artwork) if args.write_metadata else ARTWORK.read_bytes()
    missing = StringIO()
    writer = csv.DictWriter(missing, fieldnames=['batch', 'dishId', 'name', 'reason', 'candidate'],
                            lineterminator='\n')
    writer.writeheader()
    writer.writerows(report['missingArtwork'])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive_name = 'gm47-storage-reviewed.zip' if args.reviewed_only else 'gm47-storage-handoff.zip'
    if args.with_illustrations:
        archive_name = 'gm47-storage-with-illustrations.zip'
        asset_groups = illustrations.load()
        assigned = sorted({entry['groupCode'] for entry in report['illustrationPlan'].values()})
    archive = OUTPUT / archive_name
    with TemporaryDirectory(dir=OUTPUT) as directory:
        temporary = Path(directory) / archive.name
        with ZipFile(temporary, 'w', compression=ZIP_DEFLATED) as pack:
            for key, value in files.items():
                pack.writestr(key, value)
            if args.with_illustrations:
                for group in assigned:
                    row = asset_groups[group]
                    for asset in (row['image'], row['thumbnail']):
                        key = asset['objectKey']
                        path = illustrations.DIRECTORY / key.removeprefix('illustrations/')
                        with Image.open(path) as picture:
                            if picture.format != 'WEBP' or picture.size != (asset['width'], asset['height']):
                                raise ValueError(f'Invalid illustration WebP: {key}')
                        pack.write(path, key)
                    credits.extend([f"## {row['groupLabel']}", '', row['attribution'], '',
                                    f"- [Nguồn icon]({row['source']})",
                                    f"- [Giấy phép {row['license']}]({row['licenseUrl']})", ''])
                pack.write(illustrations.DIRECTORY / 'LICENSE-APACHE-2.0.txt', 'LICENSE-APACHE-2.0.txt')
                pack.writestr('illustration-assignments.json', gm41.dc.encoded({
                    'candidateSha256': report['candidateSha256'],
                    'assignments': report['illustrationPlan'],
                    'assets': [asset_groups[group] for group in assigned],
                }))
            pack.writestr('ATTRIBUTION.md', '\n'.join(credits))
            if args.reviewed_only:
                pack.writestr('reviewed-dish-ids.txt', ''.join(f"{row['dishId']}\n" for row in rows))
                pack.writestr('reviewed-artwork.json', gm41.dc.encoded({
                    'baseDatasetVersion': artwork['baseDatasetVersion'],
                    'baseSha256': artwork['baseSha256'],
                    'images': rows,
                }))
            else:
                pack.writestr(ARTWORK.name, metadata)
                pack.writestr('artwork-assignments.csv', missing.getvalue().encode('utf-8-sig'))
        temporary.replace(archive)
    if args.write_metadata:
        ARTWORK.write_bytes(metadata)
    if args.with_illustrations:
        print(f"{len(rows)} human-reviewed photo pairs and {len(assigned)} illustration pairs: {archive}")
    elif args.reviewed_only:
        print(f'{len(rows)} human-reviewed pairs, {sum(map(len, files.values()))} bytes: {archive}')
    else:
        print(f"{len(files)} WebP files and {len(report['missingArtwork'])} pending dishes: {archive}")


if __name__ == '__main__':
    main()
