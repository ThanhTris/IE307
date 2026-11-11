import { render, waitFor } from '@testing-library/react-native';
import type { NativePushDriver } from '../../src/features/inbox/services/nativePush';
import { PushLifecycle } from '../../src/features/inbox/components/PushLifecycle';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

let mockTapListener: ((eventId: string) => unknown) | undefined;
const mockDriver: NativePushDriver = {
  availability: () => 'available',
  requestPermission: async () => 'granted',
  getPermissionStatus: async () => 'granted',
  getDeviceId: async () => 'device-1',
  getPushToken: async () => undefined,
  onTokenRefresh: () => () => undefined,
  onNotificationTap: listener => { mockTapListener = listener; return () => { mockTapListener = undefined; }; },
};
jest.mock('../../src/features/inbox/services/expoPushDriver', () => ({ getActivePushDriver: () => mockDriver }));

const mockUserId = 'usr_push_1';
const mockListPartnerInbox = jest.fn(async () => ({ ok: true, data: [] }));
const mockRestoreSession = jest.fn(async () => ({ ok: true, data: { id: mockUserId } }));
const mockRepository = {
  getCurrentUser: () => ({ id: mockUserId }),
  getSessionStatus: () => 'active',
  getIdentityRevision: () => 1,
  getApiClient: () => ({ listPartnerInbox: mockListPartnerInbox }),
  restoreSession: mockRestoreSession,
};
jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({
  useRoomRepository: () => ({ repository: mockRepository, user: { id: mockUserId }, status: 'active' }),
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockListPartnerInbox.mockClear();
  mockRestoreSession.mockClear();
  mockTapListener = undefined;
});

test('tapping a notification refreshes the session and inbox, then opens the in-app Inbox', async () => {
  await render(<PushLifecycle />);
  await waitFor(() => expect(mockTapListener).toBeDefined());
  await mockTapListener!('9b2f6f0e-5c1d-4d7a-9a51-3f0e2c1b7a10');
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/inbox'));
  expect(mockRestoreSession).toHaveBeenCalledTimes(1);
  expect(mockListPartnerInbox).toHaveBeenCalledTimes(1);
});

test('a tap carrying a malformed event id is ignored', async () => {
  await render(<PushLifecycle />);
  await waitFor(() => expect(mockTapListener).toBeDefined());
  await mockTapListener!('not-an-event-id');
  expect(mockRestoreSession).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('unmounting stops listening for taps', async () => {
  const view = await render(<PushLifecycle />);
  await waitFor(() => expect(mockTapListener).toBeDefined());
  await view.unmount();
  expect(mockTapListener).toBeUndefined();
});
