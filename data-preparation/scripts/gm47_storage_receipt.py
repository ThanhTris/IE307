"""Verify public Storage image pairs without credentials or upload access."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from time import sleep
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

import gm47_illustrations as illustrations
from gm47_release_editorial import ARTWORK, OUTPUT, build, gm41, storage_bucket, storage_object_key


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(opener, request, byte_limit, stored_key):
    for attempt in range(3):
        try:
            with opener.open(request, timeout=15) as response:
                return response.read(byte_limit)
        except HTTPError as error:
            transient = error.code in (408, 429, 500, 502, 503, 504)
            error.close()
            if not transient or attempt == 2:
                raise RuntimeError(f'{stored_key}: HTTP {error.code}') from None
        except (URLError, OSError) as error:
            if attempt == 2:
                raise RuntimeError(f'{stored_key}: {error}') from None
        sleep(1 << attempt)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bucket-url', required=True)
    parser.add_argument('--candidate-version', required=True)
    parser.add_argument('--image-prefix', default='images', help='Bucket directory for main images. Use an empty string for the root.')
    parser.add_argument('--thumbnail-prefix', default='thumbnails', help='Bucket directory for thumbnails.')
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument('--dish-id', action='append',
                           help='Verify a complete human-reviewed pair for this UUID. Default is every prepared pair.')
    selection.add_argument('--dish-list', type=Path,
                           help='Verify the exact UUIDs in reviewed-dish-ids.txt from an upload batch')
    parser.add_argument('--with-illustrations', action='store_true',
                        help='Verify shared illustration pairs for the dishes still missing photos')
    args = parser.parse_args()
    bucket = storage_bucket(args.bucket_url)
    inventory = gm41.dc.load_json(ARTWORK)
    _, report = build(artwork=inventory)
    reviewed = {row['dishId']: row for row in inventory['images']}
    if args.dish_list is not None:
        try:
            dish_ids = args.dish_list.read_text(encoding='utf-8-sig').splitlines()
        except (OSError, UnicodeError):
            parser.error('Cannot read the upload batch UUID list as UTF-8')
        if not dish_ids or len(set(dish_ids)) != len(dish_ids):
            parser.error('The upload batch UUID list must contain one unique UUID per line')
    else:
        dish_ids = args.dish_id or reviewed
    requested = set(dish_ids)
    if not requested or not requested <= reviewed.keys():
        parser.error('Every requested UUID must have a reviewed image pair')
    if any(reviewed[dish_id]['aiCheck']['verdict'] != 'real_photo' for dish_id in requested):
        parser.error('Every requested image pair needs human photo review before Storage verification')
    prefixes = [prefix.strip('/') for prefix in (args.image_prefix, args.thumbnail_prefix)]
    if prefixes[0] == prefixes[1]:
        parser.error('Main and thumbnail objects must have different paths')
    entries = []
    for dish_id in sorted(requested):
        row = reviewed[dish_id]
        for asset, prefix in zip((row, row['thumbnail']), prefixes, strict=True):
            key = asset['objectKey']
            filename = key.rsplit('/', 1)[-1]
            stored_key = storage_object_key(f'{prefix}/{filename}' if prefix else filename, key)
            entries.append((asset, stored_key))
    if args.with_illustrations:
        assets = illustrations.load()
        groups = {entry['groupCode'] for entry in report['illustrationPlan'].values()}
        for group in sorted(groups):
            row = assets[group]
            for asset in (row['image'], row['thumbnail']):
                entries.append((asset, asset['objectKey']))

    opener = build_opener(NoRedirect)
    verified = []
    for asset, stored_key in entries:
        request = Request(f'{bucket}/{stored_key}', headers={'Accept-Encoding': 'identity'})
        data = fetch(opener, request, asset['bytes'] + 1, stored_key)
        if len(data) != asset['bytes'] or sha256(data).hexdigest() != asset['sha256']:
            raise ValueError(f'Storage bytes differ from the reviewed inventory for {stored_key}')
        verified.append({'objectKey': asset['objectKey'], 'storedObjectKey': stored_key, 'sha256': asset['sha256']})
    receipt = {
        'bucketPublicUrl': bucket, 'candidateDatasetVersion': args.candidate_version,
        'checkedAt': datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'objects': verified,
    }
    build(artwork=inventory, storage_receipt=receipt)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / 'storage-receipt.json'
    with TemporaryDirectory(dir=OUTPUT) as directory:
        temporary = Path(directory) / path.name
        temporary.write_bytes(gm41.dc.encoded(receipt))
        temporary.replace(path)
    print(f'{len(verified)} public objects matched the reviewed SHA-256: {path}')


if __name__ == '__main__':
    main()
