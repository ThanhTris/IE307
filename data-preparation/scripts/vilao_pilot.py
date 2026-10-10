"""Bounded OpenAI-compatible chat experiment; credentials never enter artifacts."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

BASE_URL = 'https://api.vilao.ai/v1'
MODEL = 'vgpt/gpt-5.6-luna'
MAX_CALLS = 2
MAX_OUTPUT_TOKENS = 1400
MAX_INPUT_BYTES = 16000
MAX_RESPONSE_BYTES = 2_000_000


@dataclass(frozen=True)
class Config:
    api_key: str = field(repr=False)
    base_url: str = BASE_URL
    model: str = MODEL


def load_config(path: Path) -> Config:
    """Accept dotenv assignments or the user's three JS-style colon assignments."""
    aliases = {'apiKey': 'key', 'VILAO_API_KEY': 'key', 'OPENAI_API_KEY': 'key',
               'baseURL': 'base', 'VILAO_BASE_URL': 'base', 'OPENAI_BASE_URL': 'base',
               'model': 'model', 'VILAO_MODEL': 'model', 'OPENAI_MODEL': 'model'}
    values = {}
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        match = re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.*?)\s*$', line)
        if not match or match[1] not in aliases:
            continue
        value = match[2].strip()
        if value[:1] in ('"', "'"):
            quoted = re.fullmatch(r"(['\"])(.*?)\1\s*[,;\\]?\s*(?:#.*)?", value)
            if not quoted:
                raise ValueError('Invalid quoted API configuration; values are hidden.')
            value = quoted[2]
        else:
            value = value.split(' #', 1)[0].rstrip(',;\\').strip()
        value = value.replace('\\/', '/').replace('\\:', ':')
        name = aliases[match[1]]
        if name in values:
            raise ValueError('Duplicate API configuration; values are hidden.')
        values[name] = value
    if not values.get('key') or re.search(r'\s', values['key']):
        raise ValueError('Missing/invalid apiKey or VILAO_API_KEY in .env; values are hidden.')
    base = values.get('base', BASE_URL).rstrip('/')
    model = values.get('model', MODEL)
    if base != BASE_URL or model != MODEL:
        raise ValueError('This pilot permits only https://api.vilao.ai/v1 and vgpt/gpt-5.6-luna.')
    return Config(values['key'], base, model)


def compact(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)


def sha(value: str | bytes) -> str:
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()


def redact(value, secret: str):
    if isinstance(value, str):
        return re.sub(r'sk-[A-Za-z0-9_-]+', '[REDACTED]', value.replace(secret, '[REDACTED]'))
    if isinstance(value, list):
        return [redact(v, secret) for v in value]
    if isinstance(value, dict):
        return {redact(k, secret): redact(v, secret) for k, v in value.items()}
    return value


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class PilotClient:
    """Bounded HTTP attempts (default two); no transport retries, redirects or tools."""
    def __init__(self, config: Config, max_calls: int = MAX_CALLS):
        if config.base_url != BASE_URL or config.model != MODEL:
            raise ValueError('Unapproved pilot endpoint/model.')
        if type(max_calls) is not int or not 1 <= max_calls <= 64:
            raise ValueError('Explicit request limit must be within 1..64.')
        self.config, self.calls, self.max_calls = config, 0, max_calls

    def chat(self, messages: list, max_tokens: int) -> dict:
        if type(max_tokens) is not int or not 1 <= max_tokens <= MAX_OUTPUT_TOKENS:
            raise ValueError('Output token limit must be within 1..1400.')
        payload = {'model': self.config.model, 'messages': messages,
                   'max_tokens': max_tokens, 'stream': False}
        body = compact(payload).encode()
        if len(body) > MAX_INPUT_BYTES:
            raise ValueError('Input exceeds 16000 UTF-8 bytes; no request sent.')
        if self.calls >= self.max_calls:
            raise ValueError('Configured request limit reached; no request sent.')
        self.calls += 1
        request = Request(self.config.base_url + '/chat/completions', data=body,
                          headers={'Authorization': 'Bearer ' + self.config.api_key,
                                   'Content-Type': 'application/json',
                                   'User-Agent': 'Anyfood-taxonomy-pilot/1.0'})
        record = {'requested_model': self.config.model, 'base_url': self.config.base_url,
                  'requested_at': datetime.now(timezone.utc).isoformat(),
                  'request': payload, 'request_sha256': sha(body),
                  'input_bytes': len(body), 'max_tokens': max_tokens}
        start = time.monotonic()
        try:
            with build_opener(NoRedirect()).open(request, timeout=45) as response:
                blob = response.read(MAX_RESPONSE_BYTES + 1)
                record['http_status'] = response.status
            if len(blob) > MAX_RESPONSE_BYTES:
                raise ValueError('Provider response exceeds 2 MB.')
            result = json.loads(blob)
            choices = result.get('choices', [])
            choice = choices[0] if choices else {}
            content = choice.get('message', {}).get('content')
            record.update(ok=record['http_status'] == 200 and isinstance(content, str) and bool(content.strip()),
                          response_model=result.get('model'), content=content,
                          finish_reason=choice.get('finish_reason'), usage=result.get('usage'),
                          response_id=result.get('id'))
            if not record['ok']:
                record['error'] = 'No nonempty assistant text in chat response.'
        except HTTPError as error:
            record.update(ok=False, http_status=error.code)
            try:
                detail = json.loads(error.read(4096)).get('error', {})
                record['error'] = redact(str(detail.get('message', 'HTTP error')), self.config.api_key)[:300]
                record['error_code'] = redact(str(detail.get('code', '')), self.config.api_key)[:80]
            except (ValueError, AttributeError, UnicodeError):
                record['error'] = 'HTTP error; unstructured body omitted.'
        except (URLError, TimeoutError, OSError):
            record.update(ok=False, error='Network/TLS/timeout error; no automatic retry.')
        except (ValueError, TypeError, AttributeError, IndexError):
            record.update(ok=False, error='Invalid/oversized chat response; no automatic retry.')
        record['elapsed_seconds'] = round(time.monotonic() - start, 3)
        return redact(record, self.config.api_key)


def cached_chat(client: PilotClient, path: Path, messages: list, max_tokens: int,
                allow_api: bool = False, refresh: bool = False) -> dict:
    payload = {'model': client.config.model, 'messages': messages,
               'max_tokens': max_tokens, 'stream': False}
    fingerprint = sha(compact(payload))
    if path.exists() and not refresh:
        cached = json.loads(path.read_text('utf-8'))
        if cached.get('request_sha256') != fingerprint or sha(compact(cached.get('request'))) != fingerprint:
            raise ValueError('Cached request differs from current prompt; refresh deliberately.')
        return cached
    if not allow_api:
        raise ValueError('No matching cache. Enable ALLOW_API_CALLS or use --refresh deliberately.')
    result = client.chat(messages, max_tokens)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return result


SMOKE_MESSAGES = [{'role': 'user', 'content': 'Reply with exactly OK, without explanation.'}]


def validate_rows(content: str, taxonomy: dict, expected_count: int = 10) -> list:
    """Strict positional JSON validation; never repair, coerce or fuzzy-map a label."""
    rows = json.loads(content)
    if not isinstance(rows, list) or len(rows) != expected_count or not 1 <= expected_count <= 10:
        raise ValueError('Expected 1..10 rows, matching the sample count.')

    def scalar(value, group):
        if type(value) is not int or str(value) not in taxonomy[group]:
            raise ValueError('Invalid integer code for ' + group)

    def labels(value, group):
        if not isinstance(value, list) or not 1 <= len(value) <= taxonomy['max_labels'][group]:
            raise ValueError('Invalid label count for ' + group)
        for item in value:
            scalar(item, group)
        if len(set(value)) != len(value) or (0 in value and len(value) != 1):
            raise ValueError('Duplicate or mixed unknown labels for ' + group)

    for i, row in enumerate(rows):
        if not isinstance(row, list) or len(row) != 9 or type(row[0]) is not int or row[0] != i:
            raise ValueError('Invalid row shape/index/order.')
        for position, group in ((1, 'cuisines'), (3, 'categories'), (4, 'methods'), (7, 'meal_slots')):
            labels(row[position], group)
        scalar(row[2], 'origin')
        scalar(row[5], 'temperature')
        if not isinstance(row[6], list) or len(row[6]) != 4:
            raise ValueError('Expected exactly four flavor levels.')
        for value in row[6]:
            scalar(value, 'flavor_levels')
        if not isinstance(row[8], list) or len(row[8]) != 7:
            raise ValueError('Expected exactly seven evidence codes.')
        known = [row[1] != [0], row[2] != 0, row[3] != [0], row[4] != [0],
                 row[5] != 0, row[6] != [-1] * 4, row[7] != [0]]
        for field, (value, evidence) in enumerate(zip(known, row[8])):
            scalar(evidence, 'evidence')
            if value != (evidence != 0):
                raise ValueError(taxonomy['evidence_order'][field] + ': known/unknown value conflicts with evidence.')
            if field in (1, 4, 5, 6) and evidence == 2 and not (field == 1 and row[2] == 4):
                raise ValueError('Origin/temperature/flavor/meal slots require explicit menu evidence.')
        if row[2] == 4 and (1 in row[1] or row[1] == [0]):
            raise ValueError('not_applicable origin requires known non-Vietnamese cuisine.')
    return rows


def decode_rows(rows: list, taxonomy: dict, samples: list) -> list:
    decoded = []
    for row, sample in zip(rows, samples):
        def multi(group, values):
            return [taxonomy[group][str(v)] for v in values]
        decoded.append({
            'index': row[0], 'dish_id': sample['dish_id'], 'dish_name': sample['dish_name'],
            'cuisines': multi('cuisines', row[1]), 'origin': taxonomy['origin'][str(row[2])],
            'categories': multi('categories', row[3]), 'methods': multi('methods', row[4]),
            'temperature': taxonomy['temperature'][str(row[5])],
            'flavors': dict(zip(taxonomy['flavor_order'], multi('flavor_levels', row[6]))),
            'meal_slots': multi('meal_slots', row[7]),
            'evidence': dict(zip(taxonomy['evidence_order'], multi('evidence', row[8]))),
            'existing_aliases': sample['aliases'], 'source_url': sample['source_url'],
            'review_status': 'draft_needs_human_review'})
    return decoded


def inspect_rows(content: str, taxonomy: dict, expected_count: int = 10) -> tuple[list, list]:
    """Retain failed rows for inspection without changing or accepting their values."""
    rows = json.loads(content)
    if not isinstance(rows, list) or len(rows) != expected_count or not 1 <= expected_count <= 10:
        raise ValueError('Batch count/shape invalid; cannot align with samples.')
    checks = []
    for i, row in enumerate(rows):
        errors = []
        try:
            if not isinstance(row, list) or not row or type(row[0]) is not int or row[0] != i:
                raise ValueError('Invalid row index/order.')
            # Local index zero lets the same strict validator inspect one isolated row.
            # Original response is retained unchanged, including its actual index.
            validate_rows(compact([[0, *row[1:]]]), taxonomy, expected_count=1)
        except (ValueError, TypeError) as error:
            errors.append(str(error))
        checks.append({'index': i, 'schema_valid': not errors, 'errors': errors})
    return rows, checks
