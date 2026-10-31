import { act } from 'react';
import { BackHandler } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GuestEntryScreen } from '../../src/features/home/screens/GuestEntryScreen';
import type { HomeLiveSession } from '../../src/features/home/screens/Gm25HomeScreen';

const guestLabel = 'Tham gia với tư cách khách';
const idleSession = (): HomeLiveSession => ({
  status: 'empty', issue: 'no-session', user: null, isInitializing: false,
  ensureSession: jest.fn().mockResolvedValue(true), restoreSession: jest.fn().mockResolvedValue(true), logout: jest.fn().mockResolvedValue(true),
});
async function openName() { await fireEvent.press(screen.getByRole('button', { name: guestLabel })); }

test('opening welcome and account placeholders never creates a guest; guest entry stays available', async () => {
  const onContinue = jest.fn().mockResolvedValue(true);
  await render(<GuestEntryScreen onContinue={onContinue} onComplete={jest.fn()} isMock />);
  expect(screen.getByText('Mô phỏng · GM-09 · dữ liệu mẫu')).toBeOnTheScreen();
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
  expect(await screen.findByText('Chưa thể tiếp tục. Kiểm tra kết nối rồi thử lại.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Tên khách').props.value).toBe('Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(onContinue).toHaveBeenCalledTimes(1);
  await openName();
  expect(screen.getByLabelText('Tên khách').props.value).toBe('Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  expect(onContinue).toHaveBeenCalledTimes(2);
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

test.each(['restore-unavailable', 'session-recovery-required', 'signup-uncertain', 'session-revoked', 'storage-unavailable'] as const)('session issue %s blocks replacement signup', async issue => {
  const session = { ...idleSession(), status: issue === 'signup-uncertain' ? 'blocked' as const : 'lost' as const, issue };
  const onContinue = jest.fn();
  await render(<GuestEntryScreen session={session} onContinue={onContinue} onComplete={jest.fn()} />);
  expect(screen.getByRole('button', { name: guestLabel })).toBeDisabled();
  const restore = issue === 'restore-unavailable' || issue === 'session-recovery-required';
  await fireEvent.press(screen.getByRole('button', { name: restore ? 'Thử khôi phục phiên' : 'Xóa phiên cục bộ rồi thử lại' }));
  expect(restore ? session.restoreSession : session.logout).toHaveBeenCalledTimes(1);
  expect(onContinue).not.toHaveBeenCalled();
});

test('uncertain result in the form blocks another signup until explicit session reset', async () => {
  const session = idleSession();
  const onContinue = jest.fn().mockResolvedValue(false);
  const props = { session, onContinue, onComplete: jest.fn() };
  const result = await render(<GuestEntryScreen {...props} />);
  await openName();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), 'Minh');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await result.rerender(<GuestEntryScreen {...props} session={{ ...session, status: 'blocked', issue: 'signup-uncertain' }} />);
  expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  expect(screen.getByLabelText('Tên khách').props.value).toBe('Minh');
  expect(onContinue).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa phiên cục bộ rồi thử lại' }));
  expect(session.logout).toHaveBeenCalledTimes(1);
  await result.rerender(<GuestEntryScreen {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  expect(onContinue).toHaveBeenCalledTimes(2);
});

test('restoring a saved session disables guest entry without auto signup', async () => {
  const session = { ...idleSession(), isInitializing: true };
  const onContinue = jest.fn();
  await render(<GuestEntryScreen session={session} onContinue={onContinue} onComplete={jest.fn()} />);
  expect(screen.getByText('Đang khôi phục phiên…')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: guestLabel })).toBeDisabled();
  expect(onContinue).not.toHaveBeenCalled();
});

test('failed session recovery remains visible on welcome and never creates a replacement guest', async () => {
  const session = { ...idleSession(), status: 'lost' as const, issue: 'restore-unavailable' as const, restoreSession: jest.fn().mockRejectedValue(new Error('offline')) };
  const onContinue = jest.fn();
  await render(<GuestEntryScreen session={session} onContinue={onContinue} onComplete={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Thử khôi phục phiên' }));
  expect(await screen.findByText('Chưa xử lý được phiên. Kiểm tra kết nối rồi thử lại.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: guestLabel })).toBeDisabled();
  expect(onContinue).not.toHaveBeenCalled();
});
