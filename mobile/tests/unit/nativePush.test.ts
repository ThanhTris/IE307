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
      client: { registerPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
    });

    expect(await service.register()).toEqual({ status: 'unsupported' });
    expect(registerPushDevice).not.toHaveBeenCalled();
  });

  test('denied permission remains inbox-capable and never registers a token', async () => {
    const registerPushDevice = jest.fn();
    const service = createNativePushService({
      driver: driver({ requestPermission: async () => 'denied' }),
      client: { registerPushDevice } as unknown as ApiClient,
      refreshInbox: jest.fn(),
    });

    expect(await service.register()).toEqual({ status: 'denied', permission: 'denied' });
    expect(registerPushDevice).not.toHaveBeenCalled();
  });

  test('registers granted device and refreshes server inbox on tap without reading payload', async () => {
    const registerPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const unregisterPushDevice = jest.fn().mockResolvedValue({ ok: true, data: undefined });
    const refreshInbox = jest.fn().mockResolvedValue(undefined);
    let tap: (() => void) | undefined;
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
    tap?.();
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
      client: { registerPushDevice, unregisterPushDevice: jest.fn() } as unknown as ApiClient,
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
});
