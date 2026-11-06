import type { ApiClient, PushPermissionStatus, WriteResult } from '../../../data/api/contracts';

export type PushAvailability = 'available' | 'unsupported';

export interface NativePushDriver {
  availability(): PushAvailability;
  requestPermission(): Promise<PushPermissionStatus>;
  getDeviceId(): Promise<string>;
  getPushToken(): Promise<string | undefined>;
  onTokenRefresh(listener: (token: string) => void): () => void;
  onNotificationTap(listener: () => void): () => void;
}

export type PushRegistrationResult =
  | { status: 'unsupported' }
  | { status: 'denied' | 'provisional' | 'unknown'; permission: PushPermissionStatus }
  | { status: 'registered'; deviceId: string; permission: 'granted' }
  | { status: 'failed'; error: string };

/** Orchestrates authenticated registration and canonical inbox refetch; payload is never read. */
export function createNativePushService({ driver, client, refreshInbox }: {
  driver?: NativePushDriver;
  client: Pick<ApiClient, 'registerPushDevice' | 'unregisterPushDevice'>;
  refreshInbox: () => Promise<unknown>;
}) {
  return {
    async register(): Promise<PushRegistrationResult> {
      if (!driver || driver.availability() !== 'available') return { status: 'unsupported' };
      try {
        const permission = await driver.requestPermission();
        if (permission !== 'granted') return { status: permission, permission };
        const [deviceId, token] = await Promise.all([driver.getDeviceId(), driver.getPushToken()]);
        if (!deviceId.trim() || !token?.trim()) return { status: 'failed', error: 'PUSH_TOKEN_UNAVAILABLE' };
        const result = await client.registerPushDevice({ deviceId, token, permission });
        return result.ok ? { status: 'registered', deviceId, permission } : { status: 'failed', error: result.error.messageKey };
      } catch {
        return { status: 'failed', error: 'PUSH_REGISTRATION_FAILED' };
      }
    },
    async unregister(deviceId: string): Promise<WriteResult<void> | undefined> {
      return deviceId.trim() ? client.unregisterPushDevice(deviceId) : undefined;
    },
    subscribe(): () => void {
      if (!driver || driver.availability() !== 'available') return () => undefined;
      const stopTokenRefresh = driver.onTokenRefresh(token => {
        if (!token.trim()) return;
        void Promise.all([driver.getDeviceId(), Promise.resolve(token)]).then(([deviceId, refreshedToken]) =>
          client.registerPushDevice({ deviceId, token: refreshedToken, permission: 'granted' })).catch(() => undefined);
      });
      const stopTap = driver.onNotificationTap(() => { void refreshInbox().catch(() => undefined); });
      return () => { stopTokenRefresh(); stopTap(); };
    },
  };
}

export const unsupportedPushDriver: NativePushDriver = {
  availability: () => 'unsupported',
  requestPermission: async () => 'unknown',
  getDeviceId: async () => '',
  getPushToken: async () => undefined,
  onTokenRefresh: () => () => undefined,
  onNotificationTap: () => () => undefined,
};
