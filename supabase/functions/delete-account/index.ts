const url = Deno.env.get('SUPABASE_URL') ?? '';
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(status: number, messageKey: string): Response {
  return Response.json({ ok: false, error: { messageKey } }, { status });
}

function completed(requestId: string): Response {
  return Response.json({ ok: true, data: { requestId, deleted: true } });
}

async function rpc(name: string, input: Record<string, unknown>) {
  const response = await fetch(url + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: { apikey: serviceKey, authorization: 'Bearer ' + serviceKey, 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('DELETE_ACCOUNT_RPC_FAILED');
  return await response.json();
}

function claims(token: string): { sub?: string; session_id?: string; exp?: number } {
  const payload = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
  return JSON.parse(atob(payload));
}

async function fingerprint(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async request => {
  if (request.method !== 'POST') return failure(405, 'METHOD_NOT_ALLOWED');
  // A missing key would make GoTrue reject every valid token as AUTH_REQUIRED; fail loudly instead.
  if (!url || !publishableKey || !serviceKey) return failure(500, 'SERVER_MISCONFIGURED');
  const token = request.headers.get('authorization')?.match(/^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/i)?.[1];
  if (!token) return failure(401, 'AUTH_REQUIRED');

  let requestId: string;
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 1
      || typeof body.requestId !== 'string' || !uuid.test(body.requestId)) {
      return failure(400, 'INVALID_INPUT');
    }
    requestId = body.requestId.toLowerCase();
  } catch {
    return failure(400, 'INVALID_INPUT');
  }

  try {
    const receipt = { request_key: requestId, token_hash: await fingerprint(token) };
    if (await rpc('gm49_account_delete_completed', receipt) === true) return completed(requestId);

    const identity = await fetch(url + '/auth/v1/user', {
      headers: { apikey: publishableKey, authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(8000),
    });
    if ([401, 403, 404].includes(identity.status)) return failure(401, 'AUTH_REQUIRED');
    if (!identity.ok) return failure(503, 'DELETE_RETRY');
    const user = await identity.json();
    const signed = claims(token);
    if (!uuid.test(user.id) || user.id !== signed.sub || !uuid.test(signed.session_id ?? '')
      || !Number.isSafeInteger(signed.exp) || signed.exp! <= Date.now() / 1000) {
      return failure(401, 'AUTH_REQUIRED');
    }

    const intent = { ...receipt, person: user.id, session_key: signed.session_id, token_exp: signed.exp };
    const prepared = await rpc('gm49_prepare_account_delete', intent);
    if (prepared === 'AUTH_REQUIRED') return failure(401, prepared);
    if (prepared === 'ACTIVE_ROOM' || prepared === 'DELETION_IN_PROGRESS') return failure(409, prepared);
    if (prepared !== 'READY') return failure(503, 'DELETE_RETRY');

    try {
      await fetch(url + '/auth/v1/admin/users/' + user.id, {
        method: 'DELETE',
        headers: { apikey: serviceKey, authorization: 'Bearer ' + serviceKey },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      // A timed-out request may already have committed. Check the durable receipt.
    }

    if (await rpc('gm49_account_delete_completed', receipt) === true) return completed(requestId);
    const status = await rpc('gm49_prepare_account_delete', intent);
    if (status === 'ACTIVE_ROOM') return failure(409, status);
    if (status === 'AUTH_REQUIRED') return failure(401, status);
    return failure(503, 'DELETE_RETRY');
  } catch {
    return failure(503, 'DELETE_RETRY');
  }
});
