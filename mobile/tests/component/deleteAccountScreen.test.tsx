import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Linking, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import ProfileRoute from '../../src/app/profile';
import DeleteAccountRoute from '../../src/app/account/delete-account';
import { RoomRepositoryProvider } from '../../src/bootstrap/RoomRepositoryProvider';
import { getDurableOutbox } from '../../src/data/local/outbox';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/data/local/outbox', () => ({
  getDurableOutbox: jest.fn().mockReturnValue({
    clearIdentity: jest.fn().mockResolvedValue(undefined),
    retryPendingPrivateDeletions: jest.fn().mockResolvedValue(undefined),
  }),
}));

const userId = '00000000-0000-4000-8000-000000000053';
const creationDate = '2026-11-26T10:00:00Z';

function response(status: number, body: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body, headers: new Headers() } as Response;
}

async function openProfile(isGuest: boolean, deletionReply: (options: RequestInit) => Promise<Response>) {
  const stored = {
    user: { id: userId, displayName: 'QA', isGuest, createdAt: creationDate },
    accessToken: 'fixture-access', refreshToken: 'fixture-refresh', expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
  const rawUser = {
    id: userId, is_anonymous: isGuest, user_metadata: { display_name: 'QA' },
    created_at: creationDate, email: 'tester@example.test', email_confirmed_at: creationDate,
  };
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => key === 'gcd.auth.gm16.v1' ? JSON.stringify(stored) : null);
  const send = jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const path = String(url);
    if (path.endsWith('/auth/v1/user')) return response(200, rawUser);
    if (path.endsWith('/auth/v1/token?grant_type=password')) {
      const { password } = JSON.parse(String(options?.body));
      return password === 'right'
        ? response(200, { user: rawUser, access_token: 'fixture-proof', refresh_token: 'fixture-proof-refresh', token_type: 'bearer', expires_in: 600 })
        : response(400, { error_code: 'invalid_credentials' });
    }
    if (path.endsWith('/auth/v1/logout?scope=local')) return response(204, null);
    if (path.endsWith('/functions/v1/delete-account')) return deletionReply(options!);
    return response(200, { ok: true, data: { personal: false, group: false } });
  });
  await renderRouter({
    _layout: () => <RoomRepositoryProvider baseUrl="http://localhost:54321" publicKey="sb_publishable_fixture">
      <Stack screenOptions={{ headerShown: false }} />
    </RoomRepositoryProvider>,
    profile: ProfileRoute,
    'account/delete-account': DeleteAccountRoute,
    welcome: () => <Text>Welcome</Text>,
  }, { initialUrl: '/profile' });
  await screen.findByRole('button', { name: 'Xóa tài khoản' });
  return send;
}

async function confirmPhrase() {
  await fireEvent.changeText(await screen.findByLabelText('Nhập XÓA để xác nhận'), 'XÓA');
}

afterEach(() => jest.restoreAllMocks());

test('guest enters from Hồ sơ, blocks Back and duplicate submit, cleans private data on ACK, then reaches Welcome', async () => {
  let release!: () => void;
  const reply = jest.fn((options: RequestInit) => new Promise<Response>(resolve => {
    release = () => resolve(response(200, { ok: true, data: { ...JSON.parse(String(options.body)), deleted: true } }));
  }));
  await openProfile(true, reply);
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa tài khoản' }));
  expect(screen).toHavePathname('/account/delete-account');
  expect(screen.queryByLabelText('Mật khẩu hiện tại')).toBeNull();
  expect(screen.getByRole('button', { name: 'Xóa tài khoản' })).toBeDisabled();
  await confirmPhrase();
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa tài khoản' }));
  await waitFor(() => expect(reply).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Xóa tài khoản' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa tài khoản' }));
  await act(async () => { router.back(); });
  expect(screen).toHavePathname('/account/delete-account');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  expect(reply).toHaveBeenCalledTimes(1);
  await act(async () => { release(); });
  await waitFor(() => expect(screen).toHavePathname('/welcome'));
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('gcd.auth.gm16.v1');
  expect(getDurableOutbox().clearIdentity).toHaveBeenCalledWith(userId);
});

test('email password error stays in the form, and network retry sends the original request again', async () => {
  const reply = jest.fn(async (options: RequestInit) => response(200, {
    ok: true, data: { ...JSON.parse(String(options.body)), deleted: true },
  })).mockRejectedValueOnce(new TypeError('network unavailable'));
  await openProfile(false, reply);
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa tài khoản' }));
  await confirmPhrase();
  const password = screen.getByLabelText('Mật khẩu hiện tại');
  expect(screen.getByRole('button', { name: 'Xóa tài khoản' })).toBeDisabled();
  await fireEvent.changeText(password, 'wrong');
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa tài khoản' }));
  expect(await screen.findByText('Mật khẩu chưa đúng. Hãy nhập lại.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveDisplayValue('');
  expect(reply).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'right');
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa tài khoản' }));
  const retry = await screen.findByRole('button', { name: 'Thử lại' });
  expect(screen.queryByLabelText('Mật khẩu hiện tại')).toBeNull();
  expect(retry).toBeEnabled();
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  await fireEvent.press(retry);
  await waitFor(() => expect(screen).toHavePathname('/welcome'));
  expect(reply.mock.calls[1]![0].body).toBe(reply.mock.calls[0]![0].body);
  expect(reply.mock.calls[1]![0].headers).toMatchObject({ Authorization: 'Bearer fixture-access' });
});

test('legal rows use the GM-50 browser URLs', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await openProfile(true, jest.fn());
  for (const [label, path] of [
    ['Chính sách quyền riêng tư', 'privacy'], ['Điều khoản sử dụng', 'terms'], ['Hỗ trợ', 'support'],
  ]) {
    await fireEvent.press(screen.getByRole('link', { name: label }));
    expect(openURL).toHaveBeenLastCalledWith(`https://thanhtris.github.io/IE307/${path}/`);
  }
});
