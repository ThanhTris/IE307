import type { ApiClient, PushPermissionStatus, WriteResult } from '../../../data/api/contracts';

export type PushAvailability = 'available' | 'unsupported';

export interface NativePushDriver {
  availability(): PushAvailability;
  requestPermission(): Promise<PushPermissionStatus>;
  getPermissionStatus(): Promise<PushPermissionStatus>;
  getDeviceId(): Promise<string>;
  getPushToken(): Promise<string | undefined>;
  acknowledgeToken?(token: string): Promise<void>;
  simulateNotificationTap?(): boolean;
  onTokenRefresh(listener: (token: string) => void): () => void;
  onNotificationTap(listener: () => void): () => void;
}

export type PushRegistrationResult =
  | { status: 'unsupported' }
  | { status: 'denied' | 'provisional' | 'unknown'; permission: PushPermissionStatus }
  | { status: 'registered'; deviceId: string; permission: 'granted' }
  | { status: 'failed'; error: string };

interface DeviceRegistrationState { generation: number; enabled: boolean; desiredEnabled: boolean; queue: Promise<void> }
const deviceRegistrationStates = new Map<string, DeviceRegistrationState>();

function stateFor(deviceId: string): DeviceRegistrationState {
  let state = deviceRegistrationStates.get(deviceId);
  if (!state) {
    state = { generation: 0, enabled: false, desiredEnabled: false, queue: Promise.resolve() };
    deviceRegistrationStates.set(deviceId, state);
  }
  return state;
}

/** Orchestrates authenticated registration and canonical inbox refetch; notification payload is never read. */
export function createNativePushService({ driver, client, refreshInbox, isIdentityCurrent }: {
  driver?: NativePushDriver;
  client: Pick<ApiClient, 'registerPushDevice' | 'unregisterPushDevice'>;
  refreshInbox: () => Promise<unknown>;
  isIdentityCurrent?: () => boolean;
}) {
  const identityIsCurrent = () => !isIdentityCurrent || isIdentityCurrent();

  return {
    async register(): Promise<PushRegistrationResult> {
      if (!driver || driver.availability() !== 'available') return { status: 'unsupported' };
      try {
        const permission = await driver.requestPermission();
        if (!identityIsCurrent()) return { status: 'failed', error: 'IDENTITY_CHANGED' };
        const deviceId = await driver.getDeviceId();
        if (!identityIsCurrent()) return { status: 'failed', error: 'IDENTITY_CHANGED' };
        if (!deviceId.trim()) return { status: 'failed', error: 'PUSH_DEVICE_UNAVAILABLE' };
        const state = stateFor(deviceId);
        const generation = ++state.generation;
        state.enabled = false;
        state.desiredEnabled = false;
        if (permission !== 'granted') return { status: permission, permission };
        const token = await driver.getPushToken();
        if (!identityIsCurrent() || generation !== state.generation) return { status: 'failed', error: 'IDENTITY_CHANGED' };
        if (!token?.trim()) return { status: 'failed', error: 'PUSH_TOKEN_UNAVAILABLE' };
        if (await driver.getPermissionStatus() !== 'granted' || !identityIsCurrent() || generation !== state.generation) {
          state.desiredEnabled = false;
          return { status: 'failed', error: 'PUSH_PERMISSION_NOT_GRANTED' };
        }
        // Keep an explicit registration intent after a network error so a later
        // foreground token refresh can retry without inferring OS permission.
        state.desiredEnabled = true;

        let result: WriteResult<void> | undefined;
        const operation = state.queue.then(async () => {
          if (generation !== state.generation || !identityIsCurrent()) return;
          if (await driver.getPermissionStatus() !== 'granted' || generation !== state.generation || !identityIsCurrent()) return;
          result = await client.registerPushDevice({ deviceId, token, permission: 'granted' });
          if (result.ok && generation === state.generation && identityIsCurrent()) {
            state.enabled = true;
            await driver.acknowledgeToken?.(token);
          }
        });
        state.queue = operation.catch(() => undefined);
        await operation;
        if (generation !== state.generation || !identityIsCurrent()) return { status: 'failed', error: 'IDENTITY_CHANGED' };
        if (!result) return { status: 'failed', error: 'PUSH_PERMISSION_NOT_GRANTED' };
        return result.ok
          ? { status: 'registered', deviceId, permission: 'granted' }
          : { status: 'failed', error: result.error.messageKey };
      } catch {
        return { status: 'failed', error: 'PUSH_REGISTRATION_FAILED' };
      }
    },
    async unregister(deviceId: string): Promise<WriteResult<void> | undefined> {
      if (!deviceId.trim() || !identityIsCurrent()) return undefined;
      const state = stateFor(deviceId);
      const generation = ++state.generation;
      state.enabled = false;
      state.desiredEnabled = false;
      let result: WriteResult<void> | undefined;
      const operation = state.queue.then(async () => {
        if (generation !== state.generation || !identityIsCurrent()) return;
        result = await client.unregisterPushDevice(deviceId);
      });
      state.queue = operation.catch(() => undefined);
      await operation;
      return result;
    },
    subscribe(): () => void {
      if (!driver || driver.availability() !== 'available') return () => undefined;
      let disposed = false;
      const stopTokenRefresh = driver.onTokenRefresh(token => {
        if (!token.trim() || disposed || !identityIsCurrent()) return;
        void driver.getDeviceId().then(async deviceId => {
          if (!deviceId.trim() || disposed || !identityIsCurrent()) return;
          const state = stateFor(deviceId);
          const generation = state.generation;
          if (!state.desiredEnabled || await driver.getPermissionStatus() !== 'granted') return;
          if (disposed || generation !== state.generation || !state.desiredEnabled || !identityIsCurrent()) return;
          const operation = state.queue.then(async () => {
            if (disposed || generation !== state.generation || !state.desiredEnabled || !identityIsCurrent()) return;
            if (await driver.getPermissionStatus() !== 'granted'
              || disposed || generation !== state.generation || !state.desiredEnabled || !identityIsCurrent()) return;
            const result = await client.registerPushDevice({ deviceId, token, permission: 'granted' });
            if (result.ok && !disposed && generation === state.generation && state.desiredEnabled && identityIsCurrent()) {
              state.enabled = true;
              await driver.acknowledgeToken?.(token);
            }
          });
          state.queue = operation.catch(() => undefined);
          await operation;
        }).catch(() => undefined);
      });
      const stopTap = driver.onNotificationTap(() => { if (!disposed) void refreshInbox().catch(() => undefined); });
      return () => { disposed = true; stopTokenRefresh(); stopTap(); };
    },
  };
}

export const unsupportedPushDriver: NativePushDriver = {
  availability: () => 'unsupported',
  requestPermission: async () => 'unknown',
  getPermissionStatus: async () => 'unknown',
  getDeviceId: async () => '',
  getPushToken: async () => undefined,
  acknowledgeToken: async () => undefined,
  onTokenRefresh: () => () => undefined,
  onNotificationTap: () => () => undefined,
};
