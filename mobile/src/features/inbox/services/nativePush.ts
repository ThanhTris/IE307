import type { ApiClient, PushPermissionStatus, WriteResult } from '../../../data/api/contracts';

export type PushAvailability = 'available' | 'unsupported';

/** Native implementation is injected so Expo Go can load without a native push module. */
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

/** Owns registration and tap handling; notification payload never grants access or navigation. */
export function createNativePushService({ driver, client, refreshInbox }: {
  driver?: NativePushDriver;
  client: Pick<ApiClient, 'registerPushDevice' | 'unregisterPushDevice'>;
  refreshInbox: () => Promise<unknown>;
}) {
  const pushDriver = driver;

  return {
    isSupported(): boolean {
      return pushDriver?.availability() === 'available';
    },

    async register(): Promise<PushRegistrationResult> {
      if (!pushDriver || pushDriver.availability() !== 'available') return { status: 'unsupported' };
      try {
        const permission = await pushDriver.requestPermission();
        if (permission !== 'granted') return { status: permission, permission };
        const [deviceId, token] = await Promise.all([pushDriver.getDeviceId(), pushDriver.getPushToken()]);
        if (!deviceId.trim() || !token?.trim()) return { status: 'failed', error: 'PUSH_TOKEN_UNAVAILABLE' };
        const result = await client.registerPushDevice({ deviceId, token, permission });
        return result.ok
          ? { status: 'registered', deviceId, permission }
          : { status: 'failed', error: result.error.messageKey };
      } catch {
        return { status: 'failed', error: 'PUSH_REGISTRATION_FAILED' };
      }
    },

    async unregister(deviceId: string): Promise<WriteResult<void> | undefined> {
      if (!deviceId.trim()) return undefined;
      return client.unregisterPushDevice(deviceId);
    },

    subscribe(): () => void {
      if (!pushDriver || pushDriver.availability() !== 'available') return () => undefined;
      const removeRefresh = pushDriver.onTokenRefresh(token => {
        if (!token.trim()) return;
        void pushDriver.getDeviceId().then(deviceId => client.registerPushDevice({
          deviceId,
          token,
          permission: 'granted',
        })).catch(() => undefined);
      });
      const removeTap = pushDriver.onNotificationTap(() => {
        void refreshInbox().catch(() => undefined);
      });
      return () => { removeRefresh(); removeTap(); };
    },
  };
}

/** Expo Go and builds without an approved native driver use this capability result. */
export const unsupportedPushDriver: NativePushDriver = {
  availability: () => 'unsupported',
  requestPermission: async () => 'unknown',
  getDeviceId: async () => '',
  getPushToken: async () => undefined,
  onTokenRefresh: () => () => undefined,
  onNotificationTap: () => () => undefined,
};
