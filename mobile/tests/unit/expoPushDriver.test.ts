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
  scheduleNotificationAsync: jest.fn(async () => 'qa-local-notification'),
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
    process.env.EXPO_PUBLIC_GM29_QA_PUSH = '1';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54381';
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
    delete process.env.EXPO_PUBLIC_GM29_QA_PUSH;
    const deviceId = await expoPushDriver.getDeviceId();
    expect(deviceId).toMatch(/^gcd-/);
    expect(await expoPushDriver.getDeviceId()).toBe(deviceId);
    expect(await expoPushDriver.getPushToken()).toBe('ExponentPushToken[redacted]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas-project-1' });
    expect(mockSecure.has('gcd.push.expo-token.v1')).toBe(false);
    await expoPushDriver.acknowledgeToken?.('ExponentPushToken[redacted]', 'qa-user', deviceId);
    expect(mockSecure.get('gcd.push.expo-token.v1')).toBe('ExponentPushToken[redacted]');
    expect(mockSecure.get(`gcd.push.expo-token-acked.v2.qa-user.${deviceId}`)).toBe('ExponentPushToken[redacted]');
  });

  test('does not mark a changed token registered before server acknowledgment', async () => {
    const tokenListener = jest.fn();
    const deviceId = await expoPushDriver.getDeviceId();
    const stop = expoPushDriver.onTokenRefresh(tokenListener);
    mockState.appState?.('active');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(tokenListener).toHaveBeenCalledWith('ExponentPushToken[redacted]');
    expect(mockSecure.has('gcd.push.expo-token-acked.v1')).toBe(false);
    await expoPushDriver.acknowledgeToken?.('ExponentPushToken[redacted]', 'qa-user', deviceId);
    expect(mockSecure.get(`gcd.push.expo-token-acked.v2.qa-user.${deviceId}`)).toBe('ExponentPushToken[redacted]');
    stop();
  });

  test('keeps registration pending after server failure and acknowledges only a successful retry', async () => {
    const acknowledgeToken = jest.fn(async () => undefined);
    const driver = {
      availability: () => 'available' as const,
      requestPermission: async () => 'granted' as const,
      getPermissionStatus: async () => 'granted' as const,
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
    expect(acknowledgeToken).toHaveBeenCalledWith('token-1', undefined, 'device-1');
    expect(registerPushDevice).toHaveBeenCalledTimes(2);
  });

  test('notification tap refetch callback is invoked without consuming payload', async () => {
    const listener = jest.fn();
    const eventId = '11111111-1111-4111-8111-111111111111';
    const response = { notification: { request: { identifier: 'notice-1', content: { data: { eventId, roomId: 'untrusted' } } } }, actionIdentifier: 'default' };
    mockState.lastResponse = response;
    const stop = expoPushDriver.onNotificationTap(listener);
    await Promise.resolve();
    mockState.tap?.(response);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalledWith(eventId);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
  });

  test('QA local notification stores only an event reference and can be tapped on Android', async () => {
    mockState.permission = 'granted';
    const eventId = '22222222-2222-4222-8222-222222222222';
    expect(await expoPushDriver.scheduleSimulatedNotification?.(eventId)).toBe(true);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ data: { eventId, qaSimulated: true } }),
      trigger: { channelId: 'gcd-room-updates' },
    }));
    mockState.permission = 'denied';
    expect(await expoPushDriver.scheduleSimulatedNotification?.(eventId)).toBe(false);
  });

  test('dev simulated taps deduplicate the same event and listener cleanup stops future taps', async () => {
    const listener = jest.fn();
    const stop = expoPushDriver.onNotificationTap(listener);
    const eventA = '33333333-3333-4333-8333-333333333333';
    const eventB = '44444444-4444-4444-8444-444444444444';
    expect(expoPushDriver.simulateNotificationTap?.(eventA)).toBe(true);
    expect(expoPushDriver.simulateNotificationTap?.(eventA)).toBe(true);
    expect(expoPushDriver.simulateNotificationTap?.(eventB)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, eventA);
    expect(listener).toHaveBeenNthCalledWith(2, eventB);
    stop();
    expect(expoPushDriver.simulateNotificationTap?.('55555555-5555-4555-8555-555555555555')).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('does not persist a transient tap failure and allows retry of the same eventId', async () => {
    let attempts = 0;
    const listener = jest.fn(async () => ++attempts > 1);
    const eventId = '77777777-7777-4777-8777-777777777777';
    const stop = expoPushDriver.onNotificationTap(listener, 'qa-retry-user');

    expect(expoPushDriver.simulateNotificationTap?.(eventId)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalledTimes(1);

    expect(expoPushDriver.simulateNotificationTap?.(eventId)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(mockSecure.get('gcd.push.consumed-responses.v2.qa-retry-user')).toContain(eventId);
    stop();
  });

  test('does not reprocess the same saved OS response after switching subscriptions', async () => {
    const listenerA = jest.fn();
    const eventId = '66666666-6666-4666-8666-666666666666';
    const response = { notification: { request: { identifier: 'account-switch-notice', content: { data: { eventId } } } }, actionIdentifier: 'default' };
    mockState.lastResponse = response;
    const stopA = expoPushDriver.onNotificationTap(listenerA);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listenerA).toHaveBeenCalledTimes(1);
    stopA();

    const listenerB = jest.fn();
    const stopB = expoPushDriver.onNotificationTap(listenerB);
    await new Promise(resolve => setTimeout(resolve, 0));
    mockState.tap?.(response);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(listenerB).not.toHaveBeenCalled();
    stopB();
  });
});
