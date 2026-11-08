import type { ApiClient, PushPermissionStatus, WriteResult } from '../../../data/api/contracts';

export type PushAvailability = 'available' | 'unsupported';

export interface NativePushDriver {
  availability(): PushAvailability;
  requestPermission(): Promise<PushPermissionStatus>;
  getPermissionStatus(): Promise<PushPermissionStatus>;
  getDeviceId(): Promise<string>;
  getPushToken(): Promise<string | undefined>;
  getRegistrationEnabled?(identityId: string, deviceId: string): Promise<boolean>;
  setRegistrationEnabled?(identityId: string, deviceId: string, enabled: boolean): Promise<void>;
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

function stateFor(deviceId: string, identityId?: string): DeviceRegistrationState {
  const stateKey = `${identityId ?? 'anonymous'}:${deviceId}`;
  let state = deviceRegistrationStates.get(stateKey);
  if (!state) {
    state = { generation: 0, enabled: false, desiredEnabled: false, queue: Promise.resolve() };
    deviceRegistrationStates.set(stateKey, state);
  }
  return state;
}

/** Orchestrates authenticated registration and canonical inbox refetch; notification payload is never read. */
export function createNativePushService({ driver, client, refreshInbox, isIdentityCurrent, identityId }: {
  driver?: NativePushDriver;
  client: Pick<ApiClient, 'registerPushDevice' | 'unregisterPushDevice'>;
  refreshInbox: () => Promise<unknown>;
  isIdentityCurrent?: () => boolean;
  identityId?: string;
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
        const state = stateFor(deviceId, identityId);
        const generation = ++state.generation;
        state.enabled = false;
        state.desiredEnabled = false;
        if (permission !== 'granted') {
          await driver.setRegistrationEnabled?.(identityId ?? '', deviceId, false).catch(() => undefined);
          return { status: permission, permission };
        }
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
            await driver.setRegistrationEnabled?.(identityId ?? '', deviceId, true);
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
      const state = stateFor(deviceId, identityId);
      const generation = ++state.generation;
      state.enabled = false;
      state.desiredEnabled = false;
      await driver?.setRegistrationEnabled?.(identityId ?? '', deviceId, false).catch(() => undefined);
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
      const hydration = driver.getDeviceId().then(async deviceId => {
        if (!deviceId.trim() || disposed || !identityIsCurrent()) return;
        const state = stateFor(deviceId, identityId);
        const generation = state.generation;
        if (!identityId || !driver.getRegistrationEnabled) return;
        const persisted = await driver.getRegistrationEnabled(identityId, deviceId);
        if (disposed || generation !== state.generation || !identityIsCurrent()) return;
        state.desiredEnabled = persisted;
        state.enabled = persisted;
      }).catch(() => undefined);
      const stopTokenRefresh = driver.onTokenRefresh(token => {
        if (!token.trim() || disposed || !identityIsCurrent()) return;
        void driver.getDeviceId().then(async deviceId => {
          if (!deviceId.trim() || disposed || !identityIsCurrent()) return;
          const state = stateFor(deviceId, identityId);
          const generation = state.generation;
          await hydration;
          const persistedEnabled = identityId && driver.getRegistrationEnabled
            ? await driver.getRegistrationEnabled(identityId, deviceId)
            : state.desiredEnabled;
          if (persistedEnabled && generation === state.generation) state.desiredEnabled = true;
          if (!state.desiredEnabled || await driver.getPermissionStatus() !== 'granted') return;
          if (disposed || generation !== state.generation || !state.desiredEnabled || !identityIsCurrent()) return;
          const operation = state.queue.then(async () => {
            if (disposed || generation !== state.generation || !state.desiredEnabled || !identityIsCurrent()) return;
            if (await driver.getPermissionStatus() !== 'granted'
              || disposed || generation !== state.generation || !state.desiredEnabled || !identityIsCurrent()) return;
            const result = await client.registerPushDevice({ deviceId, token, permission: 'granted' });
            if (result.ok && !disposed && generation === state.generation && state.desiredEnabled && identityIsCurrent()) {
              state.enabled = true;
              await driver.setRegistrationEnabled?.(identityId ?? '', deviceId, true);
              await driver.acknowledgeToken?.(token);
            }
          });
          state.queue = operation.catch(() => undefined);
          await operation;
        }).catch(() => undefined);
      });
      const stopTap = driver.onNotificationTap(() => {
        if (!disposed && identityIsCurrent()) void refreshInbox().catch(() => undefined);
      });
      return () => { disposed = true; stopTokenRefresh(); stopTap(); void hydration; };
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
