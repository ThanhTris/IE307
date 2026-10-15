/** GM-23 local trusted sender loop. Use --once for a single owned cycle. */
import { open, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const baseUrl = (process.env.GM23_SUPABASE_URL ?? 'http://127.0.0.1:54321').replace(/\/$/, '');
const serviceKey = process.env.GM23_SERVICE_ROLE_KEY;
const expoUrl = 'https://exp.host/--/api/v2/push/send';
const receiptsUrl = 'https://exp.host/--/api/v2/push/getReceipts';
const lockPath = process.env.GM23_SENDER_LOCK ?? 'supabase/tests/bruno/GM-23/.sender.lock';
const once = process.argv.includes('--once');
const timeout = 15_000;
const claimBatch = 8; // Keep the sequential provider loop inside the 120s lease.

if (!serviceKey) {
  console.error('GM23 sender is not configured; set GM23_SERVICE_ROLE_KEY. No delivery was claimed.');
  process.exitCode = 2;
}

let lock;
async function acquire() {
  try { lock = await open(lockPath, 'wx'); await lock.writeFile(JSON.stringify({ pid: process.pid, lockId: randomUUID() })); }
  catch { throw new Error('GM23_SENDER_RUNTIME_CONFLICT'); }
}
async function release() { await lock?.close().catch(() => {}); await unlink(lockPath).catch(() => {}); }
async function rpc(name, body) {
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`GM23_RPC_${name}_${response.status}`);
  return payload;
}
function message(item) {
  const type = item.kind === 'ROOM_INVITED' ? 'room_invite' : 'room_result';
  return { to: item.token, title: type === 'room_invite' ? 'Lời mời vào phòng' : 'Kết quả phòng đã sẵn sàng', body: type === 'room_invite' ? 'Bạn có lời mời vào phòng mới' : 'Phòng của bạn đã có kết quả', data: { type, eventId: item.eventId, ...(item.roomId ? { roomId: item.roomId } : {}), ...(item.invitationId ? { invitationId: item.invitationId } : {}), ...(item.resultId ? { resultId: item.resultId } : {}) } };
}
async function cycle() {
  const claimed = await rpc('claim_push_deliveries', { batch_size: claimBatch });
  let sent = 0;
  for (const item of Array.isArray(claimed) ? claimed : []) {
    try {
      const leaseDeadline = item.leaseUntil ? Date.parse(item.leaseUntil) : Number.NaN;
      if (Number.isFinite(leaseDeadline) && Date.now() + timeout >= leaseDeadline) continue;
      const response = await fetch(expoUrl, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify([message(item)]), signal: AbortSignal.timeout(timeout) });
      const payload = await response.json().catch(() => ({}));
      const ticket = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
      const ticketError = typeof ticket?.details?.error === 'string' ? ticket.details.error : null;
      if (response.ok && ticket?.status !== 'error' && ticket?.id) {
        const completed = await rpc('complete_push_delivery', { delivery_id: item.deliveryId, lease_id: item.leaseId, ticket_id: ticket.id });
        if (completed?.ok) sent += 1;
      } else await rpc('fail_push_delivery', { delivery_id: item.deliveryId, lease_id: item.leaseId, reason: ticketError ?? `HTTP_${response.status}`, retry_after_seconds: Number(response.headers.get('retry-after') ?? 0) || null });
    } catch (error) { await rpc('fail_push_delivery', { delivery_id: item.deliveryId, lease_id: item.leaseId, reason: error instanceof Error ? error.message.slice(0, 160) : 'PROVIDER_TIMEOUT', retry_after_seconds: null }); }
  }
  const receipts = await rpc('claim_push_receipts', { batch_size: 100 });
  let recorded = 0;
  if (Array.isArray(receipts) && receipts.length) {
    const receiptResponse = await fetch(receiptsUrl, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify({ ids: receipts.map(item => item.ticketId) }), signal: AbortSignal.timeout(timeout) });
    const receiptPayload = await receiptResponse.json().catch(() => ({}));
    if (receiptResponse.ok) for (const item of receipts) {
      const receipt = receiptPayload?.data?.[item.ticketId];
      if (!receipt) continue;
      await rpc('record_push_receipt', { delivery_id: item.deliveryId, receipt_id: item.ticketId, receipt_status: receipt.status === 'ok' ? 'ok' : 'error', reason: receipt.details?.error ?? null });
      recorded += 1;
    }
  }
  return { claimed: Array.isArray(claimed) ? claimed.length : 0, sent, receiptCandidates: Array.isArray(receipts) ? receipts.length : 0, receiptsRecorded: recorded };
}
async function main() {
  await acquire();
  try {
    do { const result = await cycle(); console.log(JSON.stringify(result)); if (!once) await new Promise(resolve => setTimeout(resolve, 60_000)); } while (!once);
  } finally { await release(); }
}
if (serviceKey) main().catch(error => { console.error(error.message); process.exitCode = 1; });
