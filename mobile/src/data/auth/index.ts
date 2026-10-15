import { ApiClientImpl } from '../api/client';
import { AuthHttpTransport, type AuthHttpConfig } from './transport';
import { createSecureSessionStorage } from './storage';
import { SessionManager } from './session';

export { SessionManager, AuthHttpTransport, createSecureSessionStorage };
export type { SessionConfig, SessionStatus } from './session';
export type { AuthPort, SessionStorage, SessionApi } from './types';

/** Composition for GM-25; does not mount screens or start a session on import. */
export function createAuthenticatedApiClient(config: AuthHttpConfig & {
  clearPrivateData: () => Promise<void>;
}) {
  const session = new SessionManager({
    auth: new AuthHttpTransport(config), storage: createSecureSessionStorage(),
    clearPrivateData: config.clearPrivateData, now: config.now,
  });
  const client = new ApiClientImpl({
    baseUrl: config.baseUrl, publicKey: config.publicKey, authSession: session,
    fetchFn: config.fetchFn, defaultTimeoutMs: config.timeoutMs,
  });
  return { session, client };
}
