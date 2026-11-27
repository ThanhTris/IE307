#!/usr/bin/env node
// GM-52 secret scan for a built Android package. Unzips an .apk or .aab and looks for anything that must never ship:
// service_role keys, secret keys, DB connection strings, signing material and build tokens. Only one Supabase URL and the
// publishable key may appear. An APK can always be decompiled, so this checks that nothing sensitive was put in.
//
//   node scripts/gm52_bundle_scan.mjs <file.apk|file.aab> --expect-env staging|production --staging-ref <ref> --production-ref <ref>
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { basename } from 'node:path';

export const FORBIDDEN = [
  { id: 'service-role-jwt', test: text => jwtPayloads(text).some(p => p.role === 'service_role' || p.role === 'supabase_admin') },
  { id: 'secret-key', re: /sb_secret_[A-Za-z0-9_-]{8,}/ },
  { id: 'db-connection-string', re: /postgres(?:ql)?:\/\/[^\s"'<>]+@[^\s"'<>]+/i },
  { id: 'service-role-name', re: /SUPABASE_SERVICE_ROLE(?:_KEY)?/ },
  { id: 'sentry-auth-token', re: /SENTRY_AUTH_TOKEN|sntrys_[A-Za-z0-9+/=_-]{20,}/ },
  { id: 'private-key-pem', re: /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/ },
  { id: 'keystore-password', re: /(?:storePassword|keyPassword|KEYSTORE_PASSWORD)\s*[=:]\s*\S+/ },
];

function jwtPayloads(text) {
  const out = [];
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g)) {
    try { out.push(JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))); } catch { /* not a JWT */ }
  }
  return out;
}

/** Reads every entry of a zip file (APK/AAB) using the central directory. No external dependency. */
export function readZipEntries(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file (no end-of-central-directory record)');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('corrupt central directory');
    const method = buffer.readUInt16LE(offset + 10);
    const compressed = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    const dataStart = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressed);
    let data;
    if (method === 0) data = raw;
    else if (method === 8) data = inflateRawSync(raw);
    else continue;
    entries.push({ name, data });
  }
  return entries;
}

export function scanEntries(entries, { stagingRef, productionRef, expectEnv } = {}) {
  const findings = [];
  const urls = new Set();
  for (const { name, data } of entries) {
    // latin1 keeps every byte, so ASCII secrets inside binary dex/hermes files are still found.
    const text = data.toString('latin1');
    for (const rule of FORBIDDEN) {
      const hit = rule.test ? rule.test(text) : rule.re.test(text);
      if (hit) findings.push({ rule: rule.id, file: name });
    }
    for (const m of text.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.(?:co|in)/g)) urls.add(m[1]);
  }
  const refs = [...urls];
  if (refs.length === 0) findings.push({ rule: 'no-supabase-url', file: '(package)' });
  if (refs.length > 1) findings.push({ rule: 'more-than-one-supabase-project', file: refs.join(',') });
  if (expectEnv) {
    const wanted = expectEnv === 'production' ? productionRef : stagingRef;
    const other = expectEnv === 'production' ? stagingRef : productionRef;
    if (!wanted) findings.push({ rule: 'missing-expected-ref', file: expectEnv });
    else if (!refs.includes(wanted)) findings.push({ rule: 'wrong-supabase-project', file: `expected ${expectEnv}` });
    if (other && refs.includes(other)) findings.push({ rule: 'other-environment-project-present', file: expectEnv });
  }
  return { findings, supabaseRefs: refs, filesScanned: entries.length };
}

function main() {
  const args = process.argv.slice(2);
  const read = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const file = args.find(a => !a.startsWith('--') && !['staging', 'production'].includes(a) && ![read('--staging-ref'), read('--production-ref')].includes(a));
  if (!file) { console.error('usage: gm52_bundle_scan.mjs <file.apk|file.aab> [--expect-env staging|production --staging-ref R --production-ref R]'); process.exit(2); }
  const result = scanEntries(readZipEntries(readFileSync(file)), { stagingRef: read('--staging-ref'), productionRef: read('--production-ref'), expectEnv: read('--expect-env') });
  console.log(JSON.stringify({ file: basename(file), ...result, result: result.findings.length ? 'Fail' : 'Pass' }, null, 2));
  process.exit(result.findings.length ? 1 : 0);
}

if (process.argv[1]?.endsWith('gm52_bundle_scan.mjs')) main();
