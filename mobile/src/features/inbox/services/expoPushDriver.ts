import { AppState, Platform } from 'react-native';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import type { NativePushDriver } from './nativePush';

const DEVICE_ID_KEY = 'gcd.push.device-id.v1';
const TOKEN_KEY = 'gcd.push.expo-token.v1';
const ANDROID_CHANNEL_ID = 'gcd-room-updates';

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
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
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
  const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
  return result.data;
}

/** Remote push is deliberately unavailable in Expo Go on Android. */
export const expoPushDriver: NativePushDriver = {
  availability: () => pushSetupIssue() ? 'unsupported' : 'available',
  async requestPermission() {
    if (!available()) return 'unknown';
    await ensureAndroidChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.status === 'granted') return 'granted';
    const requested = await Notifications.requestPermissionsAsync();
    return mapPermission(requested.status);
  },
  getDeviceId: stableDeviceId,
  async getPushToken() {
    if (!available()) return undefined;
    const token = await expoToken();
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return token;
  },
  onTokenRefresh(listener) {
    let active = true;
    let checking = false;
    const checkToken = async () => {
      if (!active || checking || !available()) return;
      checking = true;
      try {
        const [previous, latest] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), expoToken()]);
        if (!active || !previous || !latest || latest === previous) return;
        await SecureStore.setItemAsync(TOKEN_KEY, latest, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
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
    let lastResponseKey: string | undefined;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return;
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (key === lastResponseKey) return;
      lastResponseKey = key;
      listener();
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
    return () => { active = false; subscription.remove(); };
  },
};

export async function clearPushRegistrationSecrets(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(DEVICE_ID_KEY),
    SecureStore.deleteItemAsync(TOKEN_KEY),
  ]);
}

export function getPushDeviceId(): Promise<string | null> {
  return SecureStore.getItemAsync(DEVICE_ID_KEY);
}
