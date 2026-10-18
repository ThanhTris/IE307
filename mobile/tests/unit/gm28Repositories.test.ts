import type {
  ApiClient,
  Friend,
  HistoryItem,
  InboxItem,
  SessionUser,
} from '../../src/data/api/contracts';
import { createRoomRepository, type RoomRepository } from '../../src/features/rooms/services/roomRepository';
import { createSocialRepository } from '../../src/features/friends/services/socialRepository';
import { createInboxRepository } from '../../src/features/inbox/services/inboxRepository';
import { createHistoryRepository, clearPrivateHistoryCache, type HistoryCache, type HistorySnapshot } from '../../src/features/history/services/historyRepository';

const user: SessionUser = { id: 'user-1', displayName: 'Minh', isGuest: true, createdAt: '2026-10-18T00:00:00Z' };

function inboxItem(id: string, eventId: string): InboxItem {
  return {
    id,
    eventId,
    type: 'friend_invite',
    title: 'Lời mời kết bạn',
    body: 'Có lời mời mới',
    read: false,
    metadata: { invitationId: `invite-${id}` },
    createdAt: '2026-10-18T00:00:00Z',
  };
}

function historyItem(id: string, scope: HistoryItem['scope'], mealDate: string): HistoryItem {
  return { id, roomId: `room-${id}`, roomCode: 'GCD234', mealDate, memberCount: 2, scope };
}

function cacheMock(): HistoryCache & { entries: Map<string, HistorySnapshot> } {
  const entries = new Map<string, HistorySnapshot>();
  return {
    entries,
    get: id => entries.get(id),
    set: (id, value) => { entries.set(id, value); },
    delete: id => { entries.delete(id); },
    clear: () => { entries.clear(); },
  };
}

describe('GM-28 live repository adapters', () => {
  test('social adapter delegates invite/accept/reject/unfriend to session-aware API methods', async () => {
    const client = {
      invitePartner: jest.fn().mockResolvedValue({ ok: true, data: { id: 'inv-1', status: 'pending' } }),
      acceptPartner: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      rejectPartner: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      unfriend: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      getMySocialIdentity: jest.fn().mockResolvedValue({ ok: true, data: { id: 'user-1', displayName: 'Minh', friendCode: 'MINH23', avatarSeed: 'm' } }),
      listFriends: jest.fn().mockResolvedValue({ ok: true, data: [] as Friend[] }),
    } as unknown as ApiClient;
    const roomRepository = createRoomRepository({ client, requestIdGenerator: () => 'gm28-request-1' });
    const social = createSocialRepository(roomRepository);

    await social.invite({ friendCode: 'TRI42' });
    await social.accept('friend-invite-9');
    await social.reject('friend-invite-10');
    await social.removeFriend('user-2');

    expect(client.invitePartner).toHaveBeenCalledWith({ friendCode: 'TRI42', requestId: expect.stringMatching(/^partner_invite_/) });
    expect(client.acceptPartner).toHaveBeenCalledWith('friend-invite-9', expect.stringMatching(/^partner_accept_/));
    expect(client.rejectPartner).toHaveBeenCalledWith('friend-invite-10', expect.stringMatching(/^partner_reject_/));
    expect(client.unfriend).toHaveBeenCalledWith('user-2', expect.stringMatching(/^unfriend_/));
  });

  test('inbox adapter deduplicates by eventId and advances by inbox item ID', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => inboxItem(`inbox-${i + 1}`, `event-${i + 1}`));
    rows[49] = inboxItem('inbox-50', 'event-1');
    const client = { listPartnerInbox: jest.fn().mockResolvedValue({ ok: true, data: rows }) } as unknown as ApiClient;
    const roomRepository = createRoomRepository({ client });
    const inbox = createInboxRepository(roomRepository);

    const firstPage = await inbox.list(undefined, new Set(['event-2']));

    expect(firstPage.ok).toBe(true);
    if (!firstPage.ok) return;
    expect(firstPage.data.items.map(item => item.eventId)).not.toContain('event-2');
    expect(firstPage.data.items.filter(item => item.eventId === 'event-1')).toHaveLength(1);
    expect(firstPage.data.nextCursor).toBe('inbox-50');
    expect(new Date(firstPage.data.fetchedAt).toString()).not.toBe('Invalid Date');
  });

  test('room invitation acceptance uses explicit invitation ID and participant display name', async () => {
    const client = {
      acceptRoomInvite: jest.fn().mockResolvedValue({ ok: true, data: { roomId: 'room-1', code: 'GCD234', version: 3 } }),
      rejectRoomInvite: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      acceptPartner: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      rejectPartner: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
    } as unknown as ApiClient;
    const inbox = createInboxRepository(createRoomRepository({ client }));

    const result = await inbox.acceptRoom('real-invitation-id', 'Minh');

    expect(client.acceptRoomInvite).toHaveBeenCalledWith({ invitationId: 'real-invitation-id', displayName: 'Minh', requestId: expect.any(String) });
    expect(result.ok).toBe(true);
  });

  test('history cache is scoped to the authenticated identity and cleared after consent or logout cleanup', async () => {
    const personal = historyItem('personal-1', 'personal', '2026-10-17T12:00:00Z');
    const group = historyItem('group-1', 'group', '2026-10-16T12:00:00Z');
    const client = {
      getHistory: jest.fn().mockImplementation(async (scope: 'personal' | 'group') => ({ ok: true, data: scope === 'personal' ? [personal] : [group] })),
      updateHistoryConsent: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      deleteHistory: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
    } as unknown as ApiClient;
    const roomRepository = {
      getCurrentUser: () => user,
      getApiClient: () => client,
      getSessionApi: () => undefined,
      getSessionStatus: () => 'empty',
    } as unknown as RoomRepository;
    const cache = cacheMock();
    const history = createHistoryRepository(roomRepository, cache);
    const fetched = await history.fetch();

    expect(fetched.ok).toBe(true);
    if (!fetched.ok) return;
    expect(fetched.data.items.map(item => item.id)).toEqual(['personal-1', 'group-1']);
    expect(history.cached()?.fetchedAt).toBe(fetched.data.fetchedAt);
    await history.updateConsent({ scope: 'group', consent: false });
    expect(history.cached()).toBeUndefined();

    const defaultCachedRepo = createHistoryRepository(roomRepository);
    const defaultResult = await defaultCachedRepo.fetch();
    expect(defaultResult.ok).toBe(true);
    clearPrivateHistoryCache();
    expect(defaultCachedRepo.cached()).toBeUndefined();
  });
});
