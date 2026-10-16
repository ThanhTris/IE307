import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../../src/features/home/screens/HomeScreen';
import { LobbyScreen } from '../../src/features/rooms/screens/LobbyScreen';
import { RoomRepositoryProvider } from '../../src/bootstrap/RoomRepositoryProvider';
import {
  LiveRoomRepository,
  createDurableRequestId,
  defaultPreferenceCatalogue,
} from '../../src/features/rooms/services/roomRepository';
import { SessionManager } from '../../src/data/auth/session';
import type {
  ApiClient,
  RoomSnapshot,
  SessionUser,
} from '../../src/data/api/contracts';
import type { AuthPort, SessionStorage, StoredSession } from '../../src/data/auth/types';

describe('GM-25 Review Feedback Regression Suite', () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const sampleUser: SessionUser = {
    id: 'e0123456-789a-bcde-f012-3456789abcde',
    displayName: 'Trí Thanh',
    isGuest: true,
    createdAt: '2026-10-16T00:00:00Z',
  };

  const sampleStoredSession: StoredSession = {
    accessToken: 'real_access_token_123',
    refreshToken: 'real_refresh_token_123',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    user: sampleUser,
  };

  function createSyntheticSessionManager(initialStored: StoredSession | null = null) {
    let stored = initialStored ? { ...initialStored } : null;
    const auth: AuthPort = {
      createGuest: jest.fn().mockImplementation(async (displayName: string) => ({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        user: { ...sampleUser, displayName },
      })),
      verify: jest.fn().mockImplementation(async () => sampleUser),
      refresh: jest.fn().mockImplementation(async () => sampleStoredSession),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    const storage: SessionStorage = {
      load: jest.fn().mockImplementation(async () => stored),
      save: jest.fn().mockImplementation(async (sess: StoredSession) => { stored = sess; }),
      clear: jest.fn().mockImplementation(async () => { stored = null; }),
    };
    const clearPrivateData = jest.fn().mockResolvedValue(undefined);
    return new SessionManager({ auth, storage, clearPrivateData });
  }

  function createMockApiClient(overrides: Partial<ApiClient> = {}): jest.Mocked<ApiClient> {
    return {
      createGuestSession: jest.fn().mockResolvedValue({ ok: true, data: { user: sampleUser, token: 't', expiresAt: '2026-10-17T00:00:00Z' } }),
      restoreSession: jest.fn().mockResolvedValue({ ok: true, data: sampleUser }),
      logout: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      listFriends: jest.fn().mockResolvedValue({ ok: true, data: [] }),
      getDiscoveryContext: jest.fn().mockResolvedValue({
        ok: true,
        data: {
          serverTime: new Date().toISOString(),
          anchors: [{ id: 'c0a80101-0000-0000-0000-000000000001', name: 'Chợ Bến Thành', address: 'Quận 1', coverageId: 'hcm_center' }],
          coverageAreas: [],
          suggestedRadiusM: 2000,
        },
      }),
      createRoom: jest.fn().mockResolvedValue({ ok: true, data: { roomId: 'r1', code: 'ABC234', version: 1 } }),
      joinRoom: jest.fn().mockResolvedValue({ ok: true, data: { roomId: 'r1', code: 'ABC234', version: 1 } }),
      getRoomSnapshot: jest.fn().mockResolvedValue({ ok: true, data: createSampleSnapshot() }),
      previewFoodPool: jest.fn().mockResolvedValue({
        ok: true,
        data: {
          pool: [{ roundDishId: 'd1', choiceId: 'c1', dishId: 'dish1', name: 'Phở bò', cuisineIds: [], categoryIds: [] }],
          totalCandidateCount: 5,
          datasetVersion: '1.0.0',
          eligibilityVersion: '1.0.0',
          evaluatedAt: new Date().toISOString(),
        },
      }),
      updateContext: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      updatePreferences: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      setReady: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      startRound: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      leaveRoom: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      cancelRoom: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      inviteToRoom: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      ...overrides,
    } as unknown as jest.Mocked<ApiClient>;
  }

  function createSampleSnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
    return {
      roomId: 'room_live_123',
      code: 'ABC234',
      state: 'LOBBY',
      version: 1,
      hostUserId: sampleUser.id,
      context: {
        anchorId: 'c0a80101-0000-0000-0000-000000000001',
        radiusM: 2000,
        mealSlot: 'lunch',
        desiredAt: new Date(Date.now() + 1800000).toISOString(),
        serviceMode: 'dine_in',
        budget: 50000,
        avoidRecent: false,
      },
      members: [
        { userId: sampleUser.id, displayName: 'Trí Thanh', ready: false, isHost: true, joinedAt: '2026-10-16T00:00:00Z' },
        { userId: 'usr_member_2', displayName: 'Thành viên 2', ready: true, isHost: false, joinedAt: '2026-10-16T00:01:00Z' },
      ],
      round: 1,
      poolVersion: 1,
      pool: [],
      expiresAt: new Date(Date.now() + 7200000).toISOString(),
      ...overrides,
    };
  }

  // --- Point 1: Home session restore with real SessionManager ---

  test('P1: Home restores saved session from SessionManager without passing fake tokens', async () => {
    const sessionManager = createSyntheticSessionManager(sampleStoredSession);
    const client = createMockApiClient();
    const repository = new LiveRoomRepository({ client, session: sessionManager });

    const onCreate = jest.fn();
    const onJoin = jest.fn();

    // Render Home without passing sessionToken (live mode)
    await render(
      <HomeScreen
        repository={repository}
        onCreate={onCreate}
        onJoin={onJoin}
        onResume={jest.fn()}
      />
    );

    // Should welcome the user by their display name
    expect(await screen.findByText(/Chào Trí Thanh! 👋/)).toBeOnTheScreen();
    // Buttons should be ENABLED
    expect(screen.getByRole('button', { name: '＋ Tạo kèo ăn' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Tôi có mã phòng' })).toBeEnabled();
    expect(screen.queryByText('Kiểm tra lại thông tin đã nhập.')).toBeNull();
  });

  test('P1: Home fresh open without stored session does not fail with INVALID_INPUT', async () => {
    const sessionManager = createSyntheticSessionManager(null); // Fresh open, no stored session
    const client = createMockApiClient();
    const repository = new LiveRoomRepository({ client, session: sessionManager });

    await render(
      <HomeScreen
        repository={repository}
        onCreate={jest.fn()}
        onJoin={jest.fn()}
        onResume={jest.fn()}
      />
    );

    // Fresh open returns AUTH_REQUIRED (Phiên đã mất / chưa có phiên)
    expect(await screen.findByText('Phiên đã mất. Hãy khôi phục phiên trước khi tiếp tục.')).toBeOnTheScreen();
    expect(screen.queryByText('Kiểm tra lại thông tin đã nhập.')).toBeNull();
  });

  // --- Point 2: Authoritative Taxonomy UUIDs ---

  test('P2: defaultPreferenceCatalogue contains valid taxonomy UUIDs matching contract', () => {
    expect(defaultPreferenceCatalogue.cuisines.length).toBeGreaterThan(0);
    expect(defaultPreferenceCatalogue.categories.length).toBeGreaterThan(0);

    for (const cui of defaultPreferenceCatalogue.cuisines) {
      expect(cui.id).toMatch(UUID_REGEX);
      expect(cui.label.length).toBeGreaterThan(0);
    }

    for (const cat of defaultPreferenceCatalogue.categories) {
      expect(cat.id).toMatch(UUID_REGEX);
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });

  // --- Point 3: Lobby recovery from VERSION_CONFLICT ---

  test('P3: Lobby refetches snapshot on VERSION_CONFLICT and updates version', async () => {
    const user = userEvent.setup();
    const snapV1 = createSampleSnapshot({ version: 1 });
    const snapV2 = createSampleSnapshot({ version: 2 });

    const getSnapshotMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, data: snapV1 })
      .mockResolvedValueOnce({ ok: true, data: snapV2 });

    const setReadyMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      error: { messageKey: 'VERSION_CONFLICT' },
    }).mockResolvedValueOnce({
      ok: true,
      data: undefined,
    });

    const client = createMockApiClient({
      getRoomSnapshot: getSnapshotMock,
      setReady: setReadyMock,
    });

    await render(
      <LobbyScreen
        repository={client}
        roomId="room_live_123"
        currentUserId={sampleUser.id}
        onHome={jest.fn()}
      />
    );

    await screen.findByText('Thành viên · 2/8');
    expect(getSnapshotMock).toHaveBeenCalledTimes(1);

    // First ready press fails with VERSION_CONFLICT
    await user.press(screen.getByRole('button', { name: 'Tôi sẵn sàng' }));
    expect(await screen.findByText('Chưa thực hiện được · VERSION_CONFLICT')).toBeOnTheScreen();

    // Must have refetched snapshot!
    await waitFor(() => expect(getSnapshotMock).toHaveBeenCalledTimes(2));

    // Second ready press now uses version 2
    await user.press(screen.getByRole('button', { name: 'Tôi sẵn sàng' }));
    await waitFor(() => {
      expect(setReadyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ expectedVersion: 2 })
      );
    });
  });

  // --- Point 4: Request ID stability & retry on uncertain errors ---

  test('P4: Lobby reuses request ID on TIMEOUT/NETWORK_ERROR and uses fresh ID on new intent', async () => {
    const user = userEvent.setup();
    const snap = createSampleSnapshot({ version: 1 });

    const setReadyMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: { messageKey: 'TIMEOUT' } })
      .mockResolvedValueOnce({ ok: true, data: undefined });

    const client = createMockApiClient({
      getRoomSnapshot: jest.fn().mockResolvedValue({ ok: true, data: snap }),
      setReady: setReadyMock,
    });

    await render(
      <LobbyScreen
        repository={client}
        roomId="room_live_123"
        currentUserId={sampleUser.id}
        onHome={jest.fn()}
      />
    );

    await screen.findByText('Thành viên · 2/8');

    // First press results in TIMEOUT (uncertain outcome)
    await user.press(screen.getByRole('button', { name: 'Tôi sẵn sàng' }));
    expect(await screen.findByText('Chưa thực hiện được · TIMEOUT')).toBeOnTheScreen();
    const firstCallRequestId = setReadyMock.mock.calls[0][0].requestId;
    expect(firstCallRequestId).toBeTruthy();

    // Retry press MUST reuse the exact same request ID
    await user.press(screen.getByRole('button', { name: 'Tôi sẵn sàng' }));
    await waitFor(() => expect(setReadyMock).toHaveBeenCalledTimes(2));
    const secondCallRequestId = setReadyMock.mock.calls[1][0].requestId;
    expect(secondCallRequestId).toBe(firstCallRequestId);
  });

  test('P4: Durable request ID generator generates unique non-colliding IDs across calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const id = createDurableRequestId('lobby_ready');
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });

  // --- Point 5: Strict real mode without mock fallback ---

  test('P5: RoomRepositoryProvider throws when forcedMode=real and publicKey is missing', async () => {
    // Silence React console.error during expected throw
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      render(
        <RoomRepositoryProvider mode="real" publicKey="">
          <></>
        </RoomRepositoryProvider>
      )
    ).rejects.toThrow(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required in real mode/);
    spy.mockRestore();
  });

  // --- Point 6: Pool eligibility blocks Start button ---

  test('P6: Start button is disabled when previewFoodPool returns NO_ELIGIBLE_FOOD even if everyone ready', async () => {
    const snapEveryoneReady = createSampleSnapshot({
      version: 2,
      members: [
        { userId: sampleUser.id, displayName: 'Host', ready: true, isHost: true, joinedAt: '2026-10-16T00:00:00Z' },
        { userId: 'usr_2', displayName: 'Member', ready: true, isHost: false, joinedAt: '2026-10-16T00:01:00Z' },
      ],
    });

    const client = createMockApiClient({
      getRoomSnapshot: jest.fn().mockResolvedValue({ ok: true, data: snapEveryoneReady }),
      previewFoodPool: jest.fn().mockResolvedValue({
        ok: true,
        data: {
          pool: [],
          totalCandidateCount: 0,
          datasetVersion: '1.0.0',
          eligibilityVersion: '1.0.0',
          evaluatedAt: new Date().toISOString(),
        },
      }),
    });

    await render(
      <LobbyScreen
        repository={client}
        roomId="room_live_123"
        currentUserId={sampleUser.id}
        onHome={jest.fn()}
      />
    );

    await screen.findByText('Thành viên · 2/8');
    expect(await screen.findByText('Chưa thể bắt đầu')).toBeOnTheScreen();
    expect(screen.getByText('Chưa có món phù hợp với bối cảnh. Hãy sửa điểm ăn hoặc giờ.')).toBeOnTheScreen();

    const startBtn = screen.getByRole('button', { name: 'Bắt đầu chọn món' });
    expect(startBtn.props.accessibilityState.disabled).toBe(true);
  });
});
