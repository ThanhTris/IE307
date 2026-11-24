"""Verify public Storage image pairs without credentials or upload access."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from gm47_release_editorial import ARTWORK, OUTPUT, build, gm41, storage_bucket, storage_object_key


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bucket-url', required=True)
    parser.add_argument('--candidate-version', required=True)
    parser.add_argument('--image-prefix', default='images', help='Bucket directory for main images. Use an empty string for the root.')
    parser.add_argument('--thumbnail-prefix', default='thumbnails', help='Bucket directory for thumbnails.')
    parser.add_argument('--dish-id', action='append',
                        help='Verify a complete pair for this UUID. Default is every prepared pair.')
    args = parser.parse_args()
    bucket = storage_bucket(args.bucket_url)
    inventory = gm41.dc.load_json(ARTWORK)
    build(artwork=inventory)
    reviewed = {row['dishId']: row for row in inventory['images']}
    requested = set(args.dish_id or reviewed)
    if not requested or not requested <= reviewed.keys():
        parser.error('Every requested UUID must have a reviewed image pair')
    prefixes = [prefix.strip('/') for prefix in (args.image_prefix, args.thumbnail_prefix)]
    if prefixes[0] == prefixes[1]:
        parser.error('Main and thumbnail objects must have different paths')
    opener = build_opener(NoRedirect)
    verified = []
    for dish_id in sorted(requested):
        row = reviewed[dish_id]
        for asset, prefix in zip((row, row['thumbnail']), prefixes, strict=True):
            key = asset['objectKey']
            filename = key.rsplit('/', 1)[-1]
            stored_key = storage_object_key(f'{prefix}/{filename}' if prefix else filename, key)
            try:
                request = Request(f'{bucket}/{stored_key}', headers={'Accept-Encoding': 'identity'})
                with opener.open(request, timeout=15) as response:
                    data = response.read(asset['bytes'] + 1)
            except HTTPError as error:
                raise RuntimeError(f'{stored_key}: HTTP {error.code}') from None
            if len(data) != asset['bytes'] or sha256(data).hexdigest() != asset['sha256']:
                raise ValueError(f'Storage bytes differ from the reviewed inventory for {stored_key}')
            verified.append({'objectKey': key, 'storedObjectKey': stored_key, 'sha256': asset['sha256']})
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
