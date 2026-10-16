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
import type { SessionApi } from '../../src/data/auth/types';

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

  function createMockSession(): jest.Mocked<SessionApi> {
    let currentUser: SessionUser | null = mockUser;
    let currentStatus = 'active';
    return {
      restoreSession: jest.fn().mockImplementation(async () => ({ ok: true, data: mockUser })),
      createGuestSession: jest.fn().mockImplementation(async req => ({
        ok: true,
        requestId: req.requestId,
        data: { user: mockUser, token: 'tok_test', expiresAt: '2026-10-17T00:00:00Z' },
      })),
      logout: jest.fn().mockImplementation(async () => {
        currentUser = null;
        currentStatus = 'lost';
        return { ok: true, data: undefined };
      }),
      getAccessToken: jest.fn().mockResolvedValue({ ok: true, data: 'tok_test' }),
      refreshSession: jest.fn().mockResolvedValue({ ok: true, data: mockUser }),
      getGeneration: jest.fn().mockReturnValue(1),
      getActiveUser: jest.fn().mockImplementation(() => currentUser),
      getStatus: jest.fn().mockImplementation(() => currentStatus),
    } as unknown as jest.Mocked<SessionApi>;
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

  it('delegates discovery and room entry operations', async () => {
    const client = createMockClient();
    const repo = createRoomRepository({ client });

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
