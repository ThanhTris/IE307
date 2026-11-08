import type {
  ApiClient,
  Friend,
  InboxItem,
  SessionUser,
} from '../../src/data/api/contracts';
import { ApiClientImpl, type ApiTransport } from '../../src/data/api/client';
import { SessionManager } from '../../src/data/auth/session';
import type { AuthPort, SessionStorage, StoredSession } from '../../src/data/auth/types';
import { createRoomRepository, LiveRoomRepository, type RoomRepository } from '../../src/features/rooms/services/roomRepository';
import { createSocialRepository } from '../../src/features/friends/services/socialRepository';
import { createInboxRepository } from '../../src/features/inbox/services/inboxRepository';
import { createHistoryRepository, clearPrivateHistoryCache, historyIdOf, type DurableHistoryStore, type HistoryCache, type HistorySnapshot } from '../../src/features/history/services/historyRepository';
import type { CanonicalHistoryItem } from '../../src/features/history/services/historyTypes';

function uuidFrom(value: string): string {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `00000000-0000-4000-8000-${(hash >>> 0).toString(16).padStart(12, '0')}`;
}

function historyEnvelope(items: CanonicalHistoryItem[]) {
  return { ok: true as const, data: { items } };
}

const user: SessionUser = { id: 'user-1', displayName: 'Minh', isGuest: true, createdAt: '2026-10-18T00:00:00Z' };

function liveSessionHarness(options: {
  savedSession?: StoredSession | null;
  invoke: ApiTransport['invoke'];
  userForGuest?: () => SessionUser;
}) {
  const now = Date.parse('2026-11-06T00:00:00Z');
  let stored = options.savedSession ? structuredClone(options.savedSession) : null;
  const accessToken = 'synthetic-access';
  const makeStored = (currentUser = options.userForGuest?.() ?? user, token = accessToken): StoredSession => ({
    accessToken: token,
    refreshToken: `${token}-refresh`,
    expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
    user: currentUser,
  });
  const storage: SessionStorage = {
    load: jest.fn(async () => stored ? structuredClone(stored) : null),
    save: jest.fn(async next => { stored = structuredClone(next); }),
    clear: jest.fn(async () => { stored = null; }),
  };
  const auth: AuthPort = {
    createGuest: jest.fn(async () => makeStored()),
    verify: jest.fn(async () => ({ ...(stored?.user ?? user) })),
    refresh: jest.fn(async () => makeStored(stored?.user, 'synthetic-refreshed')),
    logout: jest.fn(async () => undefined),
  };
  const session = new SessionManager({ auth, storage, clearPrivateData: async () => undefined, now: () => now, sleep: async () => undefined });
  const transport: ApiTransport = { invoke: options.invoke };
  const client = new ApiClientImpl({ authSession: session, transport });
  const repository = new LiveRoomRepository({ client, session, sessionStorage: storage });
  return { auth, client, repository, session, storage, makeStored };
}

function inboxItem(id: string, eventId: string): InboxItem {
  return {
    id: uuidFrom(id),
    eventId: uuidFrom(eventId),
    type: 'friend_invite',
    title: 'Lời mời kết bạn',
    body: 'Có lời mời mới',
    read: false,
    metadata: { invitationId: uuidFrom(`invite-${id}`) },
    createdAt: '2026-10-18T00:00:00Z',
  };
}

function historyItem(id: string, scope: CanonicalHistoryItem['scope'], createdAt: string): CanonicalHistoryItem {
  return {
    historyId: uuidFrom(`history-${id}`),
    roomId: uuidFrom(`room-${id}`),
    resultId: uuidFrom(`result-${id}`),
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

describe('Social, inbox, and history live adapters', () => {
  test('social adapter delegates invite/accept/reject/unfriend to session-aware API methods', async () => {
    const client = {
      invitePartner: jest.fn().mockResolvedValue({ ok: true, data: { id: uuidFrom('inv-1'), inviterUserId: uuidFrom('user-1'), inviterName: 'Minh', inviteeUserId: uuidFrom('user-2'), status: 'pending', createdAt: '2026-10-18T00:00:00Z', expiresAt: '2026-10-25T00:00:00Z' } }),
      acceptPartner: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      rejectPartner: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      unfriend: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      getMySocialIdentity: jest.fn().mockResolvedValue({ ok: true, data: { id: uuidFrom('user-1'), displayName: 'Minh', friendCode: 'MNH2345678', avatarSeed: 'm' } }),
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

  test('social feature adapter rejects malformed identity and friend projections', async () => {
    const client = {
      getMySocialIdentity: jest.fn().mockResolvedValue({ ok: true, data: {
        id: uuidFrom('social-user'), displayName: 'Minh', friendCode: 'MNH2345678',
      } }),
      listFriends: jest.fn().mockResolvedValue({ ok: true, data: [{
        id: uuidFrom('friend-row'), friendUserId: uuidFrom('friend-user'), displayName: 'Linh',
        friendCode: 'LNH2345678', status: 'pending', since: '2026-10-18T00:00:00Z',
      }] }),
    } as unknown as ApiClient;
    const social = createSocialRepository(createRoomRepository({ client }));

    expect(await social.getIdentity()).toEqual({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
    expect(await social.listFriends()).toEqual({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
  });

  test('inbox adapter deduplicates by eventId and advances by inbox item ID', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => inboxItem(`inbox-${i + 1}`, `event-${i + 1}`));
    rows[49] = inboxItem('inbox-50', 'event-1');
    const client = { listPartnerInbox: jest.fn().mockResolvedValue({ ok: true, data: rows }) } as unknown as ApiClient;
    const roomRepository = createRoomRepository({ client });
    const inbox = createInboxRepository(roomRepository);

    const firstPage = await inbox.list(undefined, new Set([uuidFrom('event-2')]));

    expect(firstPage.ok).toBe(true);
    if (!firstPage.ok) return;
    expect(firstPage.data.items.map(item => item.eventId)).not.toContain(uuidFrom('event-2'));
    expect(firstPage.data.items.filter(item => item.eventId === uuidFrom('event-1'))).toHaveLength(1);
    expect(firstPage.data.nextCursor).toBe(uuidFrom('inbox-50'));
    expect(new Date(firstPage.data.fetchedAt).toString()).not.toBe('Invalid Date');
  });

  test('mark-all inbox forwards a stable request ID through the authenticated API client', async () => {
    const calls: { rpc: string; params: Record<string, unknown> }[] = [];
    const harness = liveSessionHarness({
      savedSession: {
        accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh',
        expiresAt: '2027-01-01T00:00:00Z', user,
      },
      invoke: async <T>(rpc: string, params: Record<string, unknown>) => {
        calls.push({ rpc, params });
        return { ok: true, requestId: params.requestId, data: null } as T;
      },
    });
    expect((await harness.repository.restoreSession()).ok).toBe(true);

    const inbox = createInboxRepository(harness.repository);
    const result = await inbox.markAllRead('same-request-after-timeout');

    expect(result).toEqual({ ok: true, requestId: 'same-request-after-timeout', data: undefined });
    expect(calls).toEqual([{
      rpc: 'mark_all_partner_inbox_read',
      params: { requestId: 'same-request-after-timeout' },
    }]);
    const forwarded = await inbox.markAllRead('same-request-after-timeout');
    expect(forwarded.ok).toBe(true);
    expect(calls[1]).toEqual(calls[0]);
  });

  test.each([
    { ok: true },
    { ok: true, requestId: 'older-mark-all-request', data: null },
    { ok: true, requestId: 'mark-all-request', data: {} },
  ])('mark-all rejects a malformed or unrelated success ACK: %j', async raw => {
    const client = new ApiClientImpl({ transport: { invoke: async <T>() => raw as T } });
    const inbox = createInboxRepository(createRoomRepository({ client }));

    expect(await inbox.markAllRead('mark-all-request')).toEqual({
      ok: false, requestId: 'mark-all-request', error: { messageKey: 'MALFORMED_RESPONSE' },
    });
  });

  test('does not show an invitation again after its action succeeded in the current app session', async () => {
    const row = inboxItem('handled-inbox', 'handled-event');
    const client = { listPartnerInbox: jest.fn().mockResolvedValue({ ok: true, data: [row] }) } as unknown as ApiClient;
    const inbox = createInboxRepository(createRoomRepository({ client }));

    const before = await inbox.list();
    expect(before.ok && before.data.items).toHaveLength(1);

    inbox.markHandled(row.eventId);
    const after = await inbox.list();

    expect(after).toMatchObject({ ok: true, data: { items: [] } });
    expect(client.listPartnerInbox).toHaveBeenCalledTimes(2);
  });

  test('keeps both existing and canonical result events alongside new invitations', async () => {
    const legacy: InboxItem = {
      ...inboxItem('legacy-inbox', 'legacy-event'),
      type: 'room_result',
      metadata: { roomId: uuidFrom('legacy-room'), resultId: uuidFrom('legacy-result') },
    };
    const canonical: InboxItem = {
      ...inboxItem('canonical-inbox', 'canonical-event'),
      type: 'room_result',
      metadata: {
        roomId: uuidFrom('canonical-room'), resultId: uuidFrom('canonical-result'),
        status: 'DECIDED', contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement', eventVersion: 1,
      },
    };
    const rows = [legacy, inboxItem('new-inbox', 'new-friend-invitation'), canonical];
    const client = new ApiClientImpl({ transport: { invoke: async <T>() => rows as T } });
    const inbox = createInboxRepository(createRoomRepository({ client }));

    expect(await inbox.list()).toMatchObject({ ok: true, data: { items: rows } });
  });

  test.each([
    ['missing resultId', { roomId: uuidFrom('room-result'), status: 'DECIDED', contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement', eventVersion: 1 }],
    ['numeric resultId', { roomId: uuidFrom('room-result'), resultId: 123, status: 'DECIDED', contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement', eventVersion: 1 }],
  ])('rejects a room result inbox item with %s', async (_label, metadata) => {
    const row = {
      id: uuidFrom('inbox-result'), eventId: uuidFrom('event-result'), type: 'room_result', title: 'Kết quả',
      body: 'Đã có kết quả', read: false, metadata, createdAt: '2026-10-18T00:00:00Z',
    } as unknown as InboxItem;
    const inbox = createInboxRepository(createRoomRepository({ client: {
      listPartnerInbox: jest.fn().mockResolvedValue({ ok: true, data: [row] }),
    } as unknown as ApiClient }));

    expect(await inbox.list()).toEqual({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
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
    const roomId = uuidFrom('room-1');
    const resultId = uuidFrom('result-current');
    const roomRepository = {
      getRoomSnapshot: jest.fn()
        .mockResolvedValueOnce({ ok: true, data: { roomId, state: 'ROUND_2', result: null } })
        .mockResolvedValueOnce({ ok: true, data: { roomId, state: 'DECIDED', result: { resultId } } })
        .mockResolvedValueOnce({ ok: true, data: { roomId, state: 'DECIDED', result: { resultId } } }),
    } as unknown as RoomRepository;
    const inbox = createInboxRepository(roomRepository);

    expect(await inbox.resolveAcceptedRoom(roomId)).toEqual({ ok: true, data: { roomId, destination: 'final-round' } });
    expect(await inbox.resolveRoomResult(roomId, resultId)).toEqual({ ok: true, data: { roomId, destination: 'result', resultId } });
    expect(await inbox.resolveRoomResult(roomId, uuidFrom('stale-result'))).toEqual({ ok: false, error: { messageKey: 'VERSION_CONFLICT' } });
    expect(roomRepository.getRoomSnapshot).toHaveBeenCalledTimes(3);
  });

  test('resolves a canonical inbox result through ApiClientImpl and the GM-07.B snapshot RPC', async () => {
    const roomId = uuidFrom('canonical-inbox-room');
    const resultId = uuidFrom('canonical-inbox-result');
    const roundDishId = uuidFrom('canonical-inbox-dish');
    const dish = {
      roundDishId,
      dishId: uuidFrom('canonical-inbox-catalogue-dish'),
      name: 'Món thử tổng hợp',
      description: null,
      mealSlots: ['lunch'],
      cuisineIds: [],
      cuisineLabels: [],
      categoryIds: [],
      categoryLabels: [],
      temperature: null,
      flavor: null,
      artwork: null,
      priceReference: null,
    };
    const snapshot = {
      contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
      policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
      catalogueVersion: 'synthetic-inbox-result-v1',
      catalogueSha: 'a'.repeat(64),
      roomId,
      code: 'GCD234',
      state: 'DECIDED',
      version: 7,
      round: 1,
      poolVersion: 1,
      dishCount: 10,
      pool: [dish],
      members: [{ userId: uuidFrom('canonical-inbox-host'), displayName: 'Host QA', role: 'HOST', submissionStatus: 'NOT_SUBMITTED' }],
      submittedCount: 0,
      memberCount: 1,
      ownBallot: null,
      ownWaiting: false,
      waitingStartedAt: null,
      deadline: null,
      serverTime: '2026-11-06T06:30:00Z',
      result: {
        resultId,
        contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
        policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
        status: 'DECIDED',
        round: 1,
        winner: dish,
        reasonCode: 'UNANIMOUS_WANT',
        finalizedAt: '2026-11-06T06:29:00Z',
        scoreVersion: 'want2-ok1-round1-v1',
        rankingVersion: 'score-desc-dense-rank-v1',
        topDishes: [{ dish, score: 2, rank: 1, isWinner: true }],
        round1BallotCount: 1,
      },
      hostUserId: uuidFrom('canonical-inbox-host'),
      settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null },
      ownPreferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: true },
      ownPreferenceRevision: 1,
      preferenceRanking: 'UNSUPPORTED',
      removalCap: null,
      expiresAt: '2026-11-06T07:00:00Z',
      canEndWaiting: false,
    };
    const calls: { rpc: string; params: Record<string, unknown> }[] = [];
    const h = liveSessionHarness({
      savedSession: {
        accessToken: 'synthetic-access',
        refreshToken: 'synthetic-refresh',
        expiresAt: '2027-01-01T00:00:00Z',
        user,
      },
      invoke: async <T>(rpc: string, params: Record<string, unknown>) => {
        calls.push({ rpc, params });
        return { ok: true, data: snapshot } as T;
      },
    });

    expect((await h.repository.restoreSession()).ok).toBe(true);
    const inbox = createInboxRepository(h.repository);
    expect(await inbox.resolveRoomResult(roomId, resultId)).toEqual({
      ok: true,
      data: { roomId, destination: 'result', resultId },
    });
    expect(calls).toEqual([{
      rpc: 'dish_session',
      params: {
        command: 'snapshot',
        payload: {
          contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
          roomId,
        },
      },
    }]);
  });

  test('rejects a snapshot for a different room and a malformed server result ID', async () => {
    const roomId = uuidFrom('requested-room');
    const repo = { getRoomSnapshot: jest.fn()
      .mockResolvedValueOnce({ ok: true, data: { roomId: uuidFrom('other-room'), state: 'DECIDED', result: { resultId: uuidFrom('result-a') } } })
      .mockResolvedValueOnce({ ok: true, data: { roomId, state: 'DECIDED', result: { resultId: 42 } } }),
    } as unknown as RoomRepository;
    const inbox = createInboxRepository(repo);

    expect(await inbox.resolveRoomResult(roomId, uuidFrom('result-a'))).toEqual({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
    expect(await inbox.resolveRoomResult(roomId, uuidFrom('result-a'))).toEqual({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
  });

  test('history cache is scoped to the authenticated identity and cleared after consent or logout cleanup', async () => {
    const personal = historyItem('personal-1', 'personal', '2026-10-17T12:00:00Z');
    const group = historyItem('group-1', 'group', '2026-10-16T12:00:00Z');
    const client = {
      callRpc: jest.fn().mockResolvedValue(historyEnvelope([personal, group])),
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
    expect(fetched.data.items.map(historyIdOf)).toEqual([uuidFrom('history-personal-1'), uuidFrom('history-group-1')]);
    expect(client.callRpc).toHaveBeenCalledWith('dish_session', { command: 'history', payload: { contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement' } });
    expect(history.cached()?.fetchedAt).toBe(fetched.data.fetchedAt);
    (client.callRpc as jest.Mock).mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    const offline = await history.fetch();
    expect(offline).toEqual({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    expect(history.cached()).toEqual(fetched.data);
    (client.callRpc as jest.Mock).mockResolvedValue(historyEnvelope([personal, group]));
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
      callRpc: jest.fn()
        .mockResolvedValueOnce(historyEnvelope([rowA]))
        .mockResolvedValueOnce(historyEnvelope([rowB])),
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
    expect(cache.get('user-1')?.items.map(historyIdOf)).toEqual([uuidFrom('history-A-history')]);

    activeUser = { ...user, id: 'user-2', displayName: 'Binh' };
    const second = await history.fetch();
    expect(second.ok).toBe(true);
    expect(cache.get('user-2')?.items.map(historyIdOf)).toEqual([uuidFrom('history-B-history')]);
    expect(durable.entries.get('user-1')?.value.items.map(historyIdOf)).toEqual([uuidFrom('history-A-history')]);
    expect(durable.entries.get('user-2')?.value.items.map(historyIdOf)).toEqual([uuidFrom('history-B-history')]);
  });

  test('drops a late A history response after switching to B', async () => {
    let activeUser: SessionUser | null = user;
    let resolveRequest: ((value: ReturnType<typeof historyEnvelope>) => void) | undefined;
    const pending = new Promise<ReturnType<typeof historyEnvelope>>(resolve => { resolveRequest = resolve; });
    const client = { callRpc: jest.fn(() => pending) } as unknown as ApiClient;
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
    resolveRequest?.(historyEnvelope([historyItem('late-A', 'personal', '2026-10-17T12:00:00Z')]));
    expect(await response).toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(cache.get('user-1')).toBeUndefined();
    expect(cache.get('user-2')).toBeUndefined();
    expect(durable.entries.size).toBe(0);
  });

  test.each(['delete', 'revoke'] as const)('does not cache a pending history read after %s ACK', async action => {
    let resolveRequest: ((value: ReturnType<typeof historyEnvelope>) => void) | undefined;
    const pending = new Promise<ReturnType<typeof historyEnvelope>>(resolve => { resolveRequest = resolve; });
    const client = {
      callRpc: jest.fn(() => pending),
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
    resolveRequest?.(historyEnvelope([historyItem('history-A', 'personal', '2026-10-17T12:00:00Z')]));
    expect(await pendingRead).toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(cache.get(user.id)).toBeUndefined();
    expect(durable.entries.size).toBe(0);
  });

  test('shared consent invalidation blocks a late response across history adapter instances', async () => {
    let resolveRequest: ((value: ReturnType<typeof historyEnvelope>) => void) | undefined;
    const pending = new Promise<ReturnType<typeof historyEnvelope>>(resolve => { resolveRequest = resolve; });
    const client = {
      callRpc: jest.fn(() => pending),
      updateHistoryConsent: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
    } as unknown as ApiClient;
    const roomRepository = {
      getCurrentUser: () => user,
      getApiClient: () => client,
      getSessionApi: () => undefined,
      getSessionStatus: () => 'active',
    } as unknown as RoomRepository;
    const cache = cacheMock();
    const durable = durableHistoryMock();
    const adapterA = createHistoryRepository(roomRepository, cache, durable);
    const adapterB = createHistoryRepository(roomRepository, cache, durable);
    const pendingRead = adapterA.fetch();
    expect((await adapterB.updateConsent({ scope: 'personal', consent: false })).ok).toBe(true);
    resolveRequest?.(historyEnvelope([historyItem('revoked-late', 'personal', new Date().toISOString())]));
    expect(await pendingRead).toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(cache.get(user.id)).toBeUndefined();
    expect(durable.entries.size).toBe(0);
  });

  test('a later concurrent consent ACK invalidates cache written after an earlier adapter ACK', async () => {
    let resolveFirstAck: ((result: { ok: true; data: undefined }) => void) | undefined;
    const firstAck = new Promise<{ ok: true; data: undefined }>(resolve => { resolveFirstAck = resolve; });
    const client = {
      callRpc: jest.fn().mockResolvedValue(historyEnvelope([historyItem('fresh-after-ack', 'personal', '2026-10-18T00:00:00Z')])),
      updateHistoryConsent: jest.fn()
        .mockImplementationOnce(() => firstAck)
        .mockResolvedValueOnce({ ok: true, data: undefined }),
    } as unknown as ApiClient;
    const roomRepository = {
      getCurrentUser: () => user,
      getApiClient: () => client,
      getSessionApi: () => undefined,
      getSessionStatus: () => 'active',
    } as unknown as RoomRepository;
    const cache = cacheMock();
    const durable = durableHistoryMock();
    const adapterA = createHistoryRepository(roomRepository, cache, durable);
    const adapterB = createHistoryRepository(roomRepository, cache, durable);

    const firstMutation = adapterA.updateConsent({ scope: 'personal', consent: false });
    expect((await adapterB.updateConsent({ scope: 'personal', consent: false })).ok).toBe(true);
    expect((await adapterB.fetch()).ok).toBe(true);
    expect(cache.get(user.id)).toBeDefined();

    resolveFirstAck?.({ ok: true, data: undefined });
    expect((await firstMutation).ok).toBe(true);
    expect(adapterA.cached()).toBeUndefined();
    expect(durable.entries.size).toBe(0);
  });

  test('filters canonical rows after item expiry and rejects memory snapshots older than 24 hours', () => {
    const roomRepository = {
      getCurrentUser: () => user,
      getApiClient: () => ({}),
      getSessionApi: () => undefined,
      getSessionStatus: () => 'active',
    } as unknown as RoomRepository;
    const cache = cacheMock();
    cache.set(user.id, {
      fetchedAt: new Date().toISOString(),
      items: [historyItem('expired', 'personal', new Date().toISOString())],
    });
    const expired = historyItem('expired', 'personal', new Date().toISOString());
    expired.expiresAt = new Date(Date.now() - 1).toISOString();
    cache.set(user.id, { fetchedAt: new Date().toISOString(), items: [expired] });
    const history = createHistoryRepository(roomRepository, cache, durableHistoryMock());
    expect(history.cached()?.items).toEqual([]);
    cache.set(user.id, { fetchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), items: [historyItem('old', 'personal', new Date().toISOString())] });
    expect(history.cached()).toBeUndefined();
  });

  test('feature API 401 invalidates the live session and requires recovery', async () => {
    const client = {
      callRpc: jest.fn().mockResolvedValue({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } }),
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
    expect(roomRepository.getSessionSnapshot()).toMatchObject({ status: 'active', user: { id: user.id } });
  });

  test('history adapter created before a real saved-session restore fetches for the restored identity', async () => {
    const stored: StoredSession = {
      accessToken: 'saved-access', refreshToken: 'saved-refresh',
      expiresAt: '2026-11-06T02:00:00Z', user,
    };
    const harness = liveSessionHarness({ savedSession: stored, invoke: async <T>() => ({ ok: true, data: { items: [] } } as T) });
    const history = createHistoryRepository(harness.repository, cacheMock(), durableHistoryMock());

    expect(harness.repository.getCurrentUser()).toBeNull();
    expect((await harness.repository.restoreSession()).ok).toBe(true);
    const result = await history.fetch();

    expect(result).toMatchObject({ ok: true, data: { items: [] } });
    expect(harness.repository.getCurrentUser()?.id).toBe(user.id);
  });

  test('feature API 401 on ApiClientImpl enters recovery and refreshes the same identity', async () => {
    const invoke = jest.fn()
      .mockRejectedValueOnce({ status: 401, body: { messageKey: 'AUTH_REQUIRED' } })
      .mockResolvedValue({ ok: true, data: { items: [] } });
    const harness = liveSessionHarness({ invoke });
    await harness.repository.createGuestSession('Minh');
    const history = createHistoryRepository(harness.repository, cacheMock(), durableHistoryMock());

    expect(await history.fetch()).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(harness.repository.getSessionSnapshot()).toMatchObject({ status: 'active', user: { id: user.id } });
    expect(harness.repository.getSessionSnapshot()).toMatchObject({ status: 'active', user: { id: user.id }, issue: 'none' });
    expect((await history.fetch()).ok).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(harness.auth.refresh).toHaveBeenCalledTimes(1);
  });

  test('drops a pending history response across logout and restore of the same identity', async () => {
    let resolveTransport: ((value: ReturnType<typeof historyEnvelope>) => void) | undefined;
    const pending = new Promise<ReturnType<typeof historyEnvelope>>(resolve => { resolveTransport = resolve; });
    const harness = liveSessionHarness({ invoke: async <T>() => await pending as T });
    await harness.repository.createGuestSession('Minh');
    const cache = cacheMock();
    const durable = durableHistoryMock();
    const history = createHistoryRepository(harness.repository, cache, durable);
    const staleRead = history.fetch();

    await harness.repository.logout();
    await harness.repository.createGuestSession('Minh');
    resolveTransport?.(historyEnvelope([historyItem('old-session-row', 'personal', '2026-11-06T00:00:00Z')]));

    expect(await staleRead).toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(cache.get(user.id)).toBeUndefined();
    expect(durable.entries.size).toBe(0);
  });

  test('drops a durable cache read from the previous auth epoch even when user ID is unchanged', async () => {
    let resolveCache: ((value: { value: HistorySnapshot }) => void) | undefined;
    const pendingCache = new Promise<{ value: HistorySnapshot }>(resolve => { resolveCache = resolve; });
    const durable: DurableHistoryStore = {
      cacheSnapshot: async () => undefined,
      readSnapshotCache: async <T>() => await pendingCache as { value: T },
      clearSnapshotCache: async () => undefined,
    };
    const harness = liveSessionHarness({ invoke: async <T>() => ({ ok: true, data: { items: [] } } as T) });
    await harness.repository.createGuestSession('Minh');
    const history = createHistoryRepository(harness.repository, cacheMock(), durable);
    const read = history.cachedDurable();

    await harness.repository.logout();
    await harness.repository.createGuestSession('Minh');
    resolveCache?.({ value: { items: [historyItem('previous-auth-epoch', 'personal', '2026-11-06T00:00:00Z')], fetchedAt: '2026-11-06T00:00:00Z' } });

    expect(await read).toBeUndefined();
  });
});
