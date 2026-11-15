import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PermissionsWelcomeScreen } from '../../src/features/permissions/screens/PermissionsWelcomeScreen';
import { NotificationPermissionNudge } from '../../src/features/permissions/components/NotificationPermissionNudge';
import type { PermissionKind, PermissionOutcome, PermissionService, RawPermission } from '../../src/features/permissions/services/appPermissions';
import { ToastProvider } from '../../src/shared/ui/feedback/Toast';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}><ToastProvider>{node}</ToastProvider></SafeAreaProvider>);

function fakeService(status: Partial<Record<PermissionKind, RawPermission>>, outcome: Partial<Record<PermissionKind, PermissionOutcome>> = {}) {
  const ensured: PermissionKind[] = [];
  const service: PermissionService = {
    status: async kind => status[kind] ?? 'undetermined',
    ensure: async kind => { ensured.push(kind); return outcome[kind] ?? 'granted'; },
    openSettings: jest.fn(async () => undefined),
  };
  return { service, ensured };
}

test('the first-run screen asks for notifications, camera and location in turn', async () => {
  const { service, ensured } = fakeService({});
  const done = jest.fn();
  await wrap(<PermissionsWelcomeScreen service={service} onDone={done} />);
  expect(screen.getByText('Thông báo')).toBeOnTheScreen();
  expect(screen.getByText('Camera')).toBeOnTheScreen();
  expect(screen.getByText('Vị trí')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Cho phép' }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(ensured).toEqual(['notifications', 'camera', 'location']);
});

test('skipping asks for nothing and still continues', async () => {
  const { service, ensured } = fakeService({});
  const done = jest.fn();
  await wrap(<PermissionsWelcomeScreen service={service} onDone={done} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Để sau' }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(ensured).toEqual([]);
});

test('keeping the meal history is off until ticked and is saved on the account when ticked', async () => {
  const { service } = fakeService({});
  const save = jest.fn(async () => true);
  const done = jest.fn();
  await wrap(<PermissionsWelcomeScreen service={service} history={{ save }} onDone={done} />);
  const box = screen.getByRole('checkbox', { name: 'Lưu lịch sử bữa ăn của tôi' });
  expect(box.props.accessibilityState.checked).toBe(false);
  await fireEvent.press(box);
  await fireEvent.press(screen.getByRole('button', { name: 'Để sau' }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(save).toHaveBeenCalledWith(true);
});

test('history is not saved when the box stays unticked', async () => {
  const { service } = fakeService({});
  const save = jest.fn(async () => true);
  const done = jest.fn();
  await wrap(<PermissionsWelcomeScreen service={service} history={{ save }} onDone={done} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Để sau' }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  expect(save).not.toHaveBeenCalled();
});

test('a refused notification permission shows a reminder; a second refusal points to Settings', async () => {
  const { service } = fakeService({ notifications: 'denied' }, { notifications: 'blocked' });
  await wrap(<NotificationPermissionNudge service={service} />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Bật thông báo' }));
  const settings = await screen.findByRole('button', { name: 'Mở Cài đặt' });
  await fireEvent.press(settings);
  expect(service.openSettings).toHaveBeenCalledTimes(1);
});

test('no reminder when notifications are allowed or cannot be given on this build', async () => {
  const allowed = fakeService({ notifications: 'granted' });
  const first = await wrap(<NotificationPermissionNudge service={allowed.service} />);
  await waitFor(() => expect(screen.queryByText('Thông báo đang tắt')).toBeNull());
  first.unmount();
  const unavailable = fakeService({ notifications: 'unavailable' });
  await wrap(<NotificationPermissionNudge service={unavailable.service} />);
  await waitFor(() => expect(screen.queryByText('Thông báo đang tắt')).toBeNull());
});
