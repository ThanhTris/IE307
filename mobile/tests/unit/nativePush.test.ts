import type { ApiClient } from '../../src/data/api/contracts';
import { createNativePushService, type NativePushDriver } from '../../src/features/inbox/services/nativePush';

function driver(overrides: Partial<NativePushDriver> = {}): NativePushDriver {
  return {
    availability: () => 'available',
    requestPermission: async () => 'granted',
    getPermissionStatus: async () => 'granted',
    getDeviceId: async () => 'device-1',
    getPushToken: async () => 'ExponentPushToken[test-redacted]',
    onTokenRefresh: () => () => undefined,
    onNotificationTap: () => () => undefined,
    ...overrides,
  };
}

describe('GM-29 push orchestration', () => {
  test('does not register when the native capability is unavailable', async () => {
    const registerPushDevice = jest.fn();
    const service = createNativePushService({
      driver: driver({ availability: () => 'unsupported' }),
      client: { registerPushDevice, unregisterPushDevice: jest.fn().mockResolvedValue({ ok: true, data: undefined }) } as unknown as ApiClient,
      refreshInbox: jest.fn(),
    });

    expect(await service.register()).toEqual({ status: 'unsupported' });
    expect(registerPushDevice).not.toHaveBeenCalled();
  });

  test('denied permission remains inbox-capable and never registers a token', async () => {
    const registerPushDevice = jest.fn();
    const service = createNativePushService({
      driver: driver({ requestPermission: async () => 'denied' }),
      client: { registerPushDevice, unregisterPushDevice: jest.fn().mockResolvedValue({ ok: true, data: undefined }) } as unknown as ApiClient,
      refreshInbox: jest.fn(),
    });

    expect(await service.register()).toEqual({ status: 'denied', permission: 'denied' });
    expect(registerPushDevice).not.toHaveBeenCalled();
  });

  test('registers granted device and refreshes server inbox on tap without reading payload', async () => {
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const unregisterPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const refreshInbox = jest.fn().mockResolvedValue(undefined);
    let tap: ((eventId: string) => void) | undefined;
    let refreshToken: ((token: string) => void) | undefined;
    const service = createNativePushService({
      driver: driver({
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
        onNotificationTap: listener => { tap = listener; return () => { tap = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice } as unknown as ApiClient,
      refreshInbox,
    });

    expect(await service.register()).toEqual({ status: 'registered', deviceId: 'device-1', permission: 'granted' });
    expect(registerPushDevice).toHaveBeenCalledWith({ deviceId: 'device-1', token: 'ExponentPushToken[test-redacted]', permission: 'granted' });
    service.subscribe();
    expect(tap).toBeDefined();
    const tappedEventId = '11111111-1111-4111-8111-111111111111';
    tap?.(tappedEventId);
    expect(refreshInbox).toHaveBeenCalledWith(tappedEventId);
    expect(refreshInbox).toHaveBeenCalledTimes(1);
    refreshToken?.('ExponentPushToken[rotated-redacted]');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenLastCalledWith({ deviceId: 'device-1', token: 'ExponentPushToken[rotated-redacted]', permission: 'granted' });
    await service.unregister('device-1');
    expect(unregisterPushDevice).toHaveBeenCalledWith('device-1');
  });

  test('does not register a refreshed token when permission was denied', async () => {
    let refreshToken: ((token: string) => void) | undefined;
    const registerPushDevice = jest.fn();
    const service = createNativePushService({
      driver: driver({
        requestPermission: async () => 'denied',
        getPermissionStatus: async () => 'denied',
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice: jest.fn().mockResolvedValue({ ok: true, data: undefined }) } as unknown as ApiClient,
      refreshInbox: jest.fn(),
    });
    expect(await service.register()).toEqual({ status: 'denied', permission: 'denied' });
    const unsubscribe = service.subscribe();
    refreshToken?.('token-after-deny');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('rechecks OS permission after grant and skips rotation after permission is revoked', async () => {
    let permission: 'granted' | 'denied' = 'granted';
    let refreshToken: ((token: string) => void) | undefined;
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const service = createNativePushService({
      driver: driver({
        getPermissionStatus: async () => permission,
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice: jest.fn() } as unknown as ApiClient,
      refreshInbox: jest.fn(),
    });
    await service.register();
    const unsubscribe = service.subscribe();
    permission = 'denied';
    refreshToken?.('token-after-revoke');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('pending refresh is invalidated by unsubscribe and serialized unregister', async () => {
    let resolveRefreshDevice: ((id: string) => void) | undefined;
    let getDeviceCall = 0;
    let refreshToken: ((token: string) => void) | undefined;
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const unregisterPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const service = createNativePushService({
      driver: driver({
        getDeviceId: () => ++getDeviceCall === 1 ? Promise.resolve('device-1') : new Promise(resolve => { resolveRefreshDevice = resolve; }),
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
    });
    await service.register();
    const unsubscribe = service.subscribe();
    refreshToken?.('late-token');
    unsubscribe();
    await service.unregister('device-1');
    resolveRefreshDevice?.('device-1');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(1);
    expect(unregisterPushDevice).toHaveBeenCalledWith('device-1');
  });

  test('pending token refresh from identity A cannot register after switching to B', async () => {
    let resolveDevice: ((id: string) => void) | undefined;
    let getDeviceCall = 0;
    let refreshToken: ((token: string) => void) | undefined;
    let active = true;
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const service = createNativePushService({
      driver: driver({
        getDeviceId: () => ++getDeviceCall === 1 ? Promise.resolve('device-1') : new Promise(resolve => { resolveDevice = resolve; }),
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice: jest.fn() } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      isIdentityCurrent: () => active,
    });
    await service.register();
    service.subscribe();
    refreshToken?.('late-token');
    active = false;
    resolveDevice?.('device-1');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(1);
  });

  test('does not register when identity changes while permission is being checked', async () => {
    let resolvePermission: ((permission: 'granted') => void) | undefined;
    let active = true;
    const registerPushDevice = jest.fn();
    const service = createNativePushService({
      driver: driver({ requestPermission: () => new Promise(resolve => { resolvePermission = resolve; }) }),
      client: { registerPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      isIdentityCurrent: () => active,
    });
    const pending = service.register();
    active = false;
    resolvePermission?.('granted');
    expect(await pending).toEqual({ status: 'failed', error: 'IDENTITY_CHANGED' });
    expect(registerPushDevice).not.toHaveBeenCalled();
  });

  test('foreground token refresh retries a server registration failure', async () => {
    let intent: 'enabled' | 'disabled' | 'revoke-pending' = 'disabled';
    const registerPushDevice = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    let refreshToken: ((token: string) => void) | undefined;
    const service = createNativePushService({
      driver: driver({
        getRegistrationIntent: async () => intent,
        setRegistrationIntent: async (_identity, _device, next) => { intent = next; },
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice: jest.fn() } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId: 'foreground-failed-registration-user',
    });
    expect(await service.register()).toEqual({ status: 'failed', error: 'NETWORK_ERROR' });
    service.subscribe();
    refreshToken?.('foreground-token');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(2);
    expect(registerPushDevice).toHaveBeenLastCalledWith({ deviceId: 'device-1', token: 'foreground-token', permission: 'granted' });
  });

  test('ignores a pending notification tap after switching from identity A to B', () => {
    let tap: ((eventId: string) => void) | undefined;
    let active = true;
    const refreshInbox = jest.fn();
    const service = createNativePushService({
      driver: driver({ onNotificationTap: listener => { tap = listener; return () => { tap = undefined; }; } }),
      client: { registerPushDevice: jest.fn(), unregisterPushDevice: jest.fn() } as unknown as ApiClient,
      refreshInbox,
      isIdentityCurrent: () => active,
    });
    service.subscribe();
    active = false;
    tap?.('22222222-2222-4222-8222-222222222222');
    expect(refreshInbox).not.toHaveBeenCalled();
  });

  test('does not re-register an acknowledged token, rotates a changed token once, and leaves opt-out disabled', async () => {
    const registrationMarkers = new Map<string, 'enabled' | 'disabled' | 'revoke-pending'>();
    const acknowledgedTokens = new Map<string, string>();
    const refreshListeners = new Set<(token: string) => void>();
    const registrationKey = (identityId: string, deviceId: string) => `${identityId}:${deviceId}`;
    let currentToken = 'token-before-restart';
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const unregisterPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const persistentDriver = driver({
      getPushToken: async () => currentToken,
      getRegistrationIntent: async (identityId, deviceId) => registrationMarkers.get(registrationKey(identityId, deviceId)) ?? 'disabled',
      setRegistrationIntent: async (identityId, deviceId, intent) => { registrationMarkers.set(registrationKey(identityId, deviceId), intent); },
      getAcknowledgedToken: async (identityId, deviceId) => acknowledgedTokens.get(registrationKey(identityId, deviceId)),
      acknowledgeToken: async (token, identityId = 'user-A', deviceId = 'device-1') => { acknowledgedTokens.set(registrationKey(identityId, deviceId), token); },
      clearAcknowledgedToken: async (identityId, deviceId) => { acknowledgedTokens.delete(registrationKey(identityId, deviceId)); },
      onTokenRefresh: listener => { refreshListeners.add(listener); return () => { refreshListeners.delete(listener); }; },
    });
    const emitRefresh = (token: string) => { for (const listener of refreshListeners) listener(token); };
    const identityId = 'rotation-and-optout-user';
    const firstSession = createNativePushService({
      driver: persistentDriver,
      client: { registerPushDevice, unregisterPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId,
    });
    await firstSession.register();
    expect(registrationMarkers.get(registrationKey(identityId, 'device-1'))).toBe('enabled');
    expect(registerPushDevice).toHaveBeenCalledTimes(1);

    const stopFirstSession = firstSession.subscribe();
    stopFirstSession();
    const restartedService = createNativePushService({
      driver: persistentDriver,
      client: { registerPushDevice, unregisterPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId,
    });
    const stopRestartedService = restartedService.subscribe();
    emitRefresh(currentToken);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(1);

    currentToken = 'token-after-rotation';
    emitRefresh(currentToken);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(2);
    expect(acknowledgedTokens.get(registrationKey(identityId, 'device-1'))).toBe(currentToken);

    await restartedService.unregister('device-1');
    expect(registrationMarkers.get(registrationKey(identityId, 'device-1'))).toBe('disabled');
    emitRefresh('token-after-opt-out');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(2);
    stopRestartedService();
  });

  test('a late opt-in write cannot undo opt-out when unregister is offline', async () => {
    const registrationMarkers = new Map<string, boolean>();
    let writes = 0;
    let releaseLateEnable: (() => void) | undefined;
    let refreshToken: ((token: string) => void) | undefined;
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const unregisterPushDevice = jest.fn().mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    const service = createNativePushService({
      driver: driver({
        getRegistrationEnabled: async identityId => registrationMarkers.get(identityId) ?? false,
        setRegistrationEnabled: async (identityId, _deviceId, enabled) => {
          writes += 1;
          if (enabled && writes === 2) await new Promise<void>(resolve => { releaseLateEnable = resolve; });
          registrationMarkers.set(identityId, enabled);
        },
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId: 'user-A',
    });

    await service.register();
    const unsubscribe = service.subscribe();
    refreshToken?.('rotated-token');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(releaseLateEnable).toBeDefined();

    const disabling = service.unregister('device-1');
    releaseLateEnable?.();
    await disabling;
    expect(unregisterPushDevice).toHaveBeenCalledWith('device-1');
    expect(registrationMarkers.get('user-A')).toBe(false);

    refreshToken?.('retry-after-offline-opt-out');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('an in-flight token refresh cannot revive opt-in after a confirmed disable', async () => {
    const intents = new Map<string, 'enabled' | 'disabled' | 'revoke-pending'>();
    let enabledWrites = 0;
    let releaseRefreshWrite: (() => void) | undefined;
    let refreshToken: ((token: string) => void) | undefined;
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const unregisterPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const deviceId = 'optout-race-device';
    const identityId = 'optout-race-user';
    const service = createNativePushService({
      driver: driver({
        getDeviceId: async () => deviceId,
        getRegistrationIntent: async owner => intents.get(owner) ?? 'disabled',
        setRegistrationIntent: async (owner, _device, intent) => {
          if (intent === 'enabled' && ++enabledWrites === 2) {
            await new Promise<void>(resolve => { releaseRefreshWrite = resolve; });
          }
          intents.set(owner, intent);
        },
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId,
    });
    await service.register();
    const unsubscribe = service.subscribe();
    refreshToken?.('token-refresh-in-flight');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(releaseRefreshWrite).toBeDefined();

    const disabling = service.unregister(deviceId);
    releaseRefreshWrite?.();
    expect(await disabling).toMatchObject({ ok: true });
    expect(intents.get(identityId)).toBe('disabled');
    expect(registerPushDevice).toHaveBeenCalledTimes(1);
    expect(unregisterPushDevice).toHaveBeenCalledTimes(1);

    refreshToken?.('token-after-disable');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('offline revoke stays journaled and app foreground retries it without registering', async () => {
    const intents = new Map<string, 'enabled' | 'disabled' | 'revoke-pending'>();
    let foreground: (() => void) | undefined;
    let unregisterCount = 0;
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const unregisterPushDevice = jest.fn(async () => {
      unregisterCount += 1;
      return unregisterCount === 1
        ? { ok: false, error: { messageKey: 'NETWORK_ERROR' } }
        : { ok: true, data: undefined };
    });
    const deviceId = 'offline-revoke-device';
    const identityId = 'offline-revoke-user';
    const persistentDriver = driver({
      getDeviceId: async () => deviceId,
      getRegistrationIntent: async owner => intents.get(owner) ?? 'disabled',
      setRegistrationIntent: async (owner, _device, intent) => { intents.set(owner, intent); },
      onAppForeground: listener => { foreground = listener; return () => { foreground = undefined; }; },
    });
    const service = createNativePushService({
      driver: persistentDriver,
      client: { registerPushDevice, unregisterPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId,
    });
    await service.register();
    expect(await service.unregister(deviceId)).toMatchObject({ ok: false });
    expect(intents.get(identityId)).toBe('revoke-pending');
    service.subscribe();
    foreground?.();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(unregisterPushDevice).toHaveBeenCalledTimes(2);
    expect(intents.get(identityId)).toBe('disabled');
    expect(registerPushDevice).toHaveBeenCalledTimes(1);
  });

  test('a token arriving while SecureStore writes opt-out cannot restore stale enabled state', async () => {
    const intents = new Map<string, 'enabled' | 'disabled' | 'revoke-pending'>([['optout-storage-race-user', 'enabled']]);
    let releaseOptOut: (() => void) | undefined;
    let refreshToken: ((token: string) => void) | undefined;
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const deviceId = 'optout-storage-race-device';
    const identityId = 'optout-storage-race-user';
    const service = createNativePushService({
      driver: driver({
        getDeviceId: async () => deviceId,
        getRegistrationIntent: async owner => intents.get(owner) ?? 'disabled',
        setRegistrationIntent: async (owner, _device, intent) => {
          if (intent === 'disabled') await new Promise<void>(resolve => { releaseOptOut = resolve; });
          intents.set(owner, intent);
        },
        onTokenRefresh: listener => { refreshToken = listener; return () => { refreshToken = undefined; }; },
      }),
      client: {
        registerPushDevice,
        unregisterPushDevice: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId,
    });

    const unsubscribe = service.subscribe();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(intents.get(identityId)).toBe('enabled');
    const disabling = service.unregister(deviceId);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(releaseOptOut).toBeDefined();
    refreshToken?.('token-during-opt-out-write');
    await new Promise(resolve => setTimeout(resolve, 0));
    releaseOptOut?.();
    expect(await disabling).toMatchObject({ ok: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(intents.get(identityId)).toBe('disabled');
    expect(registerPushDevice).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('foreground retries a failed upsert even when the Expo token did not change', async () => {
    let intent: 'enabled' | 'disabled' | 'revoke-pending' = 'disabled';
    let foreground: (() => void) | undefined;
    const registerPushDevice = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    const service = createNativePushService({
      driver: driver({
        getRegistrationIntent: async () => intent,
        setRegistrationIntent: async (_identity, _device, next) => { intent = next; },
        onAppForeground: listener => { foreground = listener; return () => { foreground = undefined; }; },
      }),
      client: { registerPushDevice, unregisterPushDevice: jest.fn() } as unknown as ApiClient,
      refreshInbox: jest.fn(),
      identityId: 'foreground-retry-user',
    });
    await service.register();
    service.subscribe();
    foreground?.();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(registerPushDevice).toHaveBeenCalledTimes(2);
    expect(registerPushDevice).toHaveBeenLastCalledWith({ deviceId: 'device-1', token: 'ExponentPushToken[test-redacted]', permission: 'granted' });
  });
});
