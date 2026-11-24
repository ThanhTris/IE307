"""Verify public Storage image pairs without credentials or upload access."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from gm47_release_editorial import ARTWORK, OUTPUT, build, gm41, storage_bucket


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bucket-url', required=True)
    parser.add_argument('--candidate-version', required=True)
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
    opener = build_opener(NoRedirect)
    verified = []
    for dish_id in sorted(requested):
        row = reviewed[dish_id]
        for asset in (row, row['thumbnail']):
            key = asset['objectKey']
            try:
                with opener.open(Request(f'{bucket}/{key}', headers={'Accept-Encoding': 'identity'}), timeout=15) as response:
                    data = response.read(asset['bytes'] + 1)
            except HTTPError as error:
                raise RuntimeError(f'{key}: HTTP {error.code}') from None
            if len(data) != asset['bytes'] or sha256(data).hexdigest() != asset['sha256']:
                raise ValueError(f'Storage bytes differ from the reviewed inventory for {key}')
            verified.append({'objectKey': key, 'sha256': asset['sha256']})
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
