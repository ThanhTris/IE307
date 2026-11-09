import type { ApiClient, PushPermissionStatus, WriteResult } from '../../../data/api/contracts';

export type PushAvailability = 'available' | 'unsupported';
export type RegistrationIntent = 'enabled' | 'disabled' | 'revoke-pending';

export interface NativePushDriver {
  availability(): PushAvailability;
  requestPermission(): Promise<PushPermissionStatus>;
  getPermissionStatus(): Promise<PushPermissionStatus>;
  getDeviceId(): Promise<string>;
  getPushToken(): Promise<string | undefined>;
  getRegistrationEnabled?(identityId: string, deviceId: string): Promise<boolean>;
  setRegistrationEnabled?(identityId: string, deviceId: string, enabled: boolean): Promise<void>;
  getRegistrationIntent?(identityId: string, deviceId: string): Promise<RegistrationIntent>;
  setRegistrationIntent?(identityId: string, deviceId: string, intent: RegistrationIntent): Promise<void>;
  getAcknowledgedToken?(identityId: string, deviceId: string): Promise<string | undefined>;
  acknowledgeToken?(token: string, identityId?: string, deviceId?: string): Promise<void>;
  clearAcknowledgedToken?(identityId: string, deviceId: string): Promise<void>;
  simulateNotificationTap?(eventId: string): boolean;
  scheduleSimulatedNotification?(eventId: string): Promise<boolean>;
  onTokenRefresh(listener: (token: string) => void): () => void;
  onAppForeground?(listener: () => void): () => void;
  onNotificationTap(listener: (eventId: string) => boolean | void | Promise<boolean | void>, identityId?: string): () => void;
}

export type PushRegistrationResult =
  | { status: 'unsupported' }
  | { status: 'denied' | 'provisional' | 'unknown'; permission: PushPermissionStatus }
  | { status: 'registered'; deviceId: string; permission: 'granted' }
  | { status: 'failed'; error: string };

interface DeviceRegistrationState {
  generation: number;
  enabled: boolean;
  desiredEnabled: boolean;
  cleanupPending: boolean;
  hydrated: boolean;
  acknowledgedToken?: string;
  tokenSequence: number;
  queue: Promise<void>;
}

const deviceRegistrationStates = new Map<string, DeviceRegistrationState>();
const identityIntentRevisions = new Map<string, number>();
const pendingIdentityActions = new Map<string, number>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function identityKey(identityId?: string): string { return identityId ?? 'anonymous'; }

function beginIdentityIntent(identityId?: string): number {
  const key = identityKey(identityId);
  const revision = (identityIntentRevisions.get(key) ?? 0) + 1;
  identityIntentRevisions.set(key, revision);
  return revision;
}

function isIdentityIntentCurrent(identityId: string | undefined, revision: number): boolean {
  return identityIntentRevisions.get(identityKey(identityId)) === revision;
}

function changePendingActions(identityId: string | undefined, delta: 1 | -1): void {
  const key = identityKey(identityId);
  const count = Math.max(0, (pendingIdentityActions.get(key) ?? 0) + delta);
  if (count === 0) pendingIdentityActions.delete(key);
  else pendingIdentityActions.set(key, count);
}

function hasPendingAction(identityId: string | undefined): boolean {
  return (pendingIdentityActions.get(identityKey(identityId)) ?? 0) > 0;
}

function stateFor(deviceId: string, identityId?: string): DeviceRegistrationState {
  const stateKey = `${identityKey(identityId)}:${deviceId}`;
  let state = deviceRegistrationStates.get(stateKey);
  if (!state) {
    state = { generation: 0, enabled: false, desiredEnabled: false, cleanupPending: false, hydrated: false, tokenSequence: 0, queue: Promise.resolve() };
    deviceRegistrationStates.set(stateKey, state);
  }
  return state;
}

/** Coordinates registration intent and refetches notifications only by server-owned event ID. */
export function createNativePushService({ driver, client, refreshInbox, isIdentityCurrent, identityId }: {
  driver?: NativePushDriver;
  client: Pick<ApiClient, 'registerPushDevice' | 'unregisterPushDevice'>;
  refreshInbox: (eventId: string) => Promise<unknown>;
  isIdentityCurrent?: () => boolean;
  identityId?: string;
}) {
  const identityIsCurrent = () => !isIdentityCurrent || isIdentityCurrent();

  const readIntent = async (deviceId: string): Promise<RegistrationIntent> => {
    if (!identityId) return 'disabled';
    if (driver?.getRegistrationIntent) return driver.getRegistrationIntent(identityId, deviceId);
    return driver?.getRegistrationEnabled && await driver.getRegistrationEnabled(identityId, deviceId)
      ? 'enabled'
      : 'disabled';
  };

  const writeIntent = async (deviceId: string, intent: RegistrationIntent): Promise<void> => {
    if (!identityId) return;
    if (driver?.setRegistrationIntent) {
      await driver.setRegistrationIntent(identityId, deviceId, intent);
      return;
    }
    await driver?.setRegistrationEnabled?.(identityId, deviceId, intent === 'enabled');
  };

  const enqueueUnregister = (deviceId: string, state: DeviceRegistrationState, generation: number) => {
    let result: WriteResult<void> | undefined;
    changePendingActions(identityId, 1);
    const operation = state.queue.then(async () => {
      try {
        if (generation !== state.generation || !identityIsCurrent() || !state.cleanupPending) return;
        let journalFailed = false;
        try { await writeIntent(deviceId, 'revoke-pending'); } catch { journalFailed = true; }
        if (generation !== state.generation || !identityIsCurrent()) return;
        try { result = await client.unregisterPushDevice(deviceId); }
        catch { state.cleanupPending = true; return; }
        if (generation !== state.generation || !identityIsCurrent()) return;
        if (result.ok) {
          state.cleanupPending = false;
          state.enabled = false;
          state.desiredEnabled = false;
          state.acknowledgedToken = undefined;
          try { await driver?.clearAcknowledgedToken?.(identityId ?? '', deviceId); } catch { /* A stale ACK only triggers a safe re-register. */ }
          try { await writeIntent(deviceId, 'disabled'); } catch { /* The server revoke remains authoritative. */ }
        } else {
          state.cleanupPending = true;
          if (journalFailed) result = { ...result, error: { messageKey: 'UNKNOWN_ERROR' } };
        }
      } finally {
        changePendingActions(identityId, -1);
      }
    });
    state.queue = operation.catch(() => undefined);
    return { operation, getResult: () => result };
  };

  const queueRegister = async (deviceId: string, token: string, state: DeviceRegistrationState, generation: number, tokenSequence: number, isActive: () => boolean): Promise<void> => {
    if (!driver || !identityIsCurrent() || !isActive()) return;
    changePendingActions(identityId, 1);
    const operation = state.queue.then(async () => {
      try {
        if (generation !== state.generation || tokenSequence !== state.tokenSequence || !state.desiredEnabled
          || state.cleanupPending || !identityIsCurrent() || !isActive()) return;
        if (state.enabled && state.acknowledgedToken === token) return;
        if (await driver.getPermissionStatus() !== 'granted'
          || generation !== state.generation || tokenSequence !== state.tokenSequence || !state.desiredEnabled
          || !identityIsCurrent() || !isActive()) return;
        // Storage and HTTP writes share one queue: an opt-out queued behind this
        // operation always becomes the final local and server state.
        await writeIntent(deviceId, 'enabled');
        if (generation !== state.generation || tokenSequence !== state.tokenSequence || !state.desiredEnabled
          || state.cleanupPending || !identityIsCurrent() || !isActive()) return;
        const result = await client.registerPushDevice({ deviceId, token, permission: 'granted' });
        if (result.ok && generation === state.generation && tokenSequence === state.tokenSequence
          && state.desiredEnabled && !state.cleanupPending && identityIsCurrent() && isActive()) {
          state.enabled = true;
          state.acknowledgedToken = token;
          await driver.acknowledgeToken?.(token, identityId, deviceId);
        }
      } finally {
        changePendingActions(identityId, -1);
      }
    });
    state.queue = operation.catch(() => undefined);
    await operation;
  };

  return {
    async register(): Promise<PushRegistrationResult> {
      if (!driver || driver.availability() !== 'available') return { status: 'unsupported' };
      const intentRevision = beginIdentityIntent(identityId);
      changePendingActions(identityId, 1);
      const isLatestIntent = () => isIdentityIntentCurrent(identityId, intentRevision);
      try {
        const permission = await driver.requestPermission();
        if (!identityIsCurrent() || !isLatestIntent()) return { status: 'failed', error: 'IDENTITY_CHANGED' };
        const deviceId = await driver.getDeviceId();
        if (!identityIsCurrent() || !isLatestIntent()) return { status: 'failed', error: 'IDENTITY_CHANGED' };
        if (!deviceId.trim()) return { status: 'failed', error: 'PUSH_DEVICE_UNAVAILABLE' };

        const state = stateFor(deviceId, identityId);
        const generation = ++state.generation;
        const tokenSequence = ++state.tokenSequence;
        if (permission !== 'granted') {
          state.hydrated = true;
          state.enabled = false;
          state.desiredEnabled = false;
          state.cleanupPending = true;
          await enqueueUnregister(deviceId, state, generation).operation;
          return { status: permission, permission };
        }

        state.desiredEnabled = true;
        state.cleanupPending = false;
        const token = await driver.getPushToken();
        if (!identityIsCurrent() || !isLatestIntent() || generation !== state.generation || tokenSequence !== state.tokenSequence) {
          return { status: 'failed', error: 'IDENTITY_CHANGED' };
        }
        if (!token?.trim()) return { status: 'failed', error: 'PUSH_TOKEN_UNAVAILABLE' };
        const currentPermission = await driver.getPermissionStatus();
        if (!identityIsCurrent() || !isLatestIntent() || generation !== state.generation || tokenSequence !== state.tokenSequence) {
          return { status: 'failed', error: 'IDENTITY_CHANGED' };
        }
        if (currentPermission !== 'granted') {
          state.generation += 1;
          state.desiredEnabled = false;
          state.cleanupPending = true;
          await enqueueUnregister(deviceId, state, state.generation).operation;
          return { status: 'failed', error: 'PUSH_PERMISSION_NOT_GRANTED' };
        }

        let result: WriteResult<void> | undefined;
        const operation = state.queue.then(async () => {
          if (!identityIsCurrent() || !isLatestIntent() || generation !== state.generation || tokenSequence !== state.tokenSequence) return;
          if (await driver.getPermissionStatus() !== 'granted'
            || !identityIsCurrent() || !isLatestIntent() || generation !== state.generation || tokenSequence !== state.tokenSequence) return;
          if (state.enabled && state.acknowledgedToken === token) {
            result = { ok: true, requestId: 'already-registered', data: undefined };
            return;
          }
          await writeIntent(deviceId, 'enabled');
          if (!identityIsCurrent() || !isLatestIntent() || generation !== state.generation || tokenSequence !== state.tokenSequence) return;
          result = await client.registerPushDevice({ deviceId, token, permission: 'granted' });
          if (result.ok && identityIsCurrent() && isLatestIntent() && generation === state.generation && tokenSequence === state.tokenSequence) {
            state.enabled = true;
            state.hydrated = true;
            state.acknowledgedToken = token;
            await driver.acknowledgeToken?.(token, identityId, deviceId);
          }
        });
        state.queue = operation.catch(() => undefined);
        await operation;
        if (!identityIsCurrent() || !isLatestIntent() || generation !== state.generation || tokenSequence !== state.tokenSequence) {
          return { status: 'failed', error: 'IDENTITY_CHANGED' };
        }
        if (!result) return { status: 'failed', error: 'PUSH_PERMISSION_NOT_GRANTED' };
        return result.ok
          ? { status: 'registered', deviceId, permission: 'granted' }
          : { status: 'failed', error: result.error.messageKey };
      } catch {
        return { status: 'failed', error: 'PUSH_REGISTRATION_FAILED' };
      } finally {
        changePendingActions(identityId, -1);
      }
    },

    async unregister(deviceId: string): Promise<WriteResult<void> | undefined> {
      if (!deviceId.trim() || !identityIsCurrent()) return undefined;
      beginIdentityIntent(identityId); // Invalidate permission/token work immediately.
      changePendingActions(identityId, 1);
      const state = stateFor(deviceId, identityId);
      const generation = ++state.generation;
      state.hydrated = true;
      state.enabled = false;
      state.desiredEnabled = false;
      state.cleanupPending = true;
      const cleanup = enqueueUnregister(deviceId, state, generation);
      try {
        await cleanup.operation;
        return cleanup.getResult();
      } finally {
        changePendingActions(identityId, -1);
      }
    },

    subscribe(): () => void {
      if (!driver || driver.availability() !== 'available') return () => undefined;
      let disposed = false;
      const hydration = driver.getDeviceId().then(async deviceId => {
        if (!deviceId.trim() || disposed || !identityIsCurrent() || !identityId || hasPendingAction(identityId)) return;
        const state = stateFor(deviceId, identityId);
        if (state.hydrated) return;
        const generation = state.generation;
        const persisted = await readIntent(deviceId);
        if (disposed || generation !== state.generation || hasPendingAction(identityId) || !identityIsCurrent()) return;
        const acknowledgedToken = await driver.getAcknowledgedToken?.(identityId, deviceId);
        if (disposed || generation !== state.generation || hasPendingAction(identityId) || !identityIsCurrent()) return;
        state.acknowledgedToken = acknowledgedToken;
        state.hydrated = true;
        state.desiredEnabled = persisted === 'enabled';
        state.enabled = persisted === 'enabled';
        state.cleanupPending = persisted === 'revoke-pending';
        if (persisted === 'revoke-pending') {
          await enqueueUnregister(deviceId, state, generation).operation;
          return;
        }
        if (persisted === 'enabled' && await driver.getPermissionStatus() !== 'granted'
          && generation === state.generation && identityIsCurrent()) {
          const revokeGeneration = ++state.generation;
          state.enabled = false;
          state.desiredEnabled = false;
          state.cleanupPending = true;
          await enqueueUnregister(deviceId, state, revokeGeneration).operation;
        }
      }).catch(() => undefined);

      const reconcileOnce = async (token?: string) => {
        if (disposed || !identityIsCurrent()) return;
        let deviceId: string;
        try { deviceId = await driver.getDeviceId(); } catch { return; }
        if (!deviceId.trim() || disposed || !identityIsCurrent()) return;
        const state = stateFor(deviceId, identityId);
        await hydration;
        if (disposed || !state.hydrated || !identityIsCurrent()) return;
        const generation = state.generation;
        if (state.cleanupPending) {
          await enqueueUnregister(deviceId, state, generation).operation;
          return;
        }
        if (!state.desiredEnabled) return;
        const tokenSequence = ++state.tokenSequence;
        const permission = await driver.getPermissionStatus();
        if (disposed || generation !== state.generation || tokenSequence !== state.tokenSequence || !identityIsCurrent()) return;
        if (permission !== 'granted') {
          const revokeGeneration = ++state.generation;
          state.enabled = false;
          state.desiredEnabled = false;
          state.cleanupPending = true;
          await enqueueUnregister(deviceId, state, revokeGeneration).operation;
          return;
        }
        let freshToken = token;
        if (!freshToken?.trim()) {
          try { freshToken = await driver.getPushToken(); } catch { return; }
        }
        if (!freshToken?.trim() || disposed || generation !== state.generation
          || tokenSequence !== state.tokenSequence || !state.desiredEnabled || !identityIsCurrent()) return;
        if (state.enabled && state.acknowledgedToken === freshToken) return;
        await queueRegister(deviceId, freshToken, state, generation, tokenSequence, () => !disposed);
      };

      // Foreground and token-change notifications share one serial reconciliation
      // path, so the same acknowledged token cannot trigger duplicate RPCs.
      let reconciliation = Promise.resolve();
      const reconcile = (token?: string) => {
        const operation = reconciliation.then(() => reconcileOnce(token));
        reconciliation = operation.catch(() => undefined);
        return operation;
      };

      const stopTokenRefresh = driver.onTokenRefresh(token => { void reconcile(token).catch(() => undefined); });
      const stopForeground = driver.onAppForeground?.(() => { void reconcile().catch(() => undefined); });
      const stopTap = driver.onNotificationTap(async eventId => {
        if (disposed || !identityIsCurrent() || !UUID.test(eventId)) return false;
        try { return await refreshInbox(eventId) !== false; } catch { return false; }
      }, identityId);
      void hydration;
      return () => { disposed = true; stopTokenRefresh(); stopForeground?.(); stopTap(); };
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
  onAppForeground: () => () => undefined,
  onNotificationTap: () => () => undefined,
};
