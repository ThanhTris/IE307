import * as Notifications from 'expo-notifications';
import { configureLocalNotifications, scheduleLocalNotification } from '../src/features/bootstrap/services/localNotifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(), setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(), scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));
const sdk = jest.mocked(Notifications);
const permission = (granted: boolean, canAskAgain = true) => ({ granted, canAskAgain }) as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;

describe('local notifications spike (mocked SDK, not remote push)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    sdk.setNotificationChannelAsync.mockResolvedValue(null);
    sdk.getPermissionsAsync.mockResolvedValue(permission(true));
    sdk.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    sdk.scheduleNotificationAsync.mockResolvedValue('gm02-local-spike');
  });
  test('sets foreground handler separately, without asking permission', async () => {
    await configureLocalNotifications();
    expect(sdk.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(sdk.requestPermissionsAsync).not.toHaveBeenCalled();
  });
  test('creates channel before permission, schedules neutral local payload', async () => {
    expect(await scheduleLocalNotification()).toBe('scheduled');
    expect(sdk.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(sdk.getPermissionsAsync.mock.invocationCallOrder[0]!);
    expect(sdk.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(sdk.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: 'gm02-local-spike',
      content: expect.objectContaining({ data: { spike: 'gm02-local' } }),
      trigger: { type: 'timeInterval', seconds: 3, channelId: 'gm02-spike' },
    }));
  });
  test('asks only on explicit action when permission can be requested', async () => {
    sdk.getPermissionsAsync.mockResolvedValue(permission(false));
    sdk.requestPermissionsAsync.mockResolvedValue(permission(true));
    expect(await scheduleLocalNotification()).toBe('scheduled');
    expect(sdk.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
  test.each([true, false])('deny does not schedule; canAskAgain=%s', async (canAskAgain) => {
    sdk.getPermissionsAsync.mockResolvedValue(permission(false, canAskAgain));
    sdk.requestPermissionsAsync.mockResolvedValue(permission(false, false));
    expect(await scheduleLocalNotification()).toBe('denied');
    expect(sdk.requestPermissionsAsync).toHaveBeenCalledTimes(canAskAgain ? 1 : 0);
    expect(sdk.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
  test('native error does not become a success status', async () => {
    sdk.scheduleNotificationAsync.mockRejectedValue(new Error('native error'));
    await expect(scheduleLocalNotification()).rejects.toThrow('native error');
  });
});
