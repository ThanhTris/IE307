import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusNotice } from '../../src/shared/ui/feedback/StatusNotice';
import { RequestBanner } from '../../src/shared/ui/feedback/RequestBanner';
import { ToastProvider, useToast } from '../../src/shared/ui/feedback/Toast';
import { getThemeColors } from '../../src/shared/theme/tokens';

const colors = getThemeColors('light');
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const wrap = (node: React.ReactNode) => render(<SafeAreaProvider initialMetrics={metrics}><ToastProvider>{node}</ToastProvider></SafeAreaProvider>);

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
  const toast = useToast();
  return <Text onPress={() => toast?.show({ title: 'Lan mời bạn vào phòng', tone: 'notification', onPress: onOpen })}>gửi</Text>;
}

test('a notification from someone else has its own look and opens where it points', async () => {
  const open = jest.fn();
  await wrap(<NotificationTrigger onOpen={open} />);
  await fireEvent.press(screen.getByText('gửi'));
  await fireEvent.press(screen.getByTestId('toast-notification'));
  expect(open).toHaveBeenCalledTimes(1);
});
