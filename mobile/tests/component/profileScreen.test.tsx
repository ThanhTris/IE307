import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import ProfileRoute from '../../src/app/profile';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import { ProfileScreen } from '../../src/features/account/screens/ProfileScreen';

jest.mock('expo-router', () => ({ Redirect: jest.fn(() => null), useRouter: () => ({}) }));
jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: jest.fn() }));

const guest = { id: 'fixture-guest', displayName: 'Minh', isGuest: true, createdAt: '2026-11-16T00:00:00Z' };

test('guest profile opens the live sign-in and link-email routes', async () => {
  const navigate = jest.fn();
  await render(<ProfileScreen user={guest} onNavigate={navigate} onHome={jest.fn()} onLogout={jest.fn()} />);
  expect(screen.getByText('M', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByText('Giữ bạn bè và lịch sử khi đổi máy.')).toBeOnTheScreen();
  expect(screen.getByText('Bạn vẫn có thể tạo hoặc tham gia phòng với tư cách khách.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Liên kết email' }));
  expect(navigate.mock.calls).toEqual([['/account/sign-in'], ['/account/link']]);
});

test('logout sheet offers Stay and Logout without a redundant Close button', async () => {
  const logout = jest.fn().mockResolvedValue(true);
  await render(<ProfileScreen user={{ ...guest, isGuest: false }} onNavigate={jest.fn()} onHome={jest.fn()} onLogout={logout} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  expect(screen.getByText('Đăng xuất?')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Ở lại' }));
  expect(screen.queryByText('Đăng xuất?')).toBeNull();
  expect(logout).not.toHaveBeenCalled();
});

test('profile skips the no-session screen during logout and redirects after cleanup', async () => {
  let finishLogout!: (ok: boolean) => void;
  const logout = jest.fn(() => new Promise<boolean>(resolve => { finishLogout = resolve; }));
  const useSession = jest.mocked(useRoomRepository);
  type SessionContext = ReturnType<typeof useRoomRepository>;
  const active: SessionContext = {
    repository: {} as SessionContext['repository'], status: 'active', issue: 'none', mode: 'real',
    user: { ...guest, isGuest: false }, isInitializing: false, logout, restoreSession: jest.fn(), ensureSession: jest.fn(),
  };
  useSession.mockReturnValue(active);
  const view = await render(<ProfileRoute />);
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
  await fireEvent.press(screen.getAllByRole('button', { name: 'Đăng xuất' }).at(-1)!);
  expect(logout).toHaveBeenCalledTimes(1);

  useSession.mockReturnValue({ ...active, status: 'blocked', user: null, issue: 'no-session' });
  await view.rerender(<ProfileRoute />);
  expect(screen.queryByText('Chưa có phiên')).toBeNull();
  expect(Redirect).not.toHaveBeenCalled();

  useSession.mockReturnValue({ ...active, status: 'empty', user: null, issue: 'no-session' });
  await act(async () => { finishLogout(true); });
  expect(jest.mocked(Redirect).mock.lastCall?.[0]).toMatchObject({ href: '/welcome' });
  expect(screen.queryByText('Chưa có phiên')).toBeNull();
});
