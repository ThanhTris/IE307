export type LocalNotificationResult = 'scheduled' | 'denied';

async function loadNotifications(): Promise<typeof import('expo-notifications')> {
  // Expo Go on Android SDK 53+ throws while loading expo-notifications.
  // Keep this import lazy so the rest of the UI can still run in Expo Go.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as typeof import('expo-notifications');
}

export async function configureLocalNotifications(): Promise<void> {
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleLocalNotification(): Promise<LocalNotificationResult> {
  const Notifications = await loadNotifications();
  // Android 13 permission prompt needs a notification channel first.
  await Notifications.setNotificationChannelAsync('gm02-spike', {
    name: 'GM-02 thử thông báo cục bộ',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'denied';
  // Repeated taps replace one scheduled spike instead of filling the tray.
  await Notifications.cancelScheduledNotificationAsync('gm02-local-spike');
  await Notifications.scheduleNotificationAsync({
    identifier: 'gm02-local-spike',
    content: {
      title: 'GM-02 · Kiểm tra cục bộ',
      body: 'Thông báo từ thiết bị. Chưa kiểm push từ server.',
      data: { spike: 'gm02-local' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: 'gm02-spike',
    },
  });
  return 'scheduled';
}
