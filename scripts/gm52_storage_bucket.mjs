#!/usr/bin/env node
// GM-52: create (or verify) the public dish-image bucket on a hosted Supabase project. Safe to run again.
// Everyone can read, nobody but the service key holder can write. No storage policy for anon or authenticated is created.
//
//   SUPABASE_SERVICE_ROLE_KEY=<set in this shell only> node scripts/gm52_storage_bucket.mjs \
//        --base-url https://<ref>.supabase.co --project-ref <ref> --publishable-key <key>
import assert from 'node:assert/strict';

export const BUCKET = 'dish-images';
export const MAX_BYTES = 1_048_576; // 1 MiB: dish photos are compressed WebP, well under this
export const MIME = ['image/webp', 'image/jpeg', 'image/png'];

const args = process.argv.slice(2);
const read = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

async function main() {
  const baseUrl = read('--base-url'), ref = read('--project-ref'), publishable = read('--publishable-key');
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(baseUrl && ref && publishable, '--base-url, --project-ref and --publishable-key are required');
  assert.ok(secret, 'set SUPABASE_SERVICE_ROLE_KEY in this shell session only (never in a file)');
  const url = new URL(baseUrl);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, `${ref}.supabase.co`, 'the base URL must be exactly <project-ref>.supabase.co');
  const base = url.origin;
  const admin = { apikey: secret, authorization: `Bearer ${secret}`, 'content-type': 'application/json' };
  const body = JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: MAX_BYTES, allowed_mime_types: MIME });

  let response = await fetch(`${base}/storage/v1/bucket`, { method: 'POST', headers: admin, body });
  if (response.status === 200) console.log('created bucket', BUCKET);
  else {
    const text = await response.text();
    assert.ok(response.status === 409 || /already exists/i.test(text), `create bucket failed (${response.status})`);
    response = await fetch(`${base}/storage/v1/bucket/${BUCKET}`, { method: 'PUT', headers: admin, body: JSON.stringify({ public: true, file_size_limit: MAX_BYTES, allowed_mime_types: MIME }) });
    assert.equal(response.status, 200, `update bucket failed (${response.status})`);
    console.log('bucket already existed, settings re-applied');
  }

  const info = await (await fetch(`${base}/storage/v1/bucket/${BUCKET}`, { headers: admin })).json();
  assert.equal(info.public, true, 'bucket must be public');
  assert.equal(Number(info.file_size_limit), MAX_BYTES);
  assert.deepEqual([...info.allowed_mime_types].sort(), [...MIME].sort());
  console.log('PASS bucket is public with the expected size and MIME limits');

  // Public read works without any key; the publishable key must be refused for upload and delete.
  const listing = await fetch(`${base}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: admin, body: JSON.stringify({ prefix: '', limit: 1 }) });
  assert.equal(listing.status, 200, 'service list');
  const anonUpload = await fetch(`${base}/storage/v1/object/${BUCKET}/gm52-probe-${Date.now()}.png`, {
    method: 'POST', headers: { apikey: publishable, authorization: `Bearer ${publishable}`, 'content-type': 'image/png' }, body: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  assert.ok([400, 401, 403].includes(anonUpload.status), `the publishable key must not upload (got ${anonUpload.status})`);
  console.log('PASS the publishable key cannot upload');
  console.log(`Public URL prefix: ${base}/storage/v1/object/public/${BUCKET}/<dish-uuid>.webp`);
}

if (process.argv[1]?.endsWith('gm52_storage_bucket.mjs')) main().catch(e => { console.error('FAIL', e.message); process.exit(1); });
