import { CONTRACT, MAX_BODY_BYTES, OcrError, parseInput, uuid } from './contract.ts';
import { normalizeDraft } from './normalize.ts';
import { supabaseAuthorizer } from './auth.ts';
import { readJson } from './read-json.ts';
import type { OcrProvider } from './contract.ts';
import type { Quota } from './quota.ts';

export interface Dependencies {
  enabled: boolean;
  authorize(request: Request): Promise<string | null>;
  allowedUsers: ReadonlySet<string>;
  provider: OcrProvider | null;
  quota: Quota | null;
  timeoutMs?: number;
  bodyTimeoutMs?: number;
}

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'X-GM36-Contract': CONTRACT,
    ...(status === 405 ? { Allow: 'POST' } : {}), ...(status === 429 ? { 'Retry-After': '60' } : {}),
  } });
}

/** Exact same Web handler runs in Edge and the isolated Node HTTP test harness. */
export function createMenuOcrHandler(deps: Dependencies): (request: Request) => Promise<Response> {
  const timeoutMs = deps.timeoutMs ?? 10_000;
  const bodyTimeoutMs = deps.bodyTimeoutMs ?? 5000;
  if (![timeoutMs, bodyTimeoutMs].every(t => Number.isFinite(t) && t >= 1 && t <= 30_000)) throw new Error('Invalid OCR deadline');
  if (deps.provider && !['on-device', 'test-double'].includes(deps.provider.mode)) throw new Error('Unrecognized OCR adapter mode');
  return async request => {
    let requestId: string | undefined;
    try {
      if (request.method !== 'POST') throw new OcrError('METHOD_NOT_ALLOWED', 405);
      const user = await deps.authorize(request);
      if (!uuid(user)) throw new OcrError('AUTH_REQUIRED', 401);
      if (!deps.enabled) throw new OcrError('OCR_DISABLED', 503);
      if (!deps.allowedUsers.has(user.toLowerCase())) throw new OcrError('OCR_FORBIDDEN', 403);
      if (!deps.provider || !deps.quota) throw new OcrError('OCR_UNAVAILABLE', 503);
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new OcrError('UNSUPPORTED_MEDIA_TYPE', 415);
      const input = parseInput(await readJson(request, MAX_BODY_BYTES, bodyTimeoutMs)); requestId = input.requestId;
      const lease = deps.quota.acquire(user.toLowerCase());
      if (!lease) throw new OcrError('RATE_LIMITED', 429);
      const abort = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const work = Promise.resolve().then(() => deps.provider!.recognize(input.image, abort.signal));
      // A provider ignoring abort keeps its concurrency slot until it actually
      // settles. A timeout must not allow overlapping costly provider work.
      void work.then(() => lease.release(), () => lease.release());
      try {
        const output = await Promise.race([work, new Promise<never>((_, reject) => {
          timer = setTimeout(() => { reject(new OcrError('OCR_TIMEOUT', 504)); abort.abort(); }, timeoutMs);
        })]);
        const draft = normalizeDraft(output, input, deps.provider.mode);
        return response(200, { ok: true, requestId, data: draft });
      } finally { clearTimeout(timer); }
    } catch (error) {
      const safe = error instanceof OcrError ? error : new OcrError('OCR_UNAVAILABLE', 503);
      return response(safe.status, { ok: false, ...(requestId ? { requestId } : {}),
        messageKey: safe.code, error: { messageKey: safe.code } });
    }
  };
}

// No reviewed recognizer/native package or distributed quota exists yet.
// Keep the actual Edge entrypoint disabled; tests inject explicit test adapters.
const runtime = (globalThis as unknown as { Deno?: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): unknown;
} }).Deno;
if (runtime && (import.meta as ImportMeta & { main?: boolean }).main) {
  const url = runtime.env.get('SUPABASE_URL'), key = runtime.env.get('SUPABASE_ANON_KEY');
  const authorize = url && key ? supabaseAuthorizer(url, key) : async () => { throw new OcrError('AUTH_UNAVAILABLE', 503); };
  runtime.serve(createMenuOcrHandler({ enabled: false, authorize, allowedUsers: new Set(), provider: null, quota: null }));
}
