"""Build GM-47's offline Storage handoff from locally reviewed WebP files."""
import argparse
import csv
from hashlib import sha256
from io import BytesIO, StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image

from gm47_release_editorial import ARTWORK, OUTPUT, build, gm41


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--images', type=Path, default=OUTPUT / 'images')
    parser.add_argument('--write-metadata', action='store_true',
                        help='Refresh the checked-in file metadata from the prepared derivatives')
    args = parser.parse_args()
    artwork = gm41.dc.load_json(ARTWORK)
    files = {}
    credits = ['# Ghi công ảnh GM-47', '',
               'Ảnh chính đã cắt và nén. Ảnh danh sách được giảm kích thước từ ảnh chính.', '']
    for row in artwork['images']:
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
                        f"- [Trang ảnh gốc]({row['source']})",
                        f"- [Giấy phép {row['license']}]({row['licenseUrl']})", ''])

    _, report = build(artwork=artwork)
    metadata = gm41.dc.encoded(artwork) if args.write_metadata else ARTWORK.read_bytes()
    missing = StringIO()
    writer = csv.DictWriter(missing, fieldnames=['batch', 'dishId', 'name', 'reason', 'candidate'],
                            lineterminator='\n')
    writer.writeheader()
    writer.writerows(report['missingArtwork'])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive = OUTPUT / 'gm47-storage-handoff.zip'
    with TemporaryDirectory(dir=OUTPUT) as directory:
        temporary = Path(directory) / archive.name
        with ZipFile(temporary, 'w', compression=ZIP_DEFLATED) as pack:
            for key, value in files.items():
                pack.writestr(key, value)
            pack.writestr(ARTWORK.name, metadata)
            pack.writestr('ATTRIBUTION.md', '\n'.join(credits))
            pack.writestr('artwork-assignments.csv', missing.getvalue().encode('utf-8-sig'))
        temporary.replace(archive)
    if args.write_metadata:
        ARTWORK.write_bytes(metadata)
    print(f"{len(files)} WebP files and {len(report['missingArtwork'])} pending dishes: {archive}")


if __name__ == '__main__':
    main()
