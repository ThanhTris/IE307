import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createApiClient } from '../../src/data/api';
import type { RoomRepositoryContextValue } from '../../src/bootstrap/RoomRepositoryProvider';
import Index from '../../src/app/index';
import Welcome from '../../src/app/welcome';

let mockSession: RoomRepositoryContextValue;
jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: () => mockSession }));

const routes = { _layout: () => <Stack screenOptions={{ headerShown: false }} />, index: Index, welcome: Welcome };
const user = { id: 'gm09-synthetic-user', displayName: 'Minh', isGuest: true, createdAt: '2026-10-31T00:00:00Z' };

beforeEach(() => {
  mockSession = {
    repository: createApiClient('mock', { mode: 'default', delayMs: 0 }) as unknown as RoomRepositoryContextValue['repository'],
    status: 'empty', issue: 'no-session', user: null, mode: 'real', isInitializing: false,
    ensureSession: jest.fn().mockImplementation(async () => {
      mockSession = { ...mockSession, status: 'active', issue: 'none', user };
      return true;
    }),
    restoreSession: jest.fn().mockResolvedValue(false), logout: jest.fn().mockResolvedValue(false),
  };
});

test('confirmed no-session entry creates a guest through the existing seam only after name confirmation', async () => {
  const ensure = mockSession.ensureSession;
  const create = jest.spyOn(mockSession.repository, 'createRoom');
  const join = jest.spyOn(mockSession.repository, 'joinRoom');
  await renderRouter(routes, { initialUrl: '/' });
  await fireEvent.press(await screen.findByRole('button', { name: 'Tham gia với tư cách khách' }));
  expect(ensure).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Tên khách'), ' Minh ');
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(await screen.findByRole('button', { name: 'Tạo phòng' })).toBeOnTheScreen();
  expect(ensure).toHaveBeenCalledTimes(1);
  expect(ensure).toHaveBeenCalledWith('Minh');
  expect(create).not.toHaveBeenCalled();
  expect(join).not.toHaveBeenCalled();
});

test.each(['restore-unavailable', 'signup-uncertain'] as const)('root preserves the existing recovery path for %s', async issue => {
  mockSession = { ...mockSession, status: issue === 'signup-uncertain' ? 'blocked' : 'lost', issue };
  await renderRouter(routes, { initialUrl: '/' });
  expect(await screen.findByRole('button', { name: 'Tạo phòng' })).toBeDisabled();
  expect(screen).toHavePathname('/');
  expect(screen.queryByRole('button', { name: 'Tham gia với tư cách khách' })).toBeNull();
  expect(mockSession.ensureSession).not.toHaveBeenCalled();
});

test('a revoked guest sees expiry and explicit reset without a replacement signup', async () => {
  mockSession = { ...mockSession, status: 'lost', issue: 'session-revoked' };
  await renderRouter(routes, { initialUrl: '/' });
  expect(await screen.findByText('Phiên khách đã hết hạn')).toBeOnTheScreen();
  expect(mockSession.ensureSession).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Nhập tên' }));
  expect(mockSession.logout).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Chưa xóa được phiên cũ')).toBeOnTheScreen();
  expect(mockSession.ensureSession).not.toHaveBeenCalled();
  expect(screen).toHavePathname('/');
});

test('an already active identity goes straight from welcome to Home without replacement signup', async () => {
  mockSession = { ...mockSession, status: 'active', issue: 'none', user };
  await renderRouter(routes, { initialUrl: '/welcome' });
  expect(await screen.findByRole('button', { name: 'Tạo phòng' })).toBeOnTheScreen();
  expect(screen).toHavePathname('/');
  expect(mockSession.ensureSession).not.toHaveBeenCalled();
});
