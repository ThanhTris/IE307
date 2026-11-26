import { ApiClientImpl } from '../api/client';
import { AuthHttpTransport, type AuthHttpConfig } from './transport';
import { createSecureSessionStorage } from './storage';
import { SessionManager } from './session';
import { createAccountService } from './account';

export { SessionManager, AuthHttpTransport, createSecureSessionStorage };
export type { SessionConfig, SessionStatus } from './session';
export type { AuthPort, SessionStorage, SessionApi } from './types';
export type { AccountService } from './account';

/** Composition for GM-25; does not mount screens or start a session on import. */
export function createAuthenticatedApiClient(config: AuthHttpConfig & {
  clearPrivateData: () => Promise<void>;
  storage?: import('./types').SessionStorage;
  onAccountSessionChange?: import('./session').SessionConfig['onAccountSessionChange'];
}) {
  const storage = config.storage ?? createSecureSessionStorage();
  const auth = new AuthHttpTransport(config);
  const session = new SessionManager({
    auth, storage, onAccountSessionChange: config.onAccountSessionChange,
    clearPrivateData: config.clearPrivateData, now: config.now,
  });
  const client = new ApiClientImpl({
    baseUrl: config.baseUrl, publicKey: config.publicKey, authSession: session,
    fetchFn: config.fetchFn, defaultTimeoutMs: config.timeoutMs,
  });
  return { session, client, storage, auth, account: createAccountService(auth, session) };
}
