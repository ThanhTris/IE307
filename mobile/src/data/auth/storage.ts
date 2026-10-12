import * as SecureStore from 'expo-secure-store';
import type { SessionStorage, StoredSession } from './types';
import { AuthFailure } from './types';
import { isStoredSession } from './validation';

type SecureStorePort = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;
const key = 'gcd.auth.gm16.v1';

/** One encrypted entry prevents mixing access/refresh tokens from two sessions. */
export function createSecureSessionStorage(port: SecureStorePort = SecureStore): SessionStorage {
  return {
    async load() {
      const raw = await port.getItemAsync(key);
      if (raw === null) return null;
      let value: unknown;
      try { value = JSON.parse(raw); } catch { throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' }); }
      if (!isStoredSession(value)) throw new AuthFailure({ messageKey: 'AUTH_REQUIRED' });
      return value;
    },
    async save(session: StoredSession) {
      if (!isStoredSession(session)) throw new AuthFailure({ messageKey: 'MALFORMED_RESPONSE' });
      await port.setItemAsync(key, JSON.stringify(session), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    },
    async clear() { await port.deleteItemAsync(key); },
  };
}
