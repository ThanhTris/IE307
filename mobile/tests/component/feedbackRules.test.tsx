import { act, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusNotice } from '../../src/shared/ui/feedback/StatusNotice';
import { FailureNotice } from '../../src/shared/ui/feedback/FailureNotice';
import { RequestBanner } from '../../src/shared/ui/feedback/RequestBanner';
import { SheetDialog } from '../../src/shared/ui/dialogs/SheetDialog';
import { ToastNotice, ToastProvider, useToast } from '../../src/shared/ui/feedback/Toast';
import { NotificationProvider, useNotifications } from '../../src/shared/ui/feedback/NotificationBanner';
import { HelpProvider } from '../../src/features/support/HelpProvider';
import { incidentFor } from '../../src/shared/errors/failure';
import { clearIncident, setIncident } from '../../src/shared/errors/incident';
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

test('FailureNotice floats via Toast with zero inline layout element and closes cleanly', async () => {
  clearIncident();
  setIncident(incidentFor({ code: 'ROOM_TERMINAL', title: 'Chủ phòng đã hủy phòng' }, 'home', 'room/lobby'));
  await wrap(<HelpProvider segments={['']}><FailureNotice destination="home" colors={colors} /></HelpProvider>);
  expect(screen.queryByTestId('failure-callout')).toBeNull();
  expect(screen.getByTestId('toast-info')).toBeOnTheScreen();
  expect(screen.getByText('Chủ phòng đã hủy phòng')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng thông báo' }));
  await waitFor(() => expect(screen.queryByTestId('toast-info')).toBeNull());
});

test('FailureNotice attaches Báo lỗi action inside the floating Toast for unexpected exits', async () => {
  clearIncident();
  setIncident(incidentFor({ code: 'ROOM_NOT_FOUND' }, 'home', 'room/lobby'));
  await wrap(<HelpProvider segments={['']}><FailureNotice destination="home" colors={colors} /></HelpProvider>);
  expect(screen.queryByTestId('failure-callout')).toBeNull();
  expect(screen.getByTestId('toast-error')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeOnTheScreen();
});

test('the reason for being moved stays for 8 seconds, longer than an ordinary toast', async () => {
  jest.useFakeTimers();
  try {
    clearIncident();
    setIncident(incidentFor({ code: 'ROOM_TERMINAL', title: 'Chủ phòng đã hủy phòng' }, 'home', 'room/lobby'));
    await wrap(<HelpProvider segments={['']}><FailureNotice destination="home" colors={colors} /></HelpProvider>);
    await act(async () => { jest.advanceTimersByTime(7500); });
    expect(screen.getByText('Chủ phòng đã hủy phòng')).toBeOnTheScreen();
    await act(async () => { jest.advanceTimersByTime(1500); });
    expect(screen.queryByText('Chủ phòng đã hủy phòng')).toBeNull();
  } finally { jest.useRealTimers(); }
});

function UpgradeToastHarness({ onHelp }: { onHelp: () => void }) {
  const [count, setCount] = useState(1);
  return <>
    <ToastNotice
      title="Không kết nối được máy chủ"
      message="Kiểm tra mạng rồi thử lại."
      tone="error"
      triggerKey={count}
      actionLabel={count >= 2 ? 'Báo lỗi' : undefined}
      actionAccessibilityLabel="Báo lỗi hoặc cần trợ giúp"
      onAction={onHelp}
    />
    <Text onPress={() => setCount(c => c + 1)}>retry-again</Text>
  </>;
}

test('ToastProvider upgrades an active Toast in-place on 2nd failure with Báo lỗi chip without stacking', async () => {
  const onHelp = jest.fn();
  await wrap(<UpgradeToastHarness onHelp={onHelp} />);
  expect(screen.getAllByTestId('toast-error')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeNull();
  await fireEvent.press(screen.getByText('retry-again'));
  expect(screen.getAllByTestId('toast-error')).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' }));
  expect(onHelp).toHaveBeenCalledTimes(1);
});

function ClosedModalToastHarness() {
  const [open, setOpen] = useState(true);
  const toast = useToast();
  return <>
    <SheetDialog visible={open} title="Xác nhận rời phòng?" onClose={() => setOpen(false)} colors={colors}>
      <Text onPress={() => {
        setOpen(false);
        toast?.show({ title: 'Không kết nối được máy chủ', message: 'Thử lại sau.', tone: 'error' });
      }}>leave-fail</Text>
    </SheetDialog>
  </>;
}

test('closing a SheetDialog does not leave a ghost ToastHost stealing root toasts (leave-503)', async () => {
  await wrap(<ClosedModalToastHarness />);
  await fireEvent.press(screen.getByText('leave-fail'));
  await waitFor(() => expect(screen.getByTestId('toast-error')).toBeOnTheScreen());
  expect(screen.getByText('Không kết nối được máy chủ')).toBeOnTheScreen();
});
