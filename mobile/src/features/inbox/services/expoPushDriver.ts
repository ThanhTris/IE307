import { AppState, Platform } from 'react-native';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { NativePushDriver } from './nativePush';
import type * as ExpoNotifications from 'expo-notifications';

const DEVICE_ID_KEY = 'gcd.push.device-id.v1';
const TOKEN_KEY = 'gcd.push.expo-token.v1';
const ACKED_TOKEN_KEY = 'gcd.push.expo-token-acked.v1';
const REGISTRATION_ENABLED_PREFIX = 'gcd.push.registration-enabled.v1.';
const CONSUMED_RESPONSES_KEY = 'gcd.push.consumed-responses.v1';
const ANDROID_CHANNEL_ID = 'gcd-room-updates';
const simulatedTapListeners = new Set<(eventKey: string) => void>();
const consumedResponseKeys = new Set<string>();
let consumedResponseQueue: Promise<void> = Promise.resolve();
let simulatedResponseSequence = 0;
let notificationsModule: typeof ExpoNotifications | undefined;

function loadNotifications(): typeof ExpoNotifications {
  // Require lazily: Expo Go should not load the remote-push module at app startup.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  notificationsModule ??= require('expo-notifications') as typeof ExpoNotifications;
  return notificationsModule;
}

function projectId(): string | undefined {
  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ?? Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId;
}

function available(): boolean {
  if (Platform.OS !== 'android') return false;
  return !(Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    && Constants.appOwnership === AppOwnership.Expo);
}

export function pushSetupIssue(): 'android-build-required' | 'eas-project-id-required' | undefined {
  if (!available()) return 'android-build-required';
  if (!projectId()) return 'eas-project-id-required';
  return undefined;
}

function mapPermission(status: string): 'granted' | 'denied' | 'unknown' {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'unknown';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const notifications = await loadNotifications();
  await notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Cập nhật phòng',
    importance: 3,
    vibrationPattern: [0, 180, 100, 180],
  });
}

async function stableDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const randomPart = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  const created = `gcd-${randomPart()}-${randomPart()}-${Date.now().toString(16)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return created;
}

async function expoToken(): Promise<string> {
  const id = projectId();
  if (!id) throw new Error('EAS_PROJECT_ID_MISSING');
  const notifications = await loadNotifications();
  const result = await notifications.getExpoPushTokenAsync({ projectId: id });
  return result.data;
}

/** Remote push is deliberately unavailable in Expo Go on Android. */
export const expoPushDriver: NativePushDriver = {
  availability: () => pushSetupIssue() ? 'unsupported' : 'available',
  async requestPermission() {
    if (!available()) return 'unknown';
    await ensureAndroidChannel();
    const notifications = await loadNotifications();
    const current = await notifications.getPermissionsAsync();
    if (current.granted || current.status === 'granted') return 'granted';
    const requested = await notifications.requestPermissionsAsync();
    return mapPermission(requested.status);
  },
  async getPermissionStatus() {
    if (!available()) return 'unknown';
    const notifications = await loadNotifications();
    const current = await notifications.getPermissionsAsync();
    return current.granted || current.status === 'granted' ? 'granted'
      : current.status === 'denied' ? 'denied' : 'unknown';
  },
  getDeviceId: stableDeviceId,
  async getRegistrationEnabled(identityId, deviceId) {
    if (!identityId || !deviceId) return false;
    return await SecureStore.getItemAsync(`${REGISTRATION_ENABLED_PREFIX}${identityId}.${deviceId}`) === 'true';
  },
  async setRegistrationEnabled(identityId, deviceId, enabled) {
    if (!identityId || !deviceId) return;
    const key = `${REGISTRATION_ENABLED_PREFIX}${identityId}.${deviceId}`;
    if (enabled) await SecureStore.setItemAsync(key, 'true', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(key);
  },
  async getPushToken() {
    if (!available()) return undefined;
    return expoToken();
  },
  async acknowledgeToken(token) {
    await SecureStore.setItemAsync(ACKED_TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  simulateNotificationTap() {
    if (!__DEV__) return false;
    const key = `dev-simulated-notice:${Date.now()}:${++simulatedResponseSequence}`;
    for (const listener of simulatedTapListeners) listener(key);
    return simulatedTapListeners.size > 0;
  },
  onTokenRefresh(listener) {
    let active = true;
    let checking = false;
    const checkToken = async () => {
      if (!active || checking || !available()) return;
      checking = true;
      try {
        const [acknowledged, latest] = await Promise.all([SecureStore.getItemAsync(ACKED_TOKEN_KEY), expoToken()]);
        if (!active || !latest || latest === acknowledged) return;
        if (active) listener(latest);
      } catch {
        // A foreground token refresh can be retried next time the app resumes.
      } finally {
        checking = false;
      }
    };
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void checkToken();
    });
    return () => { active = false; subscription.remove(); };
  },
  onNotificationTap(listener) {
    let active = true;
    let subscription: { remove(): void } | undefined;
    const handleKey = (key: string) => {
      if (!active || consumedResponseKeys.has(key)) return;
      consumedResponseQueue = consumedResponseQueue.then(async () => {
        if (!active || consumedResponseKeys.has(key)) return;
        const stored = await SecureStore.getItemAsync(CONSUMED_RESPONSES_KEY).catch(() => null);
        let keys: string[] = [];
        try { const parsed = stored ? JSON.parse(stored) : []; if (Array.isArray(parsed)) keys = parsed.filter((value): value is string => typeof value === 'string'); } catch { /* ignore malformed cache */ }
        if (keys.includes(key)) { consumedResponseKeys.add(key); return; }
        consumedResponseKeys.add(key);
        keys.push(key);
        await SecureStore.setItemAsync(CONSUMED_RESPONSES_KEY, JSON.stringify(keys.slice(-100)), {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }).catch(() => undefined);
        if (active) listener();
      }).catch(() => undefined);
    };
    const handle = (response: ExpoNotifications.NotificationResponse | null) => {
      if (!active || !response) return;
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      handleKey(key);
    };
    if (!available()) return () => { active = false; };
    try {
      const notifications = loadNotifications();
      simulatedTapListeners.add(handleKey);
      subscription = notifications.addNotificationResponseReceivedListener(handle);
      void notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
    } catch {
      // A missing native module leaves the app's canonical inbox available.
    }
    return () => { active = false; simulatedTapListeners.delete(handleKey); subscription?.remove(); };
  },
};

export async function clearPushRegistrationSecrets(): Promise<void> {
  // Device and token values are preserved on failed unregister; callers invoke
  // this only after server ACK. Identity markers are disabled by the service.
  await Promise.all([
    SecureStore.deleteItemAsync(DEVICE_ID_KEY),
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(ACKED_TOKEN_KEY),
  ]);
}

export function getPushDeviceId(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}
