import type { ApiError, ReadResult } from '../../../data/api/contracts';
import { isRecord } from '../../../data/api/responseGuards';
import type { SessionManager } from '../../../data/auth/session';
import type { AuthHttpTransport } from '../../../data/auth/transport';
import { AuthFailure } from '../../../data/auth/types';

type DeletionIssue =
  | 'AUTH_REQUIRED' | 'FORBIDDEN' | 'INVALID_PASSWORD' | 'ACTIVE_ROOM'
  | 'DELETION_IN_PROGRESS' | 'CONFLICT' | 'RATE_LIMITED' | 'SERVER_RETRY'
  | 'NETWORK_ERROR' | 'TIMEOUT' | 'MALFORMED_RESPONSE' | 'LOCAL_CLEANUP' | 'UNKNOWN_ERROR';

type Attempt = { userId: string; epoch: number; requestId: string; bearer: string; expiresAt: number };
type DeleteInput = { userId: string; password: string; signal: AbortSignal };

const issueKeys: Record<DeletionIssue, ApiError['messageKey']> = {
  AUTH_REQUIRED: 'AUTH_REQUIRED', FORBIDDEN: 'NOT_MEMBER', INVALID_PASSWORD: 'INVALID_INPUT',
  ACTIVE_ROOM: 'ROOM_LOCKED', DELETION_IN_PROGRESS: 'VERSION_CONFLICT', CONFLICT: 'VERSION_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED', SERVER_RETRY: 'NETWORK_ERROR', NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT', MALFORMED_RESPONSE: 'MALFORMED_RESPONSE', LOCAL_CLEANUP: 'UNKNOWN_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

function deletionFailure(issue: DeletionIssue, retryAt?: number): AuthFailure {
  return new AuthFailure({ messageKey: issueKeys[issue], details: { reason: issue, retryAt } });
}

function httpIssue(status: number, body: unknown): DeletionIssue {
  const code = isRecord(body) && body.ok === false && isRecord(body.error) ? body.error.messageKey : undefined;
  if (status === 401 || code === 'AUTH_REQUIRED') return 'AUTH_REQUIRED';
  if (status === 403 || code === 'FORBIDDEN') return 'FORBIDDEN';
  if (status === 429 || code === 'RATE_LIMITED') return 'RATE_LIMITED';
  if (status >= 500 || code === 'DELETE_RETRY') return 'SERVER_RETRY';
  if (status === 409 || code === 'ACTIVE_ROOM' || code === 'DELETION_IN_PROGRESS') {
    if (code === 'ACTIVE_ROOM' || code === 'DELETION_IN_PROGRESS') return code;
    return 'CONFLICT';
  }
  return status >= 400 ? 'UNKNOWN_ERROR' : 'MALFORMED_RESPONSE';
}

function retryDelay(header: string | null, now: number): number | undefined {
  if (!header?.trim()) return undefined;
  const delay = /^\d+$/.test(header.trim()) ? Number(header) * 1000 : Date.parse(header) - now;
  return Number.isSafeInteger(delay) ? Math.max(0, delay) : undefined;
}

function createRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().toLowerCase();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  // The UUID is an idempotency identifier; the server authorizes with the bearer.
  else for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

async function postDeletion(url: string, publicKey: string, attempt: Attempt, send: typeof fetch, now: () => number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await send(url, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { apikey: publicKey, Authorization: `Bearer ${attempt.bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: attempt.requestId }),
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok || (isRecord(body) && body.ok === false)) {
      const delay = retryDelay(response.headers.get('Retry-After'), now());
      throw deletionFailure(httpIssue(response.status, body), delay === undefined ? undefined : now() + delay);
    }
    if (!isRecord(body) || body.ok !== true || !isRecord(body.data)
        || body.data.requestId !== attempt.requestId || body.data.deleted !== true) {
      throw deletionFailure('MALFORMED_RESPONSE');
    }
  } catch (error) {
    if (error instanceof AuthFailure) throw error;
    if (isRecord(error) && typeof error.status === 'number') {
      const headers = new Headers(error.headers as HeadersInit | undefined);
      const delay = retryDelay(headers.get('Retry-After'), now());
      throw deletionFailure(httpIssue(error.status, error.body), delay === undefined ? undefined : now() + delay);
    }
    throw deletionFailure(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

type Options = {
  baseUrl: string;
  publicKey: string;
  session: Pick<SessionManager, 'runAccountOperation' | 'getGeneration'>;
  auth: Pick<AuthHttpTransport, 'accountProfile' | 'signIn' | 'logout'>;
  clearDeletedData: (userId: string) => Promise<void>;
  fetchFn?: typeof fetch;
  now?: () => number;
};

export function createAccountDeletion({ baseUrl, publicKey, session, auth, clearDeletedData, fetchFn, now = Date.now }: Options) {
  const url = baseUrl.replace(/\/+$/, '') + '/functions/v1/delete-account';
  let attempt: Attempt | undefined;
  let cooldown: { userId: string; epoch: number; retryAt: number; failures: number } | undefined;
  let sending = false;
  const matches = (scope: { userId: string; epoch: number } | undefined, userId: string) =>
    scope?.userId === userId && scope.epoch === session.getGeneration();
  const canResume = (userId: string) => matches(attempt, userId) && attempt!.expiresAt > now();
  const retryAt = (userId: string) => matches(cooldown, userId) ? cooldown!.retryAt : 0;

  async function submit({ userId, password, signal }: DeleteInput): Promise<ReadResult<void>> {
    if (sending) return { ok: false, error: deletionFailure('DELETION_IN_PROGRESS').error };
    sending = true;
    try {
      const result = await session.runAccountOperation(async ({ requireSession, assertCurrent, completeDeletion }) => {
        if (signal.aborted) throw deletionFailure('AUTH_REQUIRED');
        if (!matches(attempt, userId)) attempt = undefined;
        if (!matches(cooldown, userId)) cooldown = undefined;
        if (retryAt(userId) > now()) throw deletionFailure('RATE_LIMITED', retryAt(userId));
        const epoch = session.getGeneration();
        try {
          if (attempt && attempt.expiresAt <= now()) {
            attempt = undefined;
            throw deletionFailure('AUTH_REQUIRED');
          }
          if (!attempt) {
            const current = await requireSession();
            if (current.user.id !== userId) throw deletionFailure('AUTH_REQUIRED');
            if (!current.user.isGuest) {
              if (!password) throw deletionFailure('INVALID_PASSWORD');
              const profile = await auth.accountProfile(current.accessToken);
              assertCurrent();
              if (profile.user.id !== userId) throw deletionFailure('MALFORMED_RESPONSE');
              let fresh;
              try { fresh = await auth.signIn({ email: profile.email, password }); }
              catch (error) {
                if (error instanceof AuthFailure) {
                  const code = error.error.messageKey;
                  if (code === 'INVALID_INPUT' || code === 'AUTH_REQUIRED') throw deletionFailure('INVALID_PASSWORD');
                }
                throw error;
              }
              try {
                if (fresh.user.id !== userId || fresh.user.isGuest) throw deletionFailure('MALFORMED_RESPONSE');
                assertCurrent();
              } finally {
                // This proof session is never adopted by the app.
                await auth.logout(fresh.accessToken).catch(() => undefined);
              }
            }
            assertCurrent();
            if (signal.aborted) throw deletionFailure('AUTH_REQUIRED');
            attempt = { userId, epoch, requestId: createRequestId(), bearer: current.accessToken, expiresAt: Date.parse(current.expiresAt) };
          }
          assertCurrent();
          if (signal.aborted) throw deletionFailure('AUTH_REQUIRED');
          await postDeletion(url, publicKey, attempt, fetchFn ?? fetch, now);
          attempt = undefined;
          cooldown = undefined;
          await completeDeletion(userId, () => clearDeletedData(userId));
        } catch (error) {
          if (!(error instanceof AuthFailure)) throw error;
          const reason = error.error.details?.reason;
          if (session.getGeneration() !== epoch || error.error.messageKey === 'AUTH_REQUIRED'
              || reason === 'FORBIDDEN' || reason === 'UNKNOWN_ERROR') attempt = undefined;
          if (session.getGeneration() === epoch && (error.error.messageKey === 'RATE_LIMITED' || reason === 'SERVER_RETRY')) {
            const failures = (cooldown?.failures ?? 0) + 1;
            const explicit = error.error.details?.retryAt;
            const delay = error.retryAfterMs ?? (reason === 'SERVER_RETRY' ? Math.min(30_000, 1000 * 2 ** Math.min(failures - 1, 5)) : 5000);
            cooldown = { userId, epoch, failures, retryAt: typeof explicit === 'number' ? explicit : now() + delay };
            throw deletionFailure(reason === 'SERVER_RETRY' ? 'SERVER_RETRY' : 'RATE_LIMITED', cooldown.retryAt);
          }
          throw error;
        }
      });
      if (!matches(attempt, userId)) attempt = undefined;
      return result;
    } finally {
      sending = false;
    }
  }

  return { submit, canResume, retryAt };
}

export type AccountDeletion = ReturnType<typeof createAccountDeletion>;
