import type { ApiError, SessionUser } from '../api/contracts';
import type { AuthPort, StoredSession } from './types';
import { AuthFailure } from './types';
import { isRecord, isSessionUser } from '../api/responseGuards';
import { validDisplayName } from './validation';

export interface AuthHttpConfig {
  baseUrl: string;
  publicKey: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

function publicKeyAllowed(key: string): boolean {
  if (key.startsWith('sb_publishable_')) return true;
  // Legacy anon JWT: decode only to reject privileged config, never for auth.
  try {
    const part = key.split('.')[1];
    if (!part) return false;
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return isRecord(claims) && claims.role === 'anon';
  } catch { return false; }
}

function userDto(value: unknown): SessionUser {
  if (!isRecord(value) || !isRecord(value.user_metadata)) throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
  const user = {
    id: value.id,
    displayName: value.user_metadata.display_name,
    isGuest: value.is_anonymous,
    createdAt: value.created_at,
  };
  if (!isSessionUser(user) || !user.isGuest || !validDisplayName(user.displayName)) {
    throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
  }
  return user;
}

/** GoTrue owns token creation/verification. No userId or service key accepted. */
export class AuthHttpTransport implements AuthPort {
  private readonly config: AuthHttpConfig;
  private readonly baseUrl: string;
  constructor(config: AuthHttpConfig) {
    const url = new URL(config.baseUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Auth requires HTTPS or loopback HTTP and an origin-only URL');
    }
    if (!publicKeyAllowed(config.publicKey)) throw new Error('Auth requires a public publishable/anon key');
    if (!Number.isFinite(config.timeoutMs ?? 15000) || (config.timeoutMs ?? 15000) <= 0) {
      throw new Error('Auth timeout must be positive');
    }
    this.config = config;
    this.baseUrl = url.origin;
  }

  private async request(path: string, method: string, body?: unknown, token?: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 15000);
    try {
      const response = await (this.config.fetchFn ?? fetch)(`${this.baseUrl}/auth/v1/${path}`, {
        method, redirect: 'error', signal: controller.signal,
        headers: {
          apikey: this.config.publicKey, 'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        let errorBody: unknown;
        try { errorBody = await response.json(); } catch { /* Do not expose raw body. */ }
        const providerCode = isRecord(errorBody)
          ? typeof errorBody.error_code === 'string' ? errorBody.error_code : errorBody.code
          : undefined;
        const authRejected = path.startsWith('token') && typeof providerCode === 'string'
          && ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found',
            'session_expired', 'validation_failed'].includes(providerCode);
        const messageKey: ApiError['messageKey'] = response.status === 429 ? 'RATE_LIMITED'
          : response.status === 401 || response.status === 403 || authRejected ? 'AUTH_REQUIRED'
            : response.status >= 500 ? 'NETWORK_ERROR'
              : response.status === 400 || response.status === 422 ? 'INVALID_INPUT' : 'UNKNOWN_ERROR';
        const retryHeader = response.headers.get('Retry-After');
        const seconds = retryHeader === null ? NaN : Number(retryHeader);
        const delay = Number.isFinite(seconds) ? seconds * 1000
          : retryHeader ? Date.parse(retryHeader) - (this.config.now ?? Date.now)() : NaN;
        throw new AuthFailure({ messageKey }, Number.isFinite(delay) ? Math.max(0, delay) : undefined);
      }
      if (response.status === 204) return null;
      try { return await response.json(); }
      catch { throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' }); }
    } catch (error) {
      if (error instanceof AuthFailure) throw error;
      throw new AuthFailure({ messageKey: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR' });
    } finally { clearTimeout(timer); }
  }

  private tokens(value: unknown): StoredSession {
    if (!isRecord(value) || typeof value.access_token !== 'string' || !value.access_token
      || typeof value.refresh_token !== 'string' || !value.refresh_token || value.token_type !== 'bearer'
      || !Number.isSafeInteger(value.expires_in) || (value.expires_in as number) <= 0) {
      throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
    }
    const now = (this.config.now ?? Date.now)();
    const expiry = value.expires_at === undefined ? now + (value.expires_in as number) * 1000
      : typeof value.expires_at === 'number' && Number.isSafeInteger(value.expires_at) ? value.expires_at * 1000 : NaN;
    if (!Number.isFinite(expiry) || expiry <= now || expiry > 8640000000000000) {
      throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
    }
    return {
      accessToken: value.access_token, refreshToken: value.refresh_token,
      expiresAt: new Date(expiry).toISOString(), user: userDto(value.user),
    };
  }

  async createGuest(displayName: string): Promise<StoredSession> {
    if (!validDisplayName(displayName)) throw new AuthFailure({ messageKey: 'INVALID_INPUT' });
    return this.tokens(await this.request('signup', 'POST', { data: { display_name: displayName.trim() } }));
  }
  async verify(accessToken: string): Promise<SessionUser> {
    if (!accessToken) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
    return userDto(await this.request('user', 'GET', undefined, accessToken));
  }
  async refresh(refreshToken: string): Promise<StoredSession> {
    if (!refreshToken) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
    return this.tokens(await this.request('token?grant_type=refresh_token', 'POST', { refresh_token: refreshToken }));
  }
  async logout(accessToken: string): Promise<void> {
    await this.request('logout?scope=local', 'POST', undefined, accessToken);
  }
}
