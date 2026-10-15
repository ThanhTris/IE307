/** GM-23 trusted sender transport checks with an in-process Expo fake. */
import assert from 'node:assert/strict';

globalThis.Deno = { env: { get: name => ({ SUPABASE_URL: 'http://gm23.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key' }[name]) } };

const { sendBatch } = await import('../supabase/functions/push-sender/index.ts');

const delivery = overrides => ({
  deliveryId: '00000000-0000-0000-0000-000000000001',
  leaseId: '00000000-0000-0000-0000-000000000002',
  eventId: '00000000-0000-0000-0000-000000000003',
  kind: 'ROOM_INVITED',
  roomId: '00000000-0000-0000-0000-000000000004',
  invitationId: '00000000-0000-0000-0000-000000000005',
  token: 'ExponentPushToken[synthetic-gm23]',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  leaseUntil: new Date(Date.now() + 120000).toISOString(),
  attempt: 1,
  ...overrides,
});

const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, body: init.body ? JSON.parse(init.body) : null });
  if (String(url).includes('/complete_push_delivery')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
  if (String(url).includes('/fail_push_delivery')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
  return new Response('{}', { status: 200 });
};

const ticket = async () => new Response(JSON.stringify({ data: [{ id: 'ticket-1', status: 'ok' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
const deadToken = async () => new Response(JSON.stringify({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });

let result = await sendBatch([delivery()], ticket);
assert.deepEqual(result, { sent: 1, failed: 0 });
assert.equal(calls.at(-1).body.ticket_id, 'ticket-1');
console.log('Pass: successful ticket is counted only after complete ACK');

calls.length = 0;
result = await sendBatch([delivery({ deliveryId: '00000000-0000-0000-0000-000000000006' })], deadToken);
assert.deepEqual(result, { sent: 0, failed: 1 });
assert.equal(calls.at(-1).body.reason, 'DeviceNotRegistered');
console.log('Pass: DeviceNotRegistered is forwarded as a permanent token error');

calls.length = 0;
result = await sendBatch([delivery({ leaseUntil: new Date(Date.now() + 1000).toISOString() })], ticket);
assert.deepEqual(result, { sent: 0, failed: 1 });
assert.equal(calls.length, 0);
console.log('Pass: near-expiry lease is not sent after the provider timeout budget');

calls.length = 0;
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, body: init.body ? JSON.parse(init.body) : null });
  if (String(url).includes('/complete_push_delivery')) return new Response(JSON.stringify({ ok: false, messageKey: 'LEASE_LOST' }), { status: 200 });
  return new Response('{}', { status: 200 });
};
result = await sendBatch([delivery({ deliveryId: '00000000-0000-0000-0000-000000000007' })], ticket);
assert.deepEqual(result, { sent: 0, failed: 1 });
console.log('Pass: LEASE_LOST completion is not counted as sent');
