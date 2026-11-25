import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import ProfileRoute from '../../src/app/profile';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import { ProfileScreen } from '../../src/features/account/screens/ProfileScreen';
import { ProfileSettings } from '../../src/features/account/components/ProfileSettings';
import { AppPreferencesProvider } from '../../src/shared/lib/AppPreferences';
import { HelpProvider } from '../../src/features/support/HelpProvider';
import { clearLastFailure, recordLastFailure } from '../../src/shared/errors/incident';
import { lightColors } from '../../src/shared/theme/tokens';

jest.mock('expo-router', () => ({ Redirect: jest.fn(() => null), useRouter: () => ({}) }));
jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null), setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const guest = { id: 'fixture-guest', displayName: 'Minh', isGuest: true, createdAt: '2026-11-16T00:00:00Z' };

test('guest profile opens the live sign-in and link-email routes', async () => {
  const navigate = jest.fn();
  await render(<ProfileScreen user={guest} onNavigate={navigate} onHome={jest.fn()} onLogout={jest.fn()} />);
  expect(screen.getByText('M', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Khách' })).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Minh' })).toBeOnTheScreen();
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
  expect(screen.getByText('Bạn có thể tiếp tục sử dụng ứng dụng với tài khoản khách')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Ở lại' }));
  expect(screen.queryByText('Đăng xuất?')).toBeNull();
  expect(logout).not.toHaveBeenCalled();
});

test('guest can change and save appearance and font size without account settings', async () => {
  await render(<AppPreferencesProvider>
    <ProfileScreen user={guest} onNavigate={jest.fn()} onHome={jest.fn()} onLogout={jest.fn()} />
  </AppPreferencesProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Giao diện' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Tối' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cỡ chữ' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Lớn' }));
  expect(screen.getByText('Cài đặt')).toHaveStyle({ fontSize: 23 });
  expect(screen.getByText('Cài đặt')).not.toHaveStyle({ color: lightColors.text });
  expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith(expect.any(String),
    expect.stringContaining('"appearance":"dark","textSize":"large"'));
  expect(screen.queryByLabelText('Thông báo')).toBeNull();
  expect(screen.queryByLabelText('Lưu lịch sử bữa ăn')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Xóa lịch sử' })).toBeNull();
});

test('profile skips the no-session screen during logout and redirects after cleanup', async () => {
  let finishLogout!: (ok: boolean) => void;
  const logout = jest.fn(() => new Promise<boolean>(resolve => { finishLogout = resolve; }));
  const useSession = jest.mocked(useRoomRepository);
  type SessionContext = ReturnType<typeof useRoomRepository>;
  const active: SessionContext = {
    repository: {
      getSessionApi: () => undefined,
      getCurrentUser: () => ({ ...guest, isGuest: false }),
      getApiClient: () => ({ getHistoryConsent: async () => ({ ok: true, data: { personal: false, group: false } }) }),
    } as unknown as SessionContext['repository'], status: 'active', issue: 'none', mode: 'real',
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

test('profile settings save real preferences, update personal consent and confirm history deletion', async () => {
  const history = {
    readConsent: jest.fn().mockResolvedValue({ ok: true, data: { personal: false, group: true } }),
    updateConsent: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
    deletePersonal: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
  };
  await render(<AppPreferencesProvider><ProfileSettings history={history} /></AppPreferencesProvider>);

  await fireEvent.press(screen.getByRole('button', { name: 'Cỡ chữ' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Lớn' }));
  expect(screen.getByText('Cài đặt')).toHaveStyle({ fontSize: 23 });
  await fireEvent.press(screen.getByRole('button', { name: 'Giao diện' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Tối' }));
  expect(screen.getByText('Cài đặt')).not.toHaveStyle({ color: lightColors.text });
  await fireEvent(screen.getByLabelText('Thông báo'), 'valueChange', false);
  expect(screen.getByLabelText('Thông báo')).toHaveProp('value', false);
  expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith(expect.any(String),
    expect.stringContaining('"notifications":false'));

  await fireEvent(screen.getByLabelText('Lưu lịch sử bữa ăn'), 'valueChange', true);
  expect(history.updateConsent).toHaveBeenCalledWith({ scope: 'personal', consent: true });
  expect(screen.getByLabelText('Lưu lịch sử bữa ăn')).toHaveProp('value', true);
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa lịch sử' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Hủy' }));
  expect(history.deletePersonal).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa lịch sử' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa' }));
  expect(history.deletePersonal).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Đã xóa lịch sử cá nhân')).toBeOnTheScreen();
});

test('ProfileScreen hides standalone report buttons and moves Help entry into ProfileSettings with optional recent incident', async () => {
  clearLastFailure();
  recordLastFailure({ errorCode: 'NETWORK_ERROR', screen: 'room/lobby', action: 'start' });
  await render(<HelpProvider segments={['profile']}><AppPreferencesProvider>
    <ProfileScreen user={guest} onNavigate={jest.fn()} onHome={jest.fn()} onLogout={jest.fn()} />
  </AppPreferencesProvider></HelpProvider>);

  expect(screen.queryByRole('button', { name: 'Báo lỗi' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Trợ giúp & Báo lỗi' }));
  expect(screen.getByRole('header', { name: 'Báo lỗi' })).toBeOnTheScreen();
  expect(screen.getByText('Đính kèm sự cố vừa gặp')).toBeOnTheScreen();
  clearLastFailure();
});
