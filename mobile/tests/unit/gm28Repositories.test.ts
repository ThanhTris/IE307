import type {
  ApiClient,
  Friend,
  CanonicalHistoryItem,
  InboxItem,
  SessionUser,
} from '../../src/data/api/contracts';
import { createRoomRepository, type RoomRepository } from '../../src/features/rooms/services/roomRepository';
import { createSocialRepository } from '../../src/features/friends/services/socialRepository';
import { createInboxRepository } from '../../src/features/inbox/services/inboxRepository';
import { createHistoryRepository, clearPrivateHistoryCache, historyIdOf, type DurableHistoryStore, type HistoryCache, type HistorySnapshot } from '../../src/features/history/services/historyRepository';

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

function historyItem(id: string, scope: CanonicalHistoryItem['scope'], createdAt: string): CanonicalHistoryItem {
  return {
    historyId: id,
    roomId: `room-${id}`,
    resultId: `result-${id}`,
    scope,
    createdAt,
    expiresAt: '2027-10-18T00:00:00Z',
    result: { capability: 'legacy-unscored-v1', status: 'NO_CONSENSUS', winner: null, reasonCode: 'EMPTY_INTERSECTION', finalizedAt: createdAt },
  };
}

function durableHistoryMock(): DurableHistoryStore & { entries: Map<string, { value: HistorySnapshot }> } {
  const entries = new Map<string, { value: HistorySnapshot }>();
  return {
    entries,
    cacheSnapshot: jest.fn(async input => { entries.set(input.identityId, { value: input.value as HistorySnapshot }); }),
    readSnapshotCache: async <T>(identityId: string) => entries.get(identityId) as { value: T } | undefined,
    clearSnapshotCache: jest.fn(async identityId => { entries.delete(identityId); }),
  };
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

  test('resolves an accepted invite to the latest room route and verifies result references against the server', async () => {
    const client = {
      getRoomSnapshot: jest.fn()
        .mockResolvedValueOnce({ ok: true, data: { roomId: 'room-1', state: 'ROUND_2', result: null } })
        .mockResolvedValueOnce({ ok: true, data: { roomId: 'room-1', state: 'DECIDED', result: { resultId: 'result-current' } } })
        .mockResolvedValueOnce({ ok: true, data: { roomId: 'room-1', state: 'DECIDED', result: { resultId: 'result-current' } } }),
    } as unknown as ApiClient;
    const inbox = createInboxRepository(createRoomRepository({ client }));

    expect(await inbox.resolveAcceptedRoom('room-1')).toEqual({ ok: true, data: { roomId: 'room-1', destination: 'final-round' } });
    expect(await inbox.resolveRoomResult('room-1', 'result-current')).toEqual({ ok: true, data: { roomId: 'room-1', destination: 'result', resultId: 'result-current' } });
    expect(await inbox.resolveRoomResult('room-1', 'stale-result')).toEqual({ ok: false, error: { messageKey: 'VERSION_CONFLICT' } });
  });

  test('history cache is scoped to the authenticated identity and cleared after consent or logout cleanup', async () => {
    const personal = historyItem('personal-1', 'personal', '2026-10-17T12:00:00Z');
    const group = historyItem('group-1', 'group', '2026-10-16T12:00:00Z');
    const client = {
      getCanonicalHistory: jest.fn().mockResolvedValue({ ok: true, data: { items: [personal, group] } }),
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
    const durable = durableHistoryMock();
    const history = createHistoryRepository(roomRepository, cache, durable);
    const fetched = await history.fetch();

    expect(fetched.ok).toBe(true);
    if (!fetched.ok) return;
    expect(fetched.data.items.map(historyIdOf)).toEqual(['personal-1', 'group-1']);
    expect(client.getCanonicalHistory).toHaveBeenCalledTimes(1);
    expect(history.cached()?.fetchedAt).toBe(fetched.data.fetchedAt);
    (client.getCanonicalHistory as jest.Mock).mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    const offline = await history.fetch();
    expect(offline).toEqual({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    expect(history.cached()).toEqual(fetched.data);
    (client.getCanonicalHistory as jest.Mock).mockResolvedValue({ ok: true, data: { items: [personal, group] } });
    await history.updateConsent({ scope: 'group', consent: false });
    expect(history.cached()).toBeUndefined();

    const defaultCachedRepo = createHistoryRepository(roomRepository, undefined, durable);
    const defaultResult = await defaultCachedRepo.fetch();
    expect(defaultResult.ok).toBe(true);
    clearPrivateHistoryCache();
    expect(defaultCachedRepo.cached()).toBeUndefined();
  });

  test('history adapter created before restore follows the active identity and isolates A to B', async () => {
    let activeUser: SessionUser | null = null;
    const rowA = historyItem('A-history', 'personal', '2026-10-17T12:00:00Z');
    const rowB = historyItem('B-history', 'personal', '2026-10-18T12:00:00Z');
    const client = {
      getCanonicalHistory: jest.fn()
        .mockResolvedValueOnce({ ok: true, data: { items: [rowA] } })
        .mockResolvedValueOnce({ ok: true, data: { items: [rowB] } }),
    } as unknown as ApiClient;
    const roomRepository = {
      getCurrentUser: () => activeUser,
      getApiClient: () => client,
      getSessionApi: () => ({}) as unknown as RoomRepository['getSessionApi'],
      getSessionStatus: () => activeUser ? 'active' : 'empty',
    } as unknown as RoomRepository;
    const cache = cacheMock();
    const durable = durableHistoryMock();
    const history = createHistoryRepository(roomRepository, cache, durable);

    activeUser = user;
    const first = await history.fetch();
    expect(first.ok).toBe(true);
    expect(cache.get('user-1')?.items.map(historyIdOf)).toEqual(['A-history']);

    activeUser = { ...user, id: 'user-2', displayName: 'Binh' };
    const second = await history.fetch();
    expect(second.ok).toBe(true);
    expect(cache.get('user-2')?.items.map(historyIdOf)).toEqual(['B-history']);
    expect(durable.entries.get('user-1')?.value.items.map(historyIdOf)).toEqual(['A-history']);
    expect(durable.entries.get('user-2')?.value.items.map(historyIdOf)).toEqual(['B-history']);
  });

  test('drops a late A history response after switching to B', async () => {
    let activeUser: SessionUser | null = user;
    let resolveRequest: ((value: { ok: true; data: { items: CanonicalHistoryItem[] } }) => void) | undefined;
    const pending = new Promise<{ ok: true; data: { items: CanonicalHistoryItem[] } }>(resolve => { resolveRequest = resolve; });
    const client = { getCanonicalHistory: jest.fn(() => pending) } as unknown as ApiClient;
    const roomRepository = {
      getCurrentUser: () => activeUser,
      getApiClient: () => client,
      getSessionApi: () => undefined,
      getSessionStatus: () => activeUser ? 'active' : 'empty',
    } as unknown as RoomRepository;
    const cache = cacheMock();
    const durable = durableHistoryMock();
    const history = createHistoryRepository(roomRepository, cache, durable);
    const response = history.fetch();

    activeUser = { ...user, id: 'user-2', displayName: 'Binh' };
    resolveRequest?.({ ok: true, data: { items: [historyItem('late-A', 'personal', '2026-10-17T12:00:00Z')] } });
    expect(await response).toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(cache.get('user-1')).toBeUndefined();
    expect(cache.get('user-2')).toBeUndefined();
    expect(durable.entries.size).toBe(0);
  });

  test.each(['delete', 'revoke'] as const)('does not cache a pending history read after %s ACK', async action => {
    let resolveRequest: ((value: { ok: true; data: { items: CanonicalHistoryItem[] } }) => void) | undefined;
    const pending = new Promise<{ ok: true; data: { items: CanonicalHistoryItem[] } }>(resolve => { resolveRequest = resolve; });
    const client = {
      getCanonicalHistory: jest.fn(() => pending),
      updateHistoryConsent: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      deleteHistory: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
    } as unknown as ApiClient;
    const roomRepository = {
      getCurrentUser: () => user,
      getApiClient: () => client,
      getSessionApi: () => undefined,
      getSessionStatus: () => 'active',
    } as unknown as RoomRepository;
    const cache = cacheMock();
    const durable = durableHistoryMock();
    const history = createHistoryRepository(roomRepository, cache, durable);
    const pendingRead = history.fetch();
    const mutation = action === 'delete'
      ? await history.delete('history-A')
      : await history.updateConsent({ scope: 'personal', consent: false });
    expect(mutation.ok).toBe(true);
    resolveRequest?.({ ok: true, data: { items: [historyItem('history-A', 'personal', '2026-10-17T12:00:00Z')] } });
    expect(await pendingRead).toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(cache.get(user.id)).toBeUndefined();
    expect(durable.entries.size).toBe(0);
  });

  test('feature API 401 invalidates the live session and requires recovery', async () => {
    const client = {
      getCanonicalHistory: jest.fn().mockResolvedValue({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } }),
    } as unknown as ApiClient;
    const session = {
      createGuestSession: jest.fn().mockResolvedValue({ ok: true, data: { user, accessToken: 'synthetic', expiresAt: '2027-01-01T00:00:00Z' } }),
      logout: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      getStatus: () => 'active',
    } as unknown as import('../../src/data/auth/types').SessionApi;
    const roomRepository = createRoomRepository({ client, session });
    await roomRepository.createGuestSession('Minh');
    const history = createHistoryRepository(roomRepository, cacheMock(), durableHistoryMock());

    expect(await history.fetch()).toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(roomRepository.getSessionSnapshot()).toEqual({ status: 'lost', user: null, issue: 'session-recovery-required' });
  });
});
