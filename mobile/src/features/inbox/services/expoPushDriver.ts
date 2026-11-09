import { AppState, Platform } from 'react-native';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { NativePushDriver } from './nativePush';

export interface ExpoNotificationResponse {
  notification: {
    request: {
      identifier?: string;
      content: {
        data?: unknown;
      };
    };
  };
  actionIdentifier?: string;
}

interface ExpoNotificationsModule {
  setNotificationChannelAsync(
    channelId: string,
    channel: { name: string; importance: number; vibrationPattern?: number[] },
  ): Promise<unknown>;
  getPermissionsAsync(): Promise<{ granted?: boolean; status: string }>;
  requestPermissionsAsync(): Promise<{ granted?: boolean; status: string }>;
  getExpoPushTokenAsync(options: { projectId: string }): Promise<{ data: string }>;
  scheduleNotificationAsync(request: {
    content: { title: string; body: string; data?: Record<string, unknown> };
    trigger: { channelId: string } | null;
  }): Promise<string>;
  addNotificationResponseReceivedListener(
    listener: (response: ExpoNotificationResponse) => void,
  ): { remove(): void };
  getLastNotificationResponseAsync(): Promise<ExpoNotificationResponse | null>;
}

const DEVICE_ID_KEY = 'gcd.push.device-id.v1';
const TOKEN_KEY = 'gcd.push.expo-token.v1';
const ACKED_TOKEN_KEY = 'gcd.push.expo-token-acked.v1';
const ACKED_TOKEN_PREFIX = 'gcd.push.expo-token-acked.v2.';
const REGISTRATION_ENABLED_PREFIX = 'gcd.push.registration-enabled.v1.';
const CONSUMED_RESPONSES_PREFIX = 'gcd.push.consumed-responses.v2.';
const ANDROID_CHANNEL_ID = 'gcd-room-updates';
const simulatedTapListeners = new Set<(eventId: string) => Promise<boolean>>();
const consumedResponseKeys = new Set<string>();
const inFlightResponseKeys = new Set<string>();
let consumedResponseQueue: Promise<void> = Promise.resolve();
let notificationsModule: ExpoNotificationsModule | undefined;

function loadNotifications(): ExpoNotificationsModule {
  // Require lazily: Expo Go should not load the remote-push module at app startup.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  notificationsModule ??= require('expo-notifications') as ExpoNotificationsModule;
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
  if (isGm29QaPushEnabled()) return undefined;
  if (!projectId()) return 'eas-project-id-required';
  return undefined;
}

function isLoopbackQaApi(): boolean {
  try {
    const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '');
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)
      && ['54371', '54381'].includes(url.port);
  } catch {
    return false;
  }
}

/** Explicit development-only adapter; it cannot run against hosted APIs or in production bundles. */
export function isGm29QaPushEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_GM29_QA_PUSH === '1' && isLoopbackQaApi();
}

function ackedTokenKey(identityId: string, deviceId: string): string {
  return `${ACKED_TOKEN_PREFIX}${identityId}.${deviceId}`;
}

function consumedResponseStorageKey(identityId?: string): string {
  return `${CONSUMED_RESPONSES_PREFIX}${identityId ?? 'anonymous'}`;
}

function mapPermission(status: string): 'granted' | 'denied' | 'unknown' {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'unknown';
}

function isEventId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function notificationEventId(response: ExpoNotificationResponse): string | undefined {
  const data = response.notification.request.content.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  const eventId = (data as Record<string, unknown>).eventId;
  return isEventId(eventId) ? eventId : undefined;
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
    const value = await SecureStore.getItemAsync(`${REGISTRATION_ENABLED_PREFIX}${identityId}.${deviceId}`);
    return value === 'true' || value === 'enabled';
  },
  async setRegistrationEnabled(identityId, deviceId, enabled) {
    if (!identityId || !deviceId) return;
    const key = `${REGISTRATION_ENABLED_PREFIX}${identityId}.${deviceId}`;
    if (enabled) await SecureStore.setItemAsync(key, 'true', { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(key);
  },
  async getRegistrationIntent(identityId, deviceId) {
    if (!identityId || !deviceId) return 'disabled';
    const value = await SecureStore.getItemAsync(`${REGISTRATION_ENABLED_PREFIX}${identityId}.${deviceId}`);
    if (value === 'revoke-pending') return 'revoke-pending';
    if (value === 'enabled' || value === 'true') return 'enabled';
    return 'disabled';
  },
  async setRegistrationIntent(identityId, deviceId, intent) {
    if (!identityId || !deviceId) return;
    const key = `${REGISTRATION_ENABLED_PREFIX}${identityId}.${deviceId}`;
    if (intent === 'disabled') await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, intent, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  },
  async getPushToken() {
    if (!available()) return undefined;
    return expoToken();
  },
  async getAcknowledgedToken(identityId, deviceId) {
    if (!identityId || !deviceId) return undefined;
    return (await SecureStore.getItemAsync(ackedTokenKey(identityId, deviceId))) ?? undefined;
  },
  async acknowledgeToken(token, identityId, deviceId) {
    if (identityId && deviceId) {
      await SecureStore.setItemAsync(ackedTokenKey(identityId, deviceId), token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    // Retain the old key only as a migration marker; registration decisions use
    // the identity-and-device-scoped acknowledgement above.
    await SecureStore.deleteItemAsync(ACKED_TOKEN_KEY).catch(() => undefined);
  },
  async clearAcknowledgedToken(identityId, deviceId) {
    if (identityId && deviceId) await SecureStore.deleteItemAsync(ackedTokenKey(identityId, deviceId));
  },
  simulateNotificationTap(eventId) {
    if (!isGm29QaPushEnabled() || !isEventId(eventId)) return false;
    for (const listener of simulatedTapListeners) void listener(eventId);
    return simulatedTapListeners.size > 0;
  },
  async scheduleSimulatedNotification(eventId) {
    if (!isGm29QaPushEnabled() || !isEventId(eventId) || Platform.OS !== 'android') return false;
    try {
      await ensureAndroidChannel();
      const notifications = loadNotifications();
      const permission = await notifications.getPermissionsAsync();
      if (!permission.granted && permission.status !== 'granted') return false;
      await notifications.scheduleNotificationAsync({
        content: {
          title: 'Kiểm thử · Có thông báo mới',
          body: 'Chạm để tải lại nội dung có quyền từ máy chủ.',
          data: { eventId, qaSimulated: true },
        },
        trigger: { channelId: ANDROID_CHANNEL_ID },
      });
      return true;
    } catch {
      return false;
    }
  },
  onTokenRefresh(listener) {
    let active = true;
    let checking = false;
    const checkToken = async () => {
      if (!active || checking || !available()) return;
      checking = true;
      try {
        const [previous, latest] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), expoToken()]);
        if (!active || !latest || latest === previous) return;
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
  onAppForeground(listener) {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') listener();
    });
    return () => subscription.remove();
  },
  onNotificationTap(listener, identityId) {
    let active = true;
    let subscription: { remove(): void } | undefined;
    const identityResponseKey = (eventId: string) => `${identityId ?? 'anonymous'}:${eventId}`;
    const handleEvent = async (eventId: string): Promise<boolean> => {
      const key = identityResponseKey(eventId);
      if (!active || !isEventId(eventId) || consumedResponseKeys.has(key) || inFlightResponseKeys.has(key)) return false;
      inFlightResponseKeys.add(key);
      let handled = false;
      consumedResponseQueue = consumedResponseQueue.then(async () => {
        if (!active || consumedResponseKeys.has(key)) return;
        const stored = await SecureStore.getItemAsync(consumedResponseStorageKey(identityId)).catch(() => null);
        let keys: string[] = [];
        try { const parsed = stored ? JSON.parse(stored) : []; if (Array.isArray(parsed)) keys = parsed.filter((value): value is string => typeof value === 'string'); } catch { /* ignore malformed cache */ }
        if (keys.includes(eventId)) { consumedResponseKeys.add(key); handled = true; return; }
        try { handled = (await listener(eventId)) !== false; } catch { handled = false; }
        if (!handled) return;
        consumedResponseKeys.add(key);
        keys.push(eventId);
        await SecureStore.setItemAsync(consumedResponseStorageKey(identityId), JSON.stringify(keys.slice(-100)), {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }).catch(() => undefined);
      }).catch(() => undefined);
      try {
        await consumedResponseQueue;
        return handled;
      } finally {
        inFlightResponseKeys.delete(key);
      }
    };
    const handle = (response: ExpoNotificationResponse | null) => {
      if (!active || !response) return;
      const eventId = notificationEventId(response);
      if (eventId) void handleEvent(eventId);
    };
    if (!available()) return () => { active = false; };
    simulatedTapListeners.add(handleEvent);
    try {
      const notifications = loadNotifications();
      subscription = notifications.addNotificationResponseReceivedListener(handle);
      void notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
    } catch {
      // A missing native module leaves the app's canonical inbox available.
    }
    return () => { active = false; simulatedTapListeners.delete(handleEvent); subscription?.remove(); };
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

/** Local notifications + synthetic token; remote Expo delivery is never invoked. */
export const gm29LocalQaPushDriver: NativePushDriver = {
  ...expoPushDriver,
  availability: () => isGm29QaPushEnabled() && available() ? 'available' : 'unsupported',
  async getPushToken() {
    if (!isGm29QaPushEnabled() || !available()) return undefined;
    // The disposable QA API validates Expo token shape. This is a synthetic,
    // non-issued token and cannot receive delivery from Expo.
    return `ExponentPushToken[GM29_QA_${await stableDeviceId()}]`;
  },
  onTokenRefresh: () => () => undefined,
  simulateNotificationTap(eventId) {
    if (!isGm29QaPushEnabled() || !isEventId(eventId)) return false;
    for (const listener of simulatedTapListeners) void listener(eventId);
    return simulatedTapListeners.size > 0;
  },
};

export function getActivePushDriver(): NativePushDriver {
  return isGm29QaPushEnabled() ? gm29LocalQaPushDriver : expoPushDriver;
}
