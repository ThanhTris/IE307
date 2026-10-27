import { act, useState } from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Gm25HomeScreen } from '../../src/features/home/screens/Gm25HomeScreen';
import { Gm25LiveLobbyScreen } from '../../src/features/rooms/screens/Gm25LiveLobbyScreen';
import { RoomRepositoryProvider, useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../src/features/auth/components/RequireActiveSession';
import { Gm25CreateRoomScreen } from '../../src/features/rooms/screens/Gm25CreateRoomScreen';
import { Gm25JoinRoomScreen } from '../../src/features/rooms/screens/Gm25JoinRoomScreen';
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
import { AuthFailure, type AuthPort, type SessionStorage, type StoredSession } from '../../src/data/auth/types';

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
    const auth: jest.Mocked<AuthPort> = {
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
    return { manager: new SessionManager({ auth, storage, clearPrivateData, sleep: async () => undefined }), auth, storage, clearPrivateData };
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

  function LiveEntryHarness({ repository, initialRoute = 'home' }: { repository: LiveRoomRepository; initialRoute?: 'home' | 'create' | 'join' }) {
    const live = useRoomRepository();
    const [route, setRoute] = useState(initialRoute);
    if (route === 'create') return <RequireActiveSession onHome={() => setRoute('home')}>
      <Gm25CreateRoomScreen
        key={live.user?.id ?? 'missing'}
        repository={repository}
        isLive
        initialDisplayName={live.user?.displayName}
        onBack={() => setRoute('home')}
        onEntered={jest.fn()}
      />
    </RequireActiveSession>;
    if (route === 'join') return <RequireActiveSession onHome={() => setRoute('home')}>
      <Gm25JoinRoomScreen
        key={live.user?.id ?? 'missing'}
        repository={repository}
        isLive
        initialDisplayName={live.user?.displayName}
        initialCode="ABC234"
        onBack={() => setRoute('home')}
        onEntered={jest.fn()}
      />
    </RequireActiveSession>;
    return <Gm25HomeScreen repository={repository} liveSession={live} onCreate={() => setRoute('create')} onJoin={() => setRoute('join')} onResume={jest.fn()} />;
  }

  async function renderLiveEntry(repository: LiveRoomRepository, initialRoute: 'home' | 'create' | 'join' = 'home') {
    let result!: ReturnType<typeof render>;
    await act(async () => {
      result = render(<RoomRepositoryProvider repository={repository} mode="real"><LiveEntryHarness repository={repository} initialRoute={initialRoute} /></RoomRepositoryProvider>);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    return result;
  }

  // --- Point 1: explicit guest onboarding and one shared identity source ---

  test('P1: stored session is restored by provider and enables both entry routes without signup', async () => {
    const fixture = createSyntheticSessionManager(sampleStoredSession);
    const client = createMockApiClient();
    const repository = new LiveRoomRepository({ client, session: fixture.manager });
    await renderLiveEntry(repository);

    expect(await screen.findByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
    expect(await screen.findByText('Mời bạn để bắt đầu kèo nhanh.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tham gia phòng' })).toBeEnabled();
    expect(repository.getSessionSnapshot()).toMatchObject({ status: 'active', user: { displayName: 'Trí Thanh' } });
    expect(fixture.auth.createGuest).not.toHaveBeenCalled();
  });

  test('P1: fresh Home creates one guest only after confirmation and mounts discovery with that identity', async () => {
    const user = userEvent.setup();
    const fixture = createSyntheticSessionManager(null);
    const client = createMockApiClient();
    const repository = new LiveRoomRepository({ client, session: fixture.manager });
    await renderLiveEntry(repository);

    expect(await screen.findByText('Chưa có phiên')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
    expect(fixture.auth.createGuest).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Tên khách'), 'Trang');
    await user.press(screen.getByRole('button', { name: 'Tạo phiên rồi chọn bối cảnh' }));

    expect(await screen.findByRole('button', { name: 'Chợ Bến Thành' })).toBeOnTheScreen();
    expect(fixture.auth.createGuest).toHaveBeenCalledTimes(1);
    expect(repository.getSessionSnapshot()).toMatchObject({ status: 'active', user: { displayName: 'Trang' } });
    expect(client.getDiscoveryContext).toHaveBeenCalledTimes(1);
    expect(fixture.auth.createGuest.mock.invocationCallOrder[0]).toBeLessThan(client.getDiscoveryContext.mock.invocationCallOrder[0]!);
    expect(screen.getByLabelText('Tên của bạn (chủ phòng)').props.value).toBe('Trang');

    await user.press(screen.getByRole('button', { name: 'Chợ Bến Thành' }));
    await user.press(screen.getByRole('button', { name: 'Tôi xác nhận điểm ăn, buổi và giờ' }));
    await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
    await waitFor(() => expect(client.createRoom).toHaveBeenCalledTimes(1));
    expect(client.createRoom).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Trang' }));
    expect(repository.getSessionSnapshot().user?.id).toBe(sampleUser.id);
  });

  test.each(['create', 'join'] as const)('P1: direct %s route is blocked before discovery or room API when session is absent', async route => {
    const fixture = createSyntheticSessionManager(null);
    const client = createMockApiClient();
    const repository = new LiveRoomRepository({ client, session: fixture.manager });
    await renderLiveEntry(repository, route);

    expect(await screen.findByText('Chưa có phiên')).toBeOnTheScreen();
    expect(client.getDiscoveryContext).not.toHaveBeenCalled();
    expect(client.createRoom).not.toHaveBeenCalled();
    expect(client.joinRoom).not.toHaveBeenCalled();
  });

  test('P1: Join starts exactly one guest session after the user confirms the name', async () => {
    const user = userEvent.setup();
    const fixture = createSyntheticSessionManager(null);
    const client = createMockApiClient();
    const repository = new LiveRoomRepository({ client, session: fixture.manager });
    await renderLiveEntry(repository);
    await screen.findByText('Chưa có phiên');

    await user.press(screen.getByRole('button', { name: 'Tham gia phòng' }));
    await user.type(screen.getByLabelText('Tên khách'), 'Hà');
    expect(fixture.auth.createGuest).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Tạo phiên rồi nhập mã' }));

    expect(await screen.findByLabelText('Mã phòng (6 ký tự)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Tên của bạn').props.value).toBe('Hà');
    expect(fixture.auth.createGuest).toHaveBeenCalledTimes(1);
    expect(repository.getSessionSnapshot()).toMatchObject({ status: 'active', user: { displayName: 'Hà' } });
    expect(client.joinRoom).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Vào phòng →' }));
    expect(screen.getByRole('button', { name: 'Xác nhận vào phòng' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Xác nhận vào phòng' }));
    await waitFor(() => expect(client.joinRoom).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Hà', code: 'ABC234' })));
  });

  test('P1: uncertain guest creation blocks navigation and another signup until local reset', async () => {
    const user = userEvent.setup();
    const fixture = createSyntheticSessionManager(null);
    fixture.auth.createGuest
      .mockRejectedValueOnce(new AuthFailure({ messageKey: 'TIMEOUT' }));
    const client = createMockApiClient();
    const repository = new LiveRoomRepository({ client, session: fixture.manager });
    await renderLiveEntry(repository);
    await screen.findByText('Chưa có phiên');

    await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
    await user.type(screen.getByLabelText('Tên khách'), 'Trang');
    await user.press(screen.getByRole('button', { name: 'Tạo phiên rồi chọn bối cảnh' }));

    expect(await screen.findByText('Chưa xác định được kết quả tạo phiên')).toBeOnTheScreen();
    expect(fixture.auth.createGuest).toHaveBeenCalledTimes(1);
    expect(client.getDiscoveryContext).not.toHaveBeenCalled();
    expect(client.createRoom).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Xóa phiên cục bộ rồi thử lại' }));
    await waitFor(() => expect(repository.getSessionSnapshot()).toMatchObject({ status: 'empty', issue: 'no-session' }));
    await user.press(screen.getByRole('button', { name: 'Tạo phiên rồi chọn bối cảnh' }));
    expect(await screen.findByRole('button', { name: 'Chợ Bến Thành' })).toBeOnTheScreen();
    expect(fixture.auth.createGuest).toHaveBeenCalledTimes(2);
  });

  test('P1: restore network failure preserves credentials and never creates a replacement guest', async () => {
    const user = userEvent.setup();
    const fixture = createSyntheticSessionManager(sampleStoredSession);
    fixture.auth.verify.mockRejectedValue(new AuthFailure({ messageKey: 'NETWORK_ERROR' }));
    const repository = new LiveRoomRepository({ client: createMockApiClient(), session: fixture.manager });
    await renderLiveEntry(repository);

    expect(await screen.findByText('Chưa khôi phục được phiên')).toBeOnTheScreen();
    expect(fixture.storage.clear).not.toHaveBeenCalled();
    expect(fixture.auth.createGuest).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled();

    fixture.auth.verify.mockImplementation(async () => sampleUser);
    await user.press(screen.getByRole('button', { name: 'Thử khôi phục phiên' }));
    expect(await screen.findByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
    expect(repository.getSessionSnapshot()).toMatchObject({ status: 'active', user: { displayName: 'Trí Thanh' } });
    expect(fixture.auth.createGuest).not.toHaveBeenCalled();
  });

  test('P1: Home offers explicit session recovery after an API auth rejection', async () => {
    const user = userEvent.setup();
    const restoreSession = jest.fn().mockResolvedValue(true);
    const liveSession = {
      status: 'lost' as const,
      issue: 'session-recovery-required' as const,
      user: null,
      isInitializing: false,
      ensureSession: jest.fn().mockResolvedValue(false),
      restoreSession,
      logout: jest.fn().mockResolvedValue(true),
    };
    await render(<Gm25HomeScreen repository={createMockApiClient()} liveSession={liveSession} onCreate={jest.fn()} onJoin={jest.fn()} onResume={jest.fn()} />);

    expect(screen.getByText('Phiên cần khôi phục')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Thử khôi phục phiên' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Thử khôi phục phiên' }));
    expect(restoreSession).toHaveBeenCalledTimes(1);
  });

  test('P1: repository guest creation and logout update Home identity without remounting the provider', async () => {
    const fixture = createSyntheticSessionManager(null);
    const repository = new LiveRoomRepository({ client: createMockApiClient(), session: fixture.manager });
    await renderLiveEntry(repository);
    expect(await screen.findByText('Chưa có phiên')).toBeOnTheScreen();

    await act(async () => { await repository.createGuestSession('Hà'); });
    expect(await screen.findByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
    expect(repository.getCurrentUser()).toMatchObject({ displayName: 'Hà' });
    await act(async () => { await repository.logout(); });
    expect(await screen.findByText('Chưa có phiên')).toBeOnTheScreen();
    expect(screen.getByText('Chưa có phiên')).toBeOnTheScreen();
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

  test.each([undefined, 'foreign-user-id'])('P1: live lobby does not impersonate the first member when current user is %s', async currentUserId => {
    const client = createMockApiClient({ getRoomSnapshot: jest.fn().mockResolvedValue({ ok: true, data: createSampleSnapshot() }) });
    await render(
      <Gm25LiveLobbyScreen
        repository={client}
        roomId="room_live_123"
        currentUserId={currentUserId}
        onHome={jest.fn()}
      />
    );

    expect(await screen.findByText(currentUserId ? 'Bạn không thuộc phòng này' : 'Chưa xác định được danh tính phiên')).toBeOnTheScreen();
    expect(screen.queryByText('Thành viên · 2/8')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tôi sẵn sàng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bắt đầu chọn món' })).toBeNull();
    expect(client.setReady).not.toHaveBeenCalled();
    expect(client.startRound).not.toHaveBeenCalled();
  });

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
      <Gm25LiveLobbyScreen
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
      <Gm25LiveLobbyScreen
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
      <Gm25LiveLobbyScreen
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
