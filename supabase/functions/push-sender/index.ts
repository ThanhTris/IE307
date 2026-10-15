/**
 * GM-23 trusted Expo Push sender.
 *
 * This function is intentionally dependency-free. It is invoked by a trusted
 * worker with the service-role key; guest JWTs and browser clients cannot call
 * the claim/complete RPCs. Notification payloads contain only refetch IDs.
 */

type Delivery = {
  deliveryId: string;
  leaseId: string;
  eventId: string;
  kind: 'ROOM_INVITED' | 'ROOM_RESULT_READY' | string;
  roomId?: string | null;
  invitationId?: string | null;
  resultId?: string | null;
  token: string;
  expiresAt: string;
  leaseUntil?: string;
  attempt: number;
};

type RpcResult<T> = { ok: boolean; data?: T; messageKey?: string; retryAfterSeconds?: number };

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_BATCH = 100;

function env(name: string): string | undefined {
  return Deno.env.get(name) || undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function supabaseConfig(): { url: string; key: string } {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('PUSH_SENDER_UNCONFIGURED');
  return { url: url.replace(/\/$/, ''), key };
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`RPC_${name}_${response.status}`);
  return payload as T;
}

function notification(delivery: Delivery): Record<string, unknown> {
  const type = delivery.kind === 'ROOM_INVITED' ? 'room_invite' : 'room_result';
  return {
    to: delivery.token,
    title: type === 'room_invite' ? 'Lời mời vào phòng' : 'Kết quả phòng đã sẵn sàng',
    body: type === 'room_invite' ? 'Bạn có lời mời vào phòng mới' : 'Phòng của bạn đã có kết quả',
    data: {
      type,
      eventId: delivery.eventId,
      ...(delivery.roomId ? { roomId: delivery.roomId } : {}),
      ...(delivery.invitationId ? { invitationId: delivery.invitationId } : {}),
      ...(delivery.resultId ? { resultId: delivery.resultId } : {}),
    },
  };
}

async function providerSend(messages: Record<string, unknown>[], fetcher = fetch): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const accessToken = env('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return fetcher(EXPO_URL, {
    method: 'POST', headers, body: JSON.stringify(messages), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

const CLAIM_BATCH = 8; // 8 x 15s provider timeout fits inside the 120s lease with headroom.

export async function sendBatch(deliveries: Delivery[], fetcher = fetch): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const delivery of deliveries.slice(0, MAX_BATCH)) {
    try {
      const leaseDeadline = delivery.leaseUntil ? Date.parse(delivery.leaseUntil) : Number.NaN;
      if (Number.isFinite(leaseDeadline) && Date.now() + REQUEST_TIMEOUT_MS >= leaseDeadline) {
        failed += 1;
        continue;
      }
      const response = await providerSend([notification(delivery)], fetcher);
      const retryAfter = Number(response.headers.get('retry-after') ?? 0) || null;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        await rpc('fail_push_delivery', { delivery_id: delivery.deliveryId, lease_id: delivery.leaseId, reason: `HTTP_${response.status}`, retry_after_seconds: retryAfter });
        failed += 1;
        continue;
      }
      const ticket = Array.isArray(payload?.data) ? payload.data[0] : payload?.data;
      const ticketError = typeof ticket?.details?.error === 'string' ? ticket.details.error : null;
      if (ticket?.status === 'error' || ticketError) {
        await rpc('fail_push_delivery', { delivery_id: delivery.deliveryId, lease_id: delivery.leaseId, reason: ticketError ?? 'PROVIDER_TICKET_ERROR', retry_after_seconds: null });
        failed += 1;
        continue;
      }
      if (!ticket?.id) {
        await rpc('fail_push_delivery', { delivery_id: delivery.deliveryId, lease_id: delivery.leaseId, reason: 'INVALID_PROVIDER_RESPONSE', retry_after_seconds: null });
        failed += 1;
        continue;
      }
      const completed = await rpc<RpcResult<unknown>>('complete_push_delivery', { delivery_id: delivery.deliveryId, lease_id: delivery.leaseId, ticket_id: ticket.id });
      if (!completed?.ok) {
        failed += 1;
        continue;
      }
      sent += 1;
    } catch (error) {
      // A timeout may have reached Expo. The database retry budget prevents an
      // infinite loop; UI consumers refetch and dedupe by eventId.
      await rpc('fail_push_delivery', { delivery_id: delivery.deliveryId, lease_id: delivery.leaseId, reason: error instanceof Error ? error.message.slice(0, 200) : 'PROVIDER_TIMEOUT', retry_after_seconds: null });
      failed += 1;
    }
  }
  return { sent, failed };
}

export async function runOnce(): Promise<Record<string, unknown>> {
  // Missing credentials is reported before claim, so attempts and leases are
  // untouched and the inbox remains usable.
  supabaseConfig();
  const claimed = await rpc<Delivery[]>('claim_push_deliveries', { batch_size: CLAIM_BATCH });
  const result = await sendBatch(Array.isArray(claimed) ? claimed : []);
  const receipts = await pollReceipts();
  return { ok: true, claimed: Array.isArray(claimed) ? claimed.length : 0, ...result, receipts };
}

export async function pollReceipts(fetcher = fetch): Promise<{ checked: number; recorded: number }> {
  const claimed = await rpc<Array<{ deliveryId: string; leaseId: string; ticketId: string }>>('claim_push_receipts', { batch_size: MAX_BATCH });
  if (!Array.isArray(claimed) || claimed.length === 0) return { checked: 0, recorded: 0 };
  const accessToken = env('EXPO_ACCESS_TOKEN');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  const response = await fetcher(EXPO_RECEIPTS_URL, {
    method: 'POST', headers,
    body: JSON.stringify({ ids: claimed.map(item => item.ticketId) }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return { checked: claimed.length, recorded: 0 };
  const payload = await response.json().catch(() => ({}));
  let recorded = 0;
  for (const item of claimed) {
    const receipt = payload?.data?.[item.ticketId];
    if (!receipt) continue;
    const reason = typeof receipt.details?.error === 'string' ? receipt.details.error : null;
    await rpc('record_push_receipt', {
      delivery_id: item.deliveryId,
      receipt_id: item.ticketId,
      receipt_status: receipt.status === 'ok' ? 'ok' : 'error',
      reason,
    });
    recorded += 1;
  }
  return { checked: claimed.length, recorded };
}

export async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ ok: false, messageKey: 'METHOD_NOT_ALLOWED' }, 405);
  const configuredSecret = env('PUSH_SENDER_SECRET');
  if (!configuredSecret || request.headers.get('x-push-sender-secret') !== configuredSecret) {
    return json({ ok: false, messageKey: 'SENDER_FORBIDDEN' }, 403);
  }
  try {
    return json(await runOnce());
  } catch (error) {
    const messageKey = error instanceof Error && error.message === 'PUSH_SENDER_UNCONFIGURED'
      ? 'PUSH_SENDER_UNCONFIGURED' : 'PUSH_SENDER_FAILED';
    return json({ ok: false, messageKey }, messageKey === 'PUSH_SENDER_UNCONFIGURED' ? 503 : 502);
  }
}

if (import.meta.main) Deno.serve(handler);

export { CLAIM_BATCH, EXPO_RECEIPTS_URL, MAX_BATCH, REQUEST_TIMEOUT_MS };
