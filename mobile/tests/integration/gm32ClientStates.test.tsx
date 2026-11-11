import { render, screen, userEvent } from '@testing-library/react-native';
import { LiveFriendsScreen } from '../../src/features/friends/screens/LiveFriendsScreen';
import type { SocialRepository } from '../../src/features/friends/services/socialRepository';
import { LiveHistoryScreen } from '../../src/features/history/screens/LiveHistoryScreen';
import type { HistoryRepository } from '../../src/features/history/services/historyRepository';
import { LiveInboxScreen } from '../../src/features/inbox/screens/LiveInboxScreen';
import type { InboxRepository } from '../../src/features/inbox/services/inboxRepository';

// UI adapter fixtures. Live Auth/REST checks run separately on owned QA.
const noNetwork = { ok: false, error: { messageKey: 'NETWORK_ERROR' } } as const;
const empty = { ok: true as const, data: { items: [], fetchedAt: '2026-11-09T00:00:00Z' } };

test('G01 friends distinguishes network failure, no friends and no search match', async () => {
  const listFriends: jest.MockedFunction<SocialRepository['listFriends']> = jest.fn();
  listFriends.mockResolvedValueOnce(noNetwork).mockResolvedValueOnce({ ok: true, data: [] }).mockResolvedValue({
    ok: true,
    data: [{ id: '10000000-0000-4000-8000-000000000001', friendUserId: '10000000-0000-4000-8000-000000000002',
      displayName: 'Minh', friendCode: 'ABCDEFGH23', status: 'active', since: empty.data.fetchedAt }],
  });
  const repository: SocialRepository = {
    getIdentity: async () => ({ ok: true, data: {
      id: '10000000-0000-4000-8000-000000000003', displayName: 'QA guest', friendCode: 'ABCDEFGH24', avatarSeed: 'qa',
    } }),
    listFriends, invite: jest.fn(), accept: jest.fn(), reject: jest.fn(), removeFriend: jest.fn(),
  };
  const user = userEvent.setup();
  const view = await render(<LiveFriendsScreen repository={repository} onHome={jest.fn()} onNavigate={jest.fn()} />);
  expect(await screen.findByText('Chưa tải được bạn bè')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có bạn bè')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Chưa có bạn bè')).toBeOnTheScreen();
  await view.unmount();

  await render(<LiveFriendsScreen repository={repository} onHome={jest.fn()} onNavigate={jest.fn()} />);
  expect(await screen.findByText('Minh')).toBeOnTheScreen();
  await user.type(screen.getByPlaceholderText('Tìm trong danh sách bạn bè'), 'khong-match');
  expect(screen.getByText('Không tìm thấy bạn')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có bạn bè')).toBeNull();
});

test('G02 inbox distinguishes a failed request from an empty authenticated page', async () => {
  const list: jest.MockedFunction<InboxRepository['list']> = jest.fn();
  list.mockResolvedValueOnce(noNetwork).mockResolvedValue(empty);
  const repository: InboxRepository = {
    list, markAllRead: jest.fn(), markHandled: jest.fn(), acceptFriend: jest.fn(), rejectFriend: jest.fn(),
    acceptRoom: jest.fn(), rejectRoom: jest.fn(), resolveAcceptedRoom: jest.fn(), resolveRoomResult: jest.fn(),
  };
  const navigate = jest.fn();
  await render(<LiveInboxScreen repository={repository} displayName="QA guest" onHome={jest.fn()} onNavigate={navigate} />);
  expect(await screen.findByText('Chưa tải được thông báo')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có thông báo')).toBeNull();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Chưa có thông báo')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa tải được thông báo')).toBeNull();
  expect(list).toHaveBeenCalledTimes(2);
  expect(navigate).not.toHaveBeenCalled();
});

test('G03 history without a cache reports offline failure and recovers to an empty list', async () => {
  const fetch: jest.MockedFunction<HistoryRepository['fetch']> = jest.fn();
  fetch.mockResolvedValueOnce(noNetwork).mockResolvedValue(empty);
  const repository: HistoryRepository = {
    fetch, cached: () => undefined, cachedDurable: async () => undefined,
    updateConsent: jest.fn(), delete: jest.fn(), invalidate: jest.fn(),
  };
  await render(<LiveHistoryScreen repository={repository} onHome={jest.fn()} onNavigate={jest.fn()} />);
  expect(await screen.findByText('Chưa tải được lịch sử')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa có dữ liệu đã lưu')).toBeNull();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Chưa có dữ liệu đã lưu')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa tải được lịch sử')).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});
