import Constants, { AppOwnership } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { expoPushDriver } from '../../src/features/inbox/services/expoPushDriver';

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
    expect(mockSecure.get('gcd.push.expo-token.v1')).toBe('ExponentPushToken[redacted]');
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
