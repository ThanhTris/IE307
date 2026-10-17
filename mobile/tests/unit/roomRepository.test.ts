import {
  LiveRoomRepository,
  createRoomRepository,
  createDurableRequestId,
  defaultPreferenceCatalogue,
} from '../../src/features/rooms/services/roomRepository';
import type {
  ApiClient,
  CreateRoomRequest,
  JoinRoomRequest,
  PreviewFoodPoolRequest,
  RoomSnapshot,
  SessionUser,
  UpdateContextRequest,
  UpdatePreferencesRequest,
} from '../../src/data/api/contracts';
import { SessionManager } from '../../src/data/auth/session';
import type { AuthPort, SessionApi, SessionStorage, StoredSession } from '../../src/data/auth/types';
import type { SessionStatus } from '../../src/features/rooms/services/sessionState';

describe('LiveRoomRepository (GM-25)', () => {
  const mockUser: SessionUser = {
    id: 'usr_test_001',
    displayName: 'Minh Trang',
    isGuest: true,
    createdAt: '2026-10-16T00:00:00Z',
  };

  const mockSnapshot: RoomSnapshot = {
    roomId: 'room_test_123',
    code: 'GCD789',
    hostUserId: 'usr_test_001',
    version: 1,
    state: 'LOBBY',
    context: {
      anchorId: 'anc_central_market',
      radiusM: 2000,
      mealSlot: 'lunch',
      desiredAt: '2026-10-16T12:00:00+07:00',
      serviceMode: 'dine_in',
      budget: 50000,
      avoidRecent: false,
    },
    members: [
      { userId: 'usr_test_001', displayName: 'Minh Trang', isHost: true, ready: false, joinedAt: '2026-10-16T00:00:00Z' },
    ],
    round: 1,
    poolVersion: 1,
    pool: [],
    expiresAt: '2026-10-16T14:00:00+07:00',
  };

  function createMockClient(): jest.Mocked<ApiClient> {
    return {
      createGuestSession: jest.fn().mockResolvedValue({ ok: true, data: { user: mockUser, token: 'tok_test', expiresAt: '2026-10-17T00:00:00Z' } }),
      restoreSession: jest.fn().mockResolvedValue({ ok: true, data: mockUser }),
      logout: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      listFriends: jest.fn().mockResolvedValue({ ok: true, data: [] }),
      getDiscoveryContext: jest.fn().mockResolvedValue({
        ok: true,
        data: {
          serverTime: '2026-10-16T10:00:00Z',
          anchors: [{ id: 'anc_1', name: 'Chợ Bến Thành', address: 'Quận 1', coverageId: 'hcm_center' }],
          suggestedRadiusM: 2000,
        },
      }),
      createRoom: jest.fn().mockResolvedValue({ ok: true, data: { roomId: 'room_test_123', code: 'GCD789', version: 1 } }),
      joinRoom: jest.fn().mockResolvedValue({ ok: true, data: { roomId: 'room_test_123', code: 'GCD789', version: 1 } }),
      getRoomSnapshot: jest.fn().mockResolvedValue({ ok: true, data: mockSnapshot }),
      previewFoodPool: jest.fn().mockResolvedValue({
        ok: true,
        data: {
          pool: [],
          totalCandidateCount: 0,
          datasetVersion: 'v1.0.0',
          eligibilityVersion: 'v1.0.0',
          evaluatedAt: '2026-10-16T10:00:00Z',
        },
      }),
      updateContext: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      updatePreferences: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      setReady: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      startRound: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      leaveRoom: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      cancelRoom: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      inviteToRoom: jest.fn().mockResolvedValue({
        ok: true,
        data: { inviteId: 'inv_1', roomId: 'room_test_123', senderId: 'usr_test_001', recipientId: 'usr_peer_002', status: 'pending', expiresAt: '2026-10-16T11:00:00Z' },
      }),
      submitBallot: jest.fn(),
      getResult: jest.fn(),
      getResultOfferings: jest.fn(),
      getHistory: jest.fn(),
      updateHistoryConsent: jest.fn(),
      getInbox: jest.fn(),
      invitePartner: jest.fn(),
      acceptPartnerInvite: jest.fn(),
      acceptRoomInvite: jest.fn(),
      rejectRoomInvite: jest.fn(),
      registerPushDevice: jest.fn(),
      unregisterPushDevice: jest.fn(),
    } as unknown as jest.Mocked<ApiClient>;
  }

  function createMockSession(): jest.Mocked<SessionApi> & { getStatus: jest.Mock<SessionStatus> } {
    return {
      restoreSession: jest.fn().mockResolvedValue({ ok: true, data: mockUser }),
      createGuestSession: jest.fn().mockResolvedValue({ ok: true, requestId: 'guest', data: { user: mockUser, token: 'tok_test', expiresAt: '2026-10-17T00:00:00Z' } }),
      logout: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      getAccessToken: jest.fn().mockResolvedValue({ ok: true, data: 'tok_test' }),
      refreshSession: jest.fn().mockResolvedValue({ ok: true, data: mockUser }),
      getGeneration: jest.fn().mockReturnValue(1),
      getStatus: jest.fn<SessionStatus, []>().mockReturnValue('active'),
    } as unknown as jest.Mocked<SessionApi> & { getStatus: jest.Mock<SessionStatus> };
  }

  function createSessionStorage(record: StoredSession | null): jest.Mocked<SessionStorage> {
    return {
      load: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('requires ApiClient on construction', () => {
    expect(() => new LiveRoomRepository({ client: null as any })).toThrow();
  });

  it('generates durable request IDs with timestamp and entropy', () => {
    const id1 = createDurableRequestId('test');
    const id2 = createDurableRequestId('test');
    expect(id1.startsWith('test_')).toBe(true);
    expect(id2.startsWith('test_')).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it('delegates restoreSession to SessionApi when available', async () => {
    const client = createMockClient();
    const session = createMockSession();
    const repo = createRoomRepository({ client, session });

    const result = await repo.restoreSession();
    expect(result.ok).toBe(true);
    expect(session.restoreSession).toHaveBeenCalled();
    expect(repo.getCurrentUser()?.displayName).toBe('Minh Trang');
  });

  it('publishes a token-free no-session state when secure storage is empty', async () => {
    const client = createMockClient();
    const session = createMockSession();
    session.restoreSession.mockResolvedValueOnce({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    session.getStatus.mockReturnValue('lost');
    const repo = createRoomRepository({ client, session, sessionStorage: createSessionStorage(null) });
    const listener = jest.fn();
    repo.subscribeSession(listener);

    await repo.restoreSession();

    expect(repo.getSessionSnapshot()).toEqual({ status: 'empty', user: null, issue: 'no-session' });
    expect(repo.getSessionSnapshot()).not.toHaveProperty('accessToken');
    expect(listener).toHaveBeenCalled();
  });

  it('does not relabel a revoked stored session as a fresh guest opportunity', async () => {
    const client = createMockClient();
    const session = createMockSession();
    session.restoreSession.mockResolvedValueOnce({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    session.getStatus.mockReturnValue('lost');
    const storage = createSessionStorage({} as StoredSession);
    const repo = createRoomRepository({ client, session, sessionStorage: storage });

    await repo.restoreSession();

    expect(repo.getSessionSnapshot()).toMatchObject({ status: 'lost', issue: 'session-revoked' });
    expect(storage.load).toHaveBeenCalled();
  });

  it('retains a retryable restore error when stored credentials cannot be verified online', async () => {
    const client = createMockClient();
    const session = createMockSession();
    session.restoreSession.mockResolvedValueOnce({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    const storage = createSessionStorage({} as StoredSession);
    const repo = createRoomRepository({ client, session, sessionStorage: storage });

    await repo.restoreSession();

    expect(repo.getSessionSnapshot()).toMatchObject({ status: 'empty', issue: 'restore-unavailable' });
    expect(storage.clear).not.toHaveBeenCalled();
  });

  it('blocks a second signup after an ambiguous guest-creation response', async () => {
    const client = createMockClient();
    const session = createMockSession();
    session.createGuestSession.mockResolvedValueOnce({ ok: false, error: { messageKey: 'TIMEOUT' } });
    session.getStatus.mockReturnValue('blocked');
    const repo = createRoomRepository({ client, session });

    await repo.createGuestSession('Trang');

    expect(repo.getSessionSnapshot()).toMatchObject({ status: 'blocked', issue: 'signup-uncertain' });
  });

  it('delegates createGuestSession and updates currentUser', async () => {
    const client = createMockClient();
    const session = createMockSession();
    const repo = createRoomRepository({ client, session });

    const result = await repo.createGuestSession('Trang Test');
    expect(result.ok).toBe(true);
    expect(session.createGuestSession).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Trang Test' })
    );
    expect(repo.getCurrentUser()?.id).toBe('usr_test_001');
  });

  it('clears currentUser on logout', async () => {
    const client = createMockClient();
    const session = createMockSession();
    const repo = createRoomRepository({ client, session });

    await repo.restoreSession();
    expect(repo.getCurrentUser()).not.toBeNull();
    await repo.logout();
    expect(repo.getCurrentUser()).toBeNull();
  });

  it('requires explicit session recovery after an API rejects the active token', async () => {
    const client = createMockClient();
    const session = createMockSession();
    const repo = createRoomRepository({ client, session });
    await repo.restoreSession();
    client.listFriends.mockResolvedValueOnce({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });

    expect(await repo.listFriends()).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(repo.getSessionSnapshot()).toMatchObject({
      status: 'lost', user: null, issue: 'session-recovery-required',
    });

    expect(await repo.listFriends()).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(client.listFriends).toHaveBeenCalledTimes(1);

    session.refreshSession.mockResolvedValueOnce({ ok: true, data: mockUser });
    expect((await repo.restoreSession()).ok).toBe(true);
    expect(session.refreshSession).toHaveBeenCalledTimes(1);
    expect(session.restoreSession).toHaveBeenCalledTimes(1);
    expect(repo.getSessionSnapshot()).toMatchObject({ status: 'active', user: mockUser, issue: 'none' });

    expect((await repo.listFriends()).ok).toBe(true);
    expect(client.listFriends).toHaveBeenCalledTimes(2);
  });

  it('refreshes a rejected token through the real SessionManager before allowing another API request', async () => {
    const client = createMockClient();
    const saved: StoredSession = {
      accessToken: 'old_access', refreshToken: 'old_refresh',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), user: mockUser,
    };
    const rotated: StoredSession = {
      ...saved, accessToken: 'new_access', refreshToken: 'new_refresh',
      expiresAt: new Date(Date.now() + 7200000).toISOString(),
    };
    const storage = createSessionStorage(saved);
    const auth: jest.Mocked<AuthPort> = {
      createGuest: jest.fn(),
      verify: jest.fn().mockResolvedValue(mockUser),
      refresh: jest.fn().mockResolvedValue(rotated),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    const session = new SessionManager({ auth, storage, clearPrivateData: jest.fn().mockResolvedValue(undefined) });
    const repo = createRoomRepository({ client, session, sessionStorage: storage });
    await repo.restoreSession();
    client.listFriends.mockResolvedValueOnce({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });

    await repo.listFriends();
    expect(repo.getSessionSnapshot()).toMatchObject({ status: 'lost', issue: 'session-recovery-required', user: null });
    expect(await repo.listFriends()).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(client.listFriends).toHaveBeenCalledTimes(1);

    expect((await repo.restoreSession()).ok).toBe(true);
    expect(auth.refresh).toHaveBeenCalledWith('old_refresh');
    expect(storage.save).toHaveBeenLastCalledWith(rotated);
    expect(await session.getAccessToken()).toEqual({ ok: true, data: 'new_access' });
    expect(repo.getSessionSnapshot()).toMatchObject({ status: 'active', issue: 'none', user: mockUser });
    expect((await repo.listFriends()).ok).toBe(true);
    expect(client.listFriends).toHaveBeenCalledTimes(2);
  });

  it('discards an in-flight success after another request reports AUTH_REQUIRED', async () => {
    const client = createMockClient();
    const session = createMockSession();
    const repo = createRoomRepository({ client, session });
    await repo.restoreSession();
    let resolveFirst!: (result: Awaited<ReturnType<ApiClient['listFriends']>>) => void;
    client.listFriends
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });

    const staleRead = repo.listFriends();
    const rejectedRead = repo.listFriends();
    await rejectedRead;
    resolveFirst({ ok: true, data: [{ id: 'friend_old', friendUserId: 'usr_old', friendCode: 'OLD234', displayName: 'Phiên trước', status: 'active', since: '2026-10-16T00:00:00Z' }] });

    expect(await staleRead).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect(repo.getSessionSnapshot()).toMatchObject({ status: 'lost', user: null, issue: 'session-recovery-required' });
  });

  it('delegates discovery and room entry operations', async () => {
    const client = createMockClient();
    const repo = createRoomRepository({ client });

    await repo.restoreSession();

    await repo.getDiscoveryContext();
    expect(client.getDiscoveryContext).toHaveBeenCalled();

    await repo.listFriends();
    expect(client.listFriends).toHaveBeenCalled();

    const createReq: CreateRoomRequest = {
      displayName: 'Minh',
      context: mockSnapshot.context,
    };
    const created = await repo.createRoom(createReq);
    expect(created.ok).toBe(true);
    expect(client.createRoom).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Minh', requestId: expect.any(String) })
    );

    const joinReq: JoinRoomRequest = { code: 'GCD789', displayName: 'Hà' };
    const joined = await repo.joinRoom(joinReq);
    expect(joined.ok).toBe(true);
    expect(client.joinRoom).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'GCD789', displayName: 'Hà', requestId: expect.any(String) })
    );

    const snapshot = await repo.getRoomSnapshot('room_test_123');
    expect(snapshot.ok).toBe(true);
    expect(client.getRoomSnapshot).toHaveBeenCalledWith('room_test_123');
  });

  it('createRoom and joinRoom require an existing session and never create a guest implicitly', async () => {
    const client = createMockClient();
    const repo = createRoomRepository({ client });

    const create = await repo.createRoom({ displayName: 'Minh', context: mockSnapshot.context, requestId: 'create-without-session' });
    const join = await repo.joinRoom({ code: 'GCD789', displayName: 'Hà', requestId: 'join-without-session' });

    expect(create).toMatchObject({ ok: false, requestId: 'create-without-session', error: { messageKey: 'AUTH_REQUIRED' } });
    expect(join).toMatchObject({ ok: false, requestId: 'join-without-session', error: { messageKey: 'AUTH_REQUIRED' } });
    expect(client.createGuestSession).not.toHaveBeenCalled();
    expect(client.createRoom).not.toHaveBeenCalled();
    expect(client.joinRoom).not.toHaveBeenCalled();
  });

  it('delegates room setup operations (context and preferences)', async () => {
    const client = createMockClient();
    const repo = createRoomRepository({ client });

    const previewReq: PreviewFoodPoolRequest = {
      anchorId: 'anc_1',
      radiusM: 2000,
      mealSlot: 'lunch',
      serviceMode: 'dine_in',
      desiredAt: '2026-10-16T12:00:00Z',
    };
    await repo.previewFoodPool(previewReq);
    expect(client.previewFoodPool).toHaveBeenCalledWith(previewReq);

    const updateCtxReq: UpdateContextRequest = {
      roomId: 'room_test_123',
      expectedVersion: 1,
      context: mockSnapshot.context,
    };
    await repo.updateContext(updateCtxReq);
    expect(client.updateContext).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room_test_123', expectedVersion: 1, requestId: expect.any(String) })
    );

    const updatePrefReq: UpdatePreferencesRequest = {
      roomId: 'room_test_123',
      expectedVersion: 1,
      preferences: { cuisineIds: ['cui_vietnam'], categoryIds: [], historyConsent: true },
    };
    await repo.updatePreferences(updatePrefReq);
    expect(client.updatePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room_test_123', expectedVersion: 1, requestId: expect.any(String) })
    );
  });

  it('delegates lobby actions (setReady, startRound, leaveRoom, cancelRoom, inviteToRoom)', async () => {
    const client = createMockClient();
    const repo = createRoomRepository({ client });

    await repo.setReady({ roomId: 'room_test_123', expectedVersion: 1, ready: true });
    expect(client.setReady).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room_test_123', expectedVersion: 1, ready: true, requestId: expect.any(String) })
    );

    await repo.startRound({ roomId: 'room_test_123', expectedVersion: 2 });
    expect(client.startRound).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room_test_123', expectedVersion: 2, requestId: expect.any(String) })
    );

    await repo.leaveRoom({ roomId: 'room_test_123', expectedVersion: 3 });
    expect(client.leaveRoom).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room_test_123', expectedVersion: 3, requestId: expect.any(String) })
    );

    await repo.cancelRoom({ roomId: 'room_test_123', expectedVersion: 4, confirmCancel: true });
    expect(client.cancelRoom).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room_test_123', expectedVersion: 4, confirmCancel: true, requestId: expect.any(String) })
    );

    await repo.inviteToRoom({ roomId: 'room_test_123', expectedVersion: 5, partnerId: 'usr_peer_002' });
    expect(client.inviteToRoom).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'room_test_123', expectedVersion: 5, partnerId: 'usr_peer_002', requestId: expect.any(String) })
    );
  });

  it('preserves caller requestId when specified for idempotent retry', async () => {
    const client = createMockClient();
    const repo = createRoomRepository({ client });
    await repo.restoreSession();

    const specifiedId = 'req_idempotent_fixed_123';
    await repo.createRoom({
      displayName: 'Minh',
      context: mockSnapshot.context,
      requestId: specifiedId,
    });
    expect(client.createRoom).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: specifiedId })
    );
  });

  it('exposes defaultPreferenceCatalogue matching taxonomy', () => {
    expect(defaultPreferenceCatalogue.cuisines.length).toBeGreaterThan(0);
    expect(defaultPreferenceCatalogue.categories.length).toBeGreaterThan(0);
  });
});
