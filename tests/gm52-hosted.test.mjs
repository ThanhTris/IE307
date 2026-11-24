import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { readZipEntries, scanEntries } from '../scripts/gm52_bundle_scan.mjs';
import { parseTarget } from '../scripts/gm52_hosted_smoke.mjs';

const STAGING = 'abcdefghijklmnopqrst';
const PRODUCTION = 'tsrqponmlkjihgfedcba';

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) { crc ^= byte; for (let k = 0; k < 8; k += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; }
  return ~crc >>> 0;
}

/** Minimal zip writer for tests: files is [{ name, data, deflate }]. */
function zip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const { name, data, deflate } of files) {
    const raw = Buffer.from(data);
    const body = deflate ? deflateRawSync(raw) : raw;
    const nameBuffer = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(crc32(raw), 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBuffer.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(crc32(raw), 16); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(nameBuffer.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuffer, body); centrals.push(central, nameBuffer);
    offset += 30 + nameBuffer.length + body.length;
  }
  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

const jwt = payload => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.c2lnbmF0dXJlLWJ5dGVz`;
const clean = [
  { name: 'assets/index.android.bundle', data: `const url="https://${STAGING}.supabase.co";const key="sb_publishable_abc123def456";`, deflate: true },
  { name: 'classes.dex', data: 'dex\n035\0 ordinary strings only', deflate: false },
];
const scan = (files, options) => scanEntries(readZipEntries(zip(files)), options);

test('a clean package passes and reports the one Supabase project', () => {
  const result = scan(clean, { stagingRef: STAGING, productionRef: PRODUCTION, expectEnv: 'staging' });
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.supabaseRefs, [STAGING]);
  assert.equal(result.filesScanned, 2);
});

test('a service_role JWT is found inside a compressed bundle', () => {
  const secret = { name: 'assets/index.android.bundle', data: `x="${jwt({ role: 'service_role', iss: 'supabase' })}";https://${STAGING}.supabase.co`, deflate: true };
  assert.ok(scan([secret]).findings.some(f => f.rule === 'service-role-jwt'));
});

test('an anon-role JWT is not treated as a secret', () => {
  const anon = { name: 'b.bundle', data: `x="${jwt({ role: 'anon' })}";https://${STAGING}.supabase.co`, deflate: true };
  assert.ok(!scan([anon]).findings.some(f => f.rule === 'service-role-jwt'));
});

test('secret keys, DB URLs, PEM keys and Sentry tokens are each reported', () => {
  const rules = scan([
    { name: 'a.bundle', data: `https://${STAGING}.supabase.co sb_secret_abcdefgh12345678`, deflate: false },
    { name: 'b.bundle', data: 'postgresql://postgres:hunter2@db.example.supabase.co:5432/postgres', deflate: false },
    { name: 'c.bundle', data: '-----BEGIN PRIVATE KEY-----\nMIIB', deflate: true },
    { name: 'd.bundle', data: 'SENTRY_AUTH_TOKEN=abc', deflate: true },
  ]).findings.map(f => f.rule);
  for (const rule of ['secret-key', 'db-connection-string', 'private-key-pem', 'sentry-auth-token']) assert.ok(rules.includes(rule), rule);
});

test('the package must point at exactly the project of its environment', () => {
  const production = scan([{ name: 'i.bundle', data: `https://${PRODUCTION}.supabase.co`, deflate: false }], { stagingRef: STAGING, productionRef: PRODUCTION, expectEnv: 'staging' });
  assert.ok(production.findings.some(f => f.rule === 'wrong-supabase-project'));
  const both = scan([{ name: 'i.bundle', data: `https://${PRODUCTION}.supabase.co https://${STAGING}.supabase.co`, deflate: false }], { stagingRef: STAGING, productionRef: PRODUCTION, expectEnv: 'production' });
  assert.ok(both.findings.some(f => f.rule === 'more-than-one-supabase-project'));
  assert.ok(both.findings.some(f => f.rule === 'other-environment-project-present'));
  assert.ok(scan([{ name: 'i.bundle', data: 'nothing here', deflate: false }]).findings.some(f => f.rule === 'no-supabase-url'));
});

test('a file that is not a zip is rejected', () => {
  assert.throws(() => readZipEntries(Buffer.from('not a zip at all, just text')), /not a zip/);
});

test('the smoke script only accepts a hosted https project that matches its ref', () => {
  const good = ['--base-url', `https://${STAGING}.supabase.co`, '--project-ref', STAGING, '--publishable-key', 'sb_publishable_abc', '--allow-remote'];
  assert.equal(parseTarget(good).ref, STAGING);
  assert.throws(() => parseTarget(good.filter(a => a !== '--allow-remote')), /allow-remote/);
  assert.throws(() => parseTarget(good.map(a => a === STAGING ? PRODUCTION : a)).ref, /project-ref/);
  assert.throws(() => parseTarget(['--base-url', 'http://127.0.0.1:54321', '--project-ref', STAGING, '--publishable-key', 'k', '--allow-remote']), /https/);
  assert.throws(() => parseTarget(good.map(a => a === 'sb_publishable_abc' ? 'sb_secret_abcdefgh' : a)), /secret key/);
  assert.throws(() => parseTarget(good.map(a => a === 'sb_publishable_abc' ? jwt({ role: 'service_role' }) : a)), /service_role/);
});
