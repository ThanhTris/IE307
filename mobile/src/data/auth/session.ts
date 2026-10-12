import type { ApiError, CreateGuestSessionRequest, ReadResult, SessionResponse, SessionUser, WriteResult } from '../api/contracts';
import type { AuthPort, SessionApi, SessionStorage, StoredSession } from './types';
import { AuthFailure, authError } from './types';
import { isStoredSession, validDisplayName } from './validation';

export interface SessionConfig {
  auth: AuthPort;
  storage: SessionStorage;
  /** Required: clear ALL private cache/draft/outbox for the previous identity. */
  clearPrivateData: () => Promise<void>;
  onTokenChange?: (token: string | null) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export type SessionStatus = 'empty' | 'active' | 'lost' | 'blocked';

/** Serialized token rotation + immediate logout invalidation; no implicit signup. */
export class SessionManager implements SessionApi {
  private config: SessionConfig;
  private current: StoredSession | null = null;
  private status: SessionStatus = 'empty';
  private generation = 0;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(config: SessionConfig) {
    if (typeof config.clearPrivateData !== 'function') throw new Error('Private cache cleanup is required');
    this.config = config;
  }
  getStatus(): SessionStatus { return this.status; }
  getGeneration(): number { return this.generation; }

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work, work);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
  private check(generation: number) {
    if (generation !== this.generation) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
  }
  private publish(token: string | null) {
    try { this.config.onTokenChange?.(token); }
    catch { /* An observer must never obstruct private cleanup or token rotation. */ }
  }
  private now() { return (this.config.now ?? Date.now)(); }
  private async cleanup(next: SessionStatus): Promise<void> {
    ++this.generation; // Also invalidate business responses after server-detected auth loss.
    this.current = null;
    this.status = 'blocked';
    this.publish(null);
    const results = await Promise.allSettled([
      Promise.resolve().then(() => this.config.storage.clear()),
      Promise.resolve().then(() => this.config.clearPrivateData()),
    ]);
    if (results.some(result => result.status === 'rejected')) throw new AuthFailure({ messageKey: 'UNKNOWN_ERROR' });
    this.status = next;
  }
  private async commit(session: StoredSession, generation: number) {
    this.check(generation);
    if (!isStoredSession(session) || Date.parse(session.expiresAt) <= this.now()) {
      throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
    }
    try { await this.config.storage.save(session); }
    catch {
      ++this.generation;
      this.current = null;
      this.status = 'blocked';
      this.publish(null);
      throw new AuthFailure({ messageKey: 'UNKNOWN_ERROR' });
    }
    this.check(generation);
    this.current = session;
    this.status = 'active';
    this.publish(session.accessToken);
  }
  private async retry<T>(work: () => Promise<T>, generation: number): Promise<T> {
    // Only read verification is retried automatically; token rotation/signup are not.
    for (let attempt = 0; ; attempt++) {
      this.check(generation);
      try { return await work(); } catch (error) {
        const code = authError(error).messageKey;
        if (attempt >= 2 || !['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED'].includes(code)) throw error;
        const delay = error instanceof AuthFailure ? error.retryAfterMs : undefined;
        // Long Retry-After is surfaced to UI, never shortened and retried early.
        if (delay !== undefined && delay > 5000) throw error;
        await (this.config.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms))))(
          Math.max(delay ?? 0, 250 * 2 ** attempt + Math.floor((this.config.random ?? Math.random)() * 100)),
        );
      }
    }
  }
  private async refreshStored(session: StoredSession, generation: number): Promise<StoredSession> {
    const refreshed = await this.config.auth.refresh(session.refreshToken);
    this.check(generation);
    if (!isStoredSession(refreshed) || refreshed.user.id !== session.user.id) {
      throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
    }
    return refreshed;
  }
  private async restore(generation: number, token?: string): Promise<StoredSession> {
    this.check(generation);
    if (this.status === 'blocked') throw new AuthFailure({ messageKey: 'UNKNOWN_ERROR' });
    const stored = this.current ?? await this.config.storage.load();
    this.check(generation);
    if (!stored) {
      await this.cleanup('lost');
      throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
    }
    if (!isStoredSession(stored)) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
    if (token !== undefined && stored.accessToken !== token) {
      // Reject importing a foreign token; do not destroy the legitimate session.
      throw new AuthFailure({ messageKey: 'INVALID_INPUT' });
    }
    let candidate = stored;
    if (Date.parse(stored.expiresAt) <= this.now() + 30000) candidate = await this.refreshStored(stored, generation);
    let user: SessionUser;
    try { user = await this.retry(() => this.config.auth.verify(candidate.accessToken), generation); }
    catch (error) {
      if (authError(error).messageKey !== 'AUTH_REQUIRED' || candidate !== stored) throw error;
      candidate = await this.refreshStored(stored, generation);
      user = await this.retry(() => this.config.auth.verify(candidate.accessToken), generation);
    }
    if (user.id !== stored.user.id || !user.isGuest) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
    await this.commit({ ...candidate, user }, generation);
    return this.current!;
  }
  private async failure(error: unknown, generation: number): Promise<ApiError> {
    const result = authError(error);
    if (generation === this.generation && result.messageKey === 'AUTH_REQUIRED' && this.status !== 'lost') {
      try { await this.cleanup('lost'); } catch (cleanupError) { return authError(cleanupError); }
    }
    return result;
  }

  async createGuestSession(request: CreateGuestSessionRequest): Promise<WriteResult<SessionResponse>> {
    const generation = this.generation;
    return this.exclusive(async () => {
      try {
        this.check(generation);
        if (!validDisplayName(request.displayName)) throw new AuthFailure({ messageKey: 'INVALID_INPUT' });
        if (this.status === 'blocked') throw new AuthFailure({ messageKey: 'UNKNOWN_ERROR' });
        if (this.current || await this.config.storage.load()) throw new AuthFailure({ messageKey: 'INVALID_INPUT' });
        await this.config.clearPrivateData();
        this.check(generation);
        let session: StoredSession;
        try { session = await this.config.auth.createGuest(request.displayName.trim()); }
        catch (error) {
          if (generation === this.generation && ['NETWORK_ERROR', 'TIMEOUT', 'MALFORMED_RESPONSE'].includes(authError(error).messageKey)) {
            ++this.generation;
            this.status = 'blocked'; // Unknown signup outcome needs explicit logout before another creation.
          }
          throw error;
        }
        this.check(generation);
        try { await this.commit(session, generation); }
        catch (error) {
          // A guest whose secure persistence failed must never become active.
          try { await this.cleanup('lost'); } catch { /* blocked status retained */ }
          throw error;
        }
        return { ok: true, requestId: request.requestId, data: {
          token: session.accessToken, user: { ...session.user }, expiresAt: session.expiresAt,
        } };
      } catch (error) { return { ok: false, requestId: request.requestId, error: await this.failure(error, generation) }; }
    });
  }
  async restoreSession(token?: string): Promise<ReadResult<SessionUser>> {
    const generation = this.generation;
    return this.exclusive(async () => {
      try { return { ok: true, data: { ...(await this.restore(generation, token)).user } }; }
      catch (error) { return { ok: false, error: await this.failure(error, generation) }; }
    });
  }
  async getAccessToken(): Promise<ReadResult<string>> {
    const generation = this.generation;
    return this.exclusive(async () => {
      try {
        this.check(generation);
        if (this.current && this.status === 'active' && Date.parse(this.current.expiresAt) > this.now() + 30000) {
          return { ok: true, data: this.current.accessToken };
        }
        return { ok: true, data: (await this.restore(generation)).accessToken };
      } catch (error) { return { ok: false, error: await this.failure(error, generation) }; }
    });
  }
  /** Explicitly rotate the refresh token for the internal harness and future app callers. */
  async refreshSession(): Promise<ReadResult<SessionUser>> {
    const generation = this.generation;
    return this.exclusive(async () => {
      try {
        this.check(generation);
        if (this.status === 'blocked') throw new AuthFailure({ messageKey: 'UNKNOWN_ERROR' });
        const stored = this.current ?? await this.config.storage.load();
        this.check(generation);
        if (!stored || !isStoredSession(stored)) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
        const refreshed = await this.refreshStored(stored, generation);
        const user = await this.retry(() => this.config.auth.verify(refreshed.accessToken), generation);
        if (user.id !== stored.user.id || !user.isGuest) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
        await this.commit({ ...refreshed, user }, generation);
        return { ok: true, data: { ...user } };
      } catch (error) {
        return { ok: false, error: await this.failure(error, generation) };
      }
    });
  }

  async logout(requestId?: string): Promise<WriteResult<void>> {
    const token = this.current?.accessToken;
    ++this.generation; // Invalidates requests immediately, before asynchronous cleanup.
    this.current = null;
    this.status = 'blocked';
    this.publish(null);
    return this.exclusive(async () => {
      let savedToken = token;
      if (!savedToken) {
        try { savedToken = (await this.config.storage.load())?.accessToken; } catch { /* still clear corrupted storage */ }
      }
      let localError: ApiError | undefined;
      try { await this.cleanup('empty'); } catch (error) { localError = authError(error); }
      let remoteError: ApiError | undefined;
      if (savedToken) {
        try { await this.config.auth.logout(savedToken); }
        catch (error) { if (authError(error).messageKey !== 'AUTH_REQUIRED') remoteError = authError(error); }
      }
      const error = localError ?? remoteError;
      return error ? { ok: false, requestId, error } : { ok: true, requestId, data: undefined };
    });
  }
}
