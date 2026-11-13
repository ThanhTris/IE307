import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusNotice } from '../../src/shared/ui/feedback/StatusNotice';
import { RequestBanner } from '../../src/shared/ui/feedback/RequestBanner';
import { ToastProvider } from '../../src/shared/ui/feedback/Toast';
import { NotificationProvider, useNotifications } from '../../src/shared/ui/feedback/NotificationBanner';
import { getThemeColors } from '../../src/shared/theme/tokens';

const colors = getThemeColors('light');
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}><ToastProvider><NotificationProvider>{node}</NotificationProvider></ToastProvider></SafeAreaProvider>);

test('an API error is a red toast; the retry button stays on the page', async () => {
  await wrap(<StatusNotice title="Chưa tải được bạn bè" tone="error" actionLabel="Thử lại" onAction={jest.fn()} colors={colors} />);
  expect(screen.getByTestId('toast-error')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen();
});

test('a page state (closed, empty, needs a step) is text on the page, never a toast', async () => {
  await wrap(<StatusNotice title="Phòng đã kết thúc" message="Bạn có thể tạo phòng khác." colors={colors} />);
  expect(screen.getByText('Phòng đã kết thúc')).toBeOnTheScreen();
  expect(screen.queryByTestId(/^toast-/)).toBeNull();
});

test('offline or a stale copy is an amber toast', async () => {
  await wrap(<RequestBanner state="offline" title="Đang ngoại tuyến" colors={colors} />);
  expect(screen.getByTestId('toast-warning')).toBeOnTheScreen();
});

function NotificationTrigger({ onOpen }: { onOpen: () => void }) {
  const notifications = useNotifications();
  return <>
    <Text onPress={() => notifications?.notify({ key: 'a', title: 'Lan', message: 'rủ bạn đi ăn', onPress: onOpen })}>gửi</Text>
    <Text onPress={() => notifications?.notify({ key: 'b', title: 'Minh', message: 'đã chấp nhận lời mời kết bạn của bạn' })}>gửi hai</Text>
  </>;
}

test('a notification from someone else is a banner, not a toast, and opens where it points', async () => {
  const open = jest.fn();
  await wrap(<NotificationTrigger onOpen={open} />);
  await fireEvent.press(screen.getByText('gửi'));
  expect(screen.queryByTestId(/^toast-/)).toBeNull();
  await fireEvent.press(screen.getByTestId('notification-banner'));
  expect(open).toHaveBeenCalledTimes(1);
});

test('the same notification key is not stacked twice and later ones queue behind the first', async () => {
  await wrap(<NotificationTrigger onOpen={jest.fn()} />);
  await fireEvent.press(screen.getByText('gửi'));
  await fireEvent.press(screen.getByText('gửi'));
  await fireEvent.press(screen.getByText('gửi hai'));
  expect(screen.getAllByTestId('notification-banner')).toHaveLength(1);
  expect(screen.getByText('+1')).toBeOnTheScreen();
});
