import Constants, { AppOwnership } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { expoPushDriver } from '../../src/features/inbox/services/expoPushDriver';
import { createNativePushService } from '../../src/features/inbox/services/nativePush';

const mockState: { appState?: (state: string) => void; tap?: (response: unknown) => void; lastResponse: unknown; permission: string; expoToken: string } = {
  lastResponse: null,
  permission: 'undetermined',
  expoToken: 'ExponentPushToken[redacted]',
};
const mockSecure = new Map<string, string>();
const mockCalls: string[] = [];

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
    mockState.appState = listener;
    return { remove: jest.fn() };
  }) },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', appOwnership: null, easConfig: { projectId: 'eas-project-1' } },
  AppOwnership: { Expo: 'expo' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: jest.fn(async () => { mockCalls.push('channel'); }),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockState.permission === 'granted', status: mockState.permission })),
  requestPermissionsAsync: jest.fn(async () => { mockCalls.push('permission'); return { granted: mockState.permission === 'granted', status: mockState.permission }; }),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: mockState.expoToken })),
  addNotificationResponseReceivedListener: jest.fn((listener: (response: unknown) => void) => {
    mockState.tap = listener;
    return { remove: jest.fn() };
  }),
  getLastNotificationResponseAsync: jest.fn(async () => mockState.lastResponse),
}));
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockSecure.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockSecure.delete(key); }),
}));

describe('GM-29 Expo native push driver', () => {
  beforeEach(() => {
    mockState.appState = undefined;
    mockState.tap = undefined;
    mockState.lastResponse = null;
    mockState.permission = 'undetermined';
    mockState.expoToken = 'ExponentPushToken[redacted]';
    mockSecure.clear();
    mockCalls.length = 0;
    (Constants as unknown as { executionEnvironment: string; appOwnership: string | null }).executionEnvironment = 'standalone';
    (Constants as unknown as { appOwnership: string | null }).appOwnership = null;
  });

  test('guards remote push in Expo Go and requests Android channel before permission', async () => {
    (Constants as unknown as { executionEnvironment: string }).executionEnvironment = 'storeClient';
    (Constants as unknown as { appOwnership: string }).appOwnership = AppOwnership.Expo;
    expect(expoPushDriver.availability()).toBe('unsupported');

    (Constants as unknown as { executionEnvironment: string }).executionEnvironment = 'standalone';
    (Constants as unknown as { appOwnership: string | null }).appOwnership = null;
    mockState.permission = 'undetermined';
    expect(await expoPushDriver.requestPermission()).toBe('unknown');
    expect(mockCalls).toEqual(['channel', 'permission']);
  });

  test('requires EAS project attribution and persists no raw token in logs', async () => {
    const deviceId = await expoPushDriver.getDeviceId();
    expect(deviceId).toMatch(/^gcd-/);
    expect(await expoPushDriver.getDeviceId()).toBe(deviceId);
    expect(await expoPushDriver.getPushToken()).toBe('ExponentPushToken[redacted]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas-project-1' });
    expect(mockSecure.has('gcd.push.expo-token.v1')).toBe(false);
    await expoPushDriver.acknowledgeToken?.('ExponentPushToken[redacted]');
    expect(mockSecure.get('gcd.push.expo-token.v1')).toBe('ExponentPushToken[redacted]');
  });

  test('does not mark a changed token registered before server acknowledgment', async () => {
    const tokenListener = jest.fn();
    const stop = expoPushDriver.onTokenRefresh(tokenListener);
    mockState.appState?.('active');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(tokenListener).toHaveBeenCalledWith('ExponentPushToken[redacted]');
    expect(mockSecure.has('gcd.push.expo-token-acked.v1')).toBe(false);
    await expoPushDriver.acknowledgeToken?.('ExponentPushToken[redacted]');
    expect(mockSecure.get('gcd.push.expo-token-acked.v1')).toBe('ExponentPushToken[redacted]');
    stop();
  });

  test('keeps registration pending after server failure and acknowledges only a successful retry', async () => {
    const acknowledgeToken = jest.fn(async () => undefined);
    const driver = {
      availability: () => 'available' as const,
      requestPermission: async () => 'granted' as const,
      getDeviceId: async () => 'device-1',
      getPushToken: async () => 'token-1',
      acknowledgeToken,
      onTokenRefresh: () => () => undefined,
      onNotificationTap: () => () => undefined,
    };
    const registerPushDevice = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    const service = createNativePushService({
      driver, client: { registerPushDevice, unregisterPushDevice: jest.fn() } as any, refreshInbox: async () => undefined,
    });
    expect(await service.register()).toMatchObject({ status: 'failed' });
    expect(acknowledgeToken).not.toHaveBeenCalled();
    expect(await service.register()).toMatchObject({ status: 'registered' });
    expect(acknowledgeToken).toHaveBeenCalledWith('token-1');
    expect(registerPushDevice).toHaveBeenCalledTimes(2);
  });

  test('notification tap refetch callback is invoked without consuming payload', async () => {
    const listener = jest.fn();
    const response = { notification: { request: { identifier: 'notice-1', content: { data: { roomId: 'untrusted' } } } }, actionIdentifier: 'default' };
    mockState.lastResponse = response;
    const stop = expoPushDriver.onNotificationTap(listener);
    await Promise.resolve();
    mockState.tap?.(response);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });
});
