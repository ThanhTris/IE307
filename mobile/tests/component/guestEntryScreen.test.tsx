import { act } from 'react';
import { BackHandler } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GuestEntryScreen } from '../../src/features/home/screens/GuestEntryScreen';
import type { HomeLiveSession } from '../../src/features/home/screens/HomeScreen';

const guestLabel = 'Tham gia với tư cách khách';
const idleSession = (): HomeLiveSession => ({
  status: 'empty', issue: 'no-session', user: null, isInitializing: false,
  ensureSession: jest.fn().mockResolvedValue(true), restoreSession: jest.fn().mockResolvedValue(true), logout: jest.fn().mockResolvedValue(true),
});
async function openName() { await fireEvent.press(screen.getByRole('button', { name: guestLabel })); }

test('opening welcome and account placeholders never creates a guest; guest entry stays available', async () => {
  const onContinue = jest.fn().mockResolvedValue(true);
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={jest.fn()} />);
  expect(screen.queryByText(/Mô phỏng/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng ký' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục với khách' }));
  expect(screen.getByLabelText('Tên khách')).toBeOnTheScreen();
  expect(onContinue).not.toHaveBeenCalled();
});

test.each(['', '   ', 'a'.repeat(25)])('invalid name %p never starts a session', async name => {
  const onContinue = jest.fn().mockResolvedValue(true);
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={jest.fn()} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), name);
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(screen.getByText('Tên cần từ 1 đến 24 ký tự.')).toBeOnTheScreen();
  expect(onContinue).not.toHaveBeenCalled();
});

test('trimmed Unicode name is submitted once and remains locked after acceptance', async () => {
  const onContinue = jest.fn().mockResolvedValue(true);
  const onComplete = jest.fn();
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={onComplete} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), `  ${'🍜'.repeat(24)}  `);
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  expect(onContinue).toHaveBeenCalledWith('🍜'.repeat(24));
  expect(screen.getByRole('button', { name: 'Đã tiếp tục' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Đã tiếp tục' }));
  expect(onContinue).toHaveBeenCalledTimes(1);
});

test('pending submission locks input, button and hardware Back, including repeated presses', async () => {
  let resolve!: (value: boolean) => void;
  const onContinue = jest.fn(() => new Promise<boolean>(done => { resolve = done; }));
  const onComplete = jest.fn();
  const listener = jest.spyOn(BackHandler, 'addEventListener');
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={onComplete} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  const button = screen.getByRole('button', { name: 'Tiếp tục' });
  await fireEvent.press(button);
  await fireEvent.press(button);
  expect(screen.getByLabelText('Tên khách')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Quay lại' })).toBeDisabled();
  expect(listener.mock.calls.at(-1)![1]({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
  expect(onContinue).toHaveBeenCalledTimes(1);
  await act(async () => resolve(true));
  expect(onComplete).toHaveBeenCalledTimes(1);
  listener.mockRestore();
});

test('failure keeps the name for explicit retry and Back does not submit', async () => {
  const onContinue = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(true);
  const onComplete = jest.fn();
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={onComplete} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(await screen.findByText('Không kết nối được máy chủ')).toBeOnTheScreen();
  expect(screen.getByLabelText('Tên khách').props.value).toBe('Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(onContinue).toHaveBeenCalledTimes(1);
  await openName();
  expect(screen.getByLabelText('Tên khách').props.value).toBe('Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  expect(onContinue).toHaveBeenCalledTimes(2);
});

test('a server error stays clean on first failure, then offers report help after 2 consecutive failures', async () => {
  const onContinue = jest.fn()
    .mockResolvedValueOnce({ messageKey: 'NETWORK_ERROR' })
    .mockResolvedValueOnce({ messageKey: 'NETWORK_ERROR' })
    .mockResolvedValue(true);
  const onComplete = jest.fn();
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={onComplete} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(await screen.findByText('Không kết nối được máy chủ')).toBeOnTheScreen();
  expect(screen.queryByTestId('error-recovery')).toBeNull();
  expect(screen.queryByText(/phiên cục bộ/i)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' }));
  expect(screen.getByRole('header', { name: 'Báo lỗi' })).toBeOnTheScreen();
  expect(screen.getByText('Mã lỗi: NETWORK_ERROR · Chạm để sao chép')).toBeOnTheScreen();
  expect(screen.getByRole('radio', { name: 'Gửi trong app (nên dùng)' })).toBeChecked();
  expect(screen.getByRole('button', { name: 'Gửi báo lỗi' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: 'Gửi email cho quản trị viên' }));
  expect(screen.getByRole('button', { name: 'Mở email để gửi' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Gửi báo lỗi' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Đóng báo lỗi' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
});

test('a name the server rejects is an input mistake: shown at the field, nothing to report', async () => {
  await render(<GuestEntryScreen onContinue={jest.fn().mockResolvedValue({ messageKey: 'INVALID_INPUT' })} onComplete={jest.fn()} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(await screen.findByText('Máy chủ không nhận tên này. Thử một tên khác.')).toBeOnTheScreen();
  expect(screen.queryByTestId('error-recovery')).toBeNull();
});

test('a response after unmount never navigates', async () => {
  let resolve!: (value: boolean) => void;
  const onComplete = jest.fn();
  const result = await render(<GuestEntryScreen onContinue={() => new Promise<boolean>(done => { resolve = done; })} onComplete={onComplete} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await result.unmount();
  await act(async () => resolve(true));
  expect(onComplete).not.toHaveBeenCalled();
});

test.each([
  ['restore-unavailable', 'Thử lại'], ['session-recovery-required', 'Thử lại'],
  ['session-revoked', 'Bắt đầu lại'], ['storage-unavailable', 'Bắt đầu lại'],
] as const)('session issue %s blocks a replacement guest and offers one clean next step without help clutter', async (issue, action) => {
  const session = { ...idleSession(), status: 'lost' as const, issue };
  const onContinue = jest.fn();
  await render(<GuestEntryScreen session={session} onContinue={onContinue} onComplete={jest.fn()} />);
  expect(screen.getByRole('button', { name: guestLabel })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: action }));
  expect(action === 'Thử lại' ? session.restoreSession : session.logout).toHaveBeenCalledTimes(1);
  expect(onContinue).not.toHaveBeenCalled();
});

test('after an unknown signup result, only an explicit retry drops it and creates the guest again', async () => {
  const session = idleSession();
  const onContinue = jest.fn().mockResolvedValueOnce({ messageKey: 'TIMEOUT' }).mockResolvedValue(true);
  const props = { session, onContinue, onComplete: jest.fn() };
  const result = await render(<GuestEntryScreen {...props} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await result.rerender(<GuestEntryScreen {...props} session={{ ...session, status: 'blocked', issue: 'signup-uncertain' }} />);
  expect(screen.getByText('Máy chủ phản hồi quá lâu')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeNull();
  expect(screen.getByLabelText('Tên khách').props.value).toBe('Minh');
  expect(session.logout).not.toHaveBeenCalled();
  expect(onContinue).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(2));
  expect(session.logout).toHaveBeenCalledTimes(1);
});

test('restoring a saved session disables guest entry without auto signup', async () => {
  const session = { ...idleSession(), isInitializing: true };
  const onContinue = jest.fn();
  await render(<GuestEntryScreen session={session} onContinue={onContinue} onComplete={jest.fn()} />);
  expect(screen.getByText('Đang mở lại tài khoản…')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: guestLabel })).toBeDisabled();
  expect(onContinue).not.toHaveBeenCalled();
});

test('failed session recovery stays visible on welcome and reveals help pill on 2nd failure', async () => {
  const session = { ...idleSession(), status: 'lost' as const, issue: 'restore-unavailable' as const, restoreSession: jest.fn().mockRejectedValue(new Error('offline')) };
  const onContinue = jest.fn();
  await render(<GuestEntryScreen session={session} onContinue={onContinue} onComplete={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Vẫn chưa được')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('button', { name: 'Báo lỗi hoặc cần trợ giúp' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: guestLabel })).toBeDisabled();
  expect(onContinue).not.toHaveBeenCalled();
});

test('a rejected signup never claims a session expired, because none exists yet', async () => {
  const onContinue = jest.fn().mockResolvedValue({ messageKey: 'AUTH_REQUIRED' });
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={jest.fn()} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(await screen.findByText('Chưa tạo được phiên khách')).toBeOnTheScreen();
  expect(screen.queryByText(/hết hạn/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen();
});
