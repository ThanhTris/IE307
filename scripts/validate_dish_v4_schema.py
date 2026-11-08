#!/usr/bin/env python3
"""Validate ephemeral real HTTP request/response samples against GM-07.B JSON Schema."""
import argparse
import json
from pathlib import Path
import sys

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]


def validate(samples, schema_path):
    schema = json.loads(Path(schema_path).read_text(encoding='utf-8'))
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    checked = 0
    for index, sample in enumerate(samples):
        if not isinstance(sample, dict) or set(sample) - {'request', 'response', 'requestValid'} or not {'request', 'response'} <= set(sample):
            raise ValueError(f'sample[{index}] must contain request, response, and optional requestValid')
        if not isinstance(sample.get('requestValid', True), bool):
            raise ValueError(f'sample[{index}].requestValid must be boolean')
        kinds = ('request', 'response') if sample.get('requestValid', True) else ('response',)
        for kind in kinds:
            errors = sorted(validator.iter_errors(sample[kind]), key=lambda error: list(error.absolute_path))
            if errors:
                error = errors[0]
                path = '/'.join(str(part) for part in error.absolute_path) or '<root>'
                raise ValueError(f'sample[{index}].{kind} schema error at {path}: {error.message}')
            checked += 1
    return checked


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--schema', type=Path, default=ROOT / 'docs/architecture/schemas/dish-session-v4b.schema.json')
    parser.add_argument('--stdin', action='store_true', help='read ephemeral JSON samples from stdin')
    args = parser.parse_args()
    raw = sys.stdin.read() if args.stdin else '{}'
    samples = json.loads(raw)
    if not isinstance(samples, list) or not samples:
        raise ValueError('at least one request/response sample is required')
    checked = validate(samples, args.schema)
    print(json.dumps({'result': 'Pass', 'schema': 'JSON Schema 2020-12', 'envelopesValidated': checked}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Contract schema validation failed: {error}', file=sys.stderr)
        raise SystemExit(1)
