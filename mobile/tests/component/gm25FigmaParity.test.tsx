import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createRoomRepository } from '../../src/features/rooms/services/roomRepository';
import { GuestEntryScreen } from '../../src/features/home/screens/GuestEntryScreen';
import { HomeScreen, type HomeLiveSession } from '../../src/features/home/screens/HomeScreen';
import { CreateRoomScreen } from '../../src/features/rooms/screens/CreateRoomScreen';
import { JoinRoomScreen } from '../../src/features/rooms/screens/JoinRoomScreen';
import { LobbyScreen } from '../../src/features/rooms/screens/LobbyScreen';
import { DishPreferencesScreen } from '../../src/features/preferences/screens/DishPreferencesScreen';
import { emptyPreferences } from '../../src/features/context/services/dishSetup';
import { dishSetupCatalogue } from '../../src/features/context/services/dishSetupCatalogue';
import { createLiveDishSetupGateway } from '../../src/features/context/services/liveDishSetupGateway';
import type { ApiClient, RoomSnapshot, SessionUser } from '../../src/data/api/contracts';

describe('GM-25 Figma UI Parity Suite (Issue #86)', () => {
  const sampleUser: SessionUser = {
    id: 'usr_tri_001',
    displayName: 'Trí Thanh',
    isGuest: true,
    createdAt: '2026-10-25T00:00:00Z',
  };

  const sampleSnapshot: RoomSnapshot = {
    roomId: 'room_live_001',
    code: 'GCD999',
    hostUserId: 'usr_tri_001',
    version: 1,
    state: 'LOBBY',
    context: {
      anchorId: 'dish-only',
      radiusM: 0,
      mealSlot: 'lunch',
      desiredAt: '2026-10-25T12:00:00+07:00',
      serviceMode: 'dine_in',
      budget: null,
      avoidRecent: true,
    },
    members: [
      { userId: 'usr_tri_001', displayName: 'Trí Thanh', isHost: true, ready: false, joinedAt: '2026-10-25T00:00:00Z' },
      { userId: 'usr_tuan_002', displayName: 'Tuấn', isHost: false, ready: false, joinedAt: '2026-10-25T00:01:00Z' },
    ],
    round: 1,
    poolVersion: 1,
    pool: [],
    expiresAt: '2026-10-25T14:00:00+07:00',
  };

  function createMockApiClient(): jest.Mocked<ApiClient> & { callRpc: jest.Mock } {
    const callRpc = jest.fn().mockImplementation((rpcName: string, params: { command: string; payload: Record<string, unknown> }) => {
      if (rpcName === 'dish_session') {
        const { command } = params;
        if (command === 'create') {
          return Promise.resolve({
            ok: true,
            data: { roomId: 'room_live_001', code: 'GCD999', version: 1, expiresAt: '2026-10-25T14:00:00Z' },
          });
        }
        if (command === 'updateSettings') {
          return Promise.resolve({
            ok: true,
            data: { roomId: 'room_live_001', version: 2 },
          });
        }
        if (command === 'updatePreferences') {
          return Promise.resolve({
            ok: true,
            data: { accepted: true },
          });
        }
        if (command === 'previewJoin') {
          return Promise.resolve({
            ok: true,
            data: {
              joinable: true,
              memberCount: 2,
              memberLimit: 20,
              dishCount: 15,
              mealSlot: 'lunch',
              roomState: 'LOBBY',
            },
          });
        }
        if (command === 'join') {
          return Promise.resolve({
            ok: true,
            data: { roomId: 'room_live_001', code: 'GCD999', version: 2, memberId: 'mem_tuan' },
          });
        }
        if (command === 'snapshot') {
          return Promise.resolve({
            ok: true,
            data: sampleSnapshot,
          });
        }
        if (command === 'getDefaultPreferences') {
          return Promise.resolve({
            ok: true,
            data: {
              revision: 1,
              preferences: {
                cuisineIds: [],
                categoryIds: [],
                dietaryFlags: [],
                pricePreference: 'mid',
                allergies: [],
              },
            },
          });
        }
      }
      return Promise.resolve({ ok: true, data: {} });
    });

    return {
      callRpc,
      createGuestSession: jest.fn().mockResolvedValue({ ok: true, data: { user: sampleUser, token: 'tok_live', expiresAt: '2026-10-26T00:00:00Z' } }),
      restoreSession: jest.fn().mockResolvedValue({ ok: true, data: sampleUser }),
      logout: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      listFriends: jest.fn().mockResolvedValue({ ok: true, data: [{ id: 'fr_1', friendUserId: 'usr_linh', displayName: 'Linh', friendCode: 'FLINH', status: 'active', since: '2026-10-01' }] }),
      getDiscoveryContext: jest.fn().mockResolvedValue({
        ok: true,
        data: { serverTime: '2026-10-25T11:45:00Z', anchors: [] },
      }),
      createRoom: jest.fn().mockResolvedValue({
        ok: true,
        data: { roomId: 'room_live_001', code: 'GCD999', version: 1, expiresAt: '2026-10-25T14:00:00Z' },
      }),
      joinRoom: jest.fn().mockResolvedValue({
        ok: true,
        data: { roomId: 'room_live_001', code: 'GCD999', version: 2, memberId: 'mem_tuan' },
      }),
      getRoomSnapshot: jest.fn().mockResolvedValue({ ok: true, data: sampleSnapshot }),
      getHistoryConsent: jest.fn().mockResolvedValue({ ok: true, data: { personal: false, group: false } }),
      previewFoodPool: jest.fn().mockResolvedValue({ ok: true, data: { totalCandidateCount: 15, pool: [{ dishId: 'dish_pho' }] } }),
      updateContext: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      updatePreferences: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      setReady: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      startRound: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      leaveRoom: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      cancelRoom: jest.fn().mockResolvedValue({ ok: true, data: undefined }),
      inviteToRoom: jest.fn().mockResolvedValue({ ok: true, data: { invitationId: 'inv_1', roomId: 'r1', inviterUserId: 'u1', inviteeUserId: 'u2', status: 'pending', expiresAt: '2026-10-26' } }),
      submitBallot: jest.fn().mockResolvedValue({ ok: true, data: { submissionId: 's1', round: 1, ackAt: '2026-10-25T12:00:00Z' } }),
      getResultOfferings: jest.fn().mockResolvedValue({ ok: true, data: { items: [] } }),
    } as unknown as jest.Mocked<ApiClient> & { callRpc: jest.Mock };
  }

  // Node 298:2309 — Mở app · Chọn cách tham gia
  describe('Node 298:2309 — Chọn cách tham gia & Onboarding Guest Entry', () => {
    it('validates 1..24 character guest name and creates single guest session', async () => {
      const onContinue = jest.fn().mockResolvedValue(true);
      const onComplete = jest.fn();

      await render(<GuestEntryScreen onContinue={onContinue} onComplete={onComplete} />);

      await fireEvent.press(screen.getByRole('button', { name: 'Tham gia với tư cách khách' }));
      expect(screen.getByLabelText('Tên khách')).toBeOnTheScreen();

      // Empty name error
      await fireEvent.changeText(screen.getByLabelText('Tên khách'), '');
      await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));
      expect(screen.getByText('Tên cần từ 1 đến 24 ký tự.')).toBeOnTheScreen();
      expect(onContinue).not.toHaveBeenCalled();

      // Valid name submits cleanly
      await fireEvent.changeText(screen.getByLabelText('Tên khách'), '  Trí Thanh  ');
      await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }));

      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
      expect(onContinue).toHaveBeenCalledWith('Trí Thanh');
    });
  });

  // Node 330:3067 — 02 · Khách / Trang chủ / Tiếp tục phiên
  describe('Node 330:3067 — Trang chủ với session đã khôi phục', () => {
    it('renders home screen with quick actions when no active room', async () => {
      const client = createMockApiClient();
      const onCreate = jest.fn();
      const onJoin = jest.fn();
      const onResume = jest.fn();

      const liveSession: HomeLiveSession = {
        status: 'active',
        issue: 'none',
        user: sampleUser,
        isInitializing: false,
        ensureSession: jest.fn().mockResolvedValue(true),
        restoreSession: jest.fn().mockResolvedValue(true),
        logout: jest.fn().mockResolvedValue(true),
      };

      await render(
        <HomeScreen
          repository={client}
          liveSession={liveSession}
          onCreate={onCreate}
          onJoin={onJoin}
          onResume={onResume}
        />
      );

      expect(screen.getByText('Hôm nay\ncả nhóm ăn gì?')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Tham gia phòng' })).toBeEnabled();

      // Create and Join triggers
      await fireEvent.press(screen.getByRole('button', { name: 'Tạo phòng' }));
      expect(onCreate).toHaveBeenCalledTimes(1);
      await fireEvent.press(screen.getByRole('button', { name: 'Tham gia phòng' }));
      expect(onJoin).toHaveBeenCalledTimes(1);
    });

    it('renders resume room banner when active room receipt is present', async () => {
      const client = createMockApiClient();
      const onResume = jest.fn();

      const liveSession: HomeLiveSession = {
        status: 'active',
        issue: 'none',
        user: sampleUser,
        isInitializing: false,
        ensureSession: jest.fn().mockResolvedValue(true),
        restoreSession: jest.fn().mockResolvedValue(true),
        logout: jest.fn().mockResolvedValue(true),
      };

      const activeRoomReceipt = {
        roomId: 'room_live_001',
        code: 'GCD999',
        version: 1,
        role: 'host' as const,
      };

      await render(
        <HomeScreen
          repository={client}
          liveSession={liveSession}
          activeRoom={activeRoomReceipt}
          onCreate={jest.fn()}
          onJoin={jest.fn()}
          onResume={onResume}
        />
      );

      expect(screen.getByText('Phòng #GCD999')).toBeOnTheScreen();
      const resumeBtn = screen.getByRole('button', { name: 'Tiếp tục phiên' });
      expect(resumeBtn).toBeOnTheScreen();
      await fireEvent.press(resumeBtn);
      expect(onResume).toHaveBeenCalledTimes(1);
    });
  });

  // Node 330:3068 — 03 · Tạo phòng / Hẹn giờ / Tình huống
  describe('Node 330:3068 — Tạo phòng Dish-only', () => {
    it('renders dish-only create room entry with host name and setup summary', async () => {
      const onOpenSetup = jest.fn().mockResolvedValue(true);
      const onBack = jest.fn();

      await render(
        <CreateRoomScreen
          displayName="Trí Thanh"
          summary={{ meal: 'Bữa trưa', dishCount: 15 }}
          onOpenSetup={onOpenSetup}
          onBack={onBack}
        />
      );

      expect(screen.getByText('Chủ phòng: Trí Thanh')).toBeOnTheScreen();
      expect(screen.getByText('Bữa trưa · 15 món')).toBeOnTheScreen();
      expect(screen.getByText('Chọn 10–20 món để bắt đầu. Mỗi người tự chọn khẩu vị; không cần chia sẻ vị trí.')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục thiết lập' }));
      expect(onOpenSetup).toHaveBeenCalledTimes(1);
    });

    it('liveDishSetupGateway creates room via canonical dish_session v4 dispatch', async () => {
      const client = createMockApiClient();
      const roomId = '5d35a05a-8678-5380-beb1-fe2cdc587151';
      const hostUserId = 'cff99380-b3c8-5dd8-9e91-5eeda3aee1d3';
      const originalCallRpc = client.callRpc.getMockImplementation();
      const canonicalCreatedSnapshot = {
        contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
        policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
        catalogueVersion: 'review-synthetic-v1',
        catalogueSha: 'a'.repeat(64),
        roomId,
        code: 'GCD999',
        state: 'LOBBY',
        version: 1,
        round: 1,
        poolVersion: 1,
        dishCount: 15,
        pool: Array.from({ length: 15 }, (_, index) => ({
          roundDishId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          dishId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          name: `Synthetic dish ${index + 1}`,
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
        })),
        members: [{ userId: hostUserId, displayName: 'Trí Thanh', role: 'HOST', submissionStatus: 'NOT_SUBMITTED' }],
        submittedCount: 0,
        memberCount: 1,
        ownBallot: null,
        ownWaiting: false,
        waitingStartedAt: null,
        deadline: null,
        serverTime: '2026-11-05T06:00:00Z',
        result: null,
        hostUserId,
        settings: { dishCount: 15, mealSlot: 'lunch', desiredAt: null },
        ownPreferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: true },
        ownPreferenceRevision: 1,
        preferenceRanking: 'UNSUPPORTED',
        removalCap: null,
        expiresAt: '2026-11-05T07:00:00Z',
        canEndWaiting: false,
      };
      client.restoreSession.mockResolvedValue({
        ok: true,
        data: { ...sampleUser, id: hostUserId },
      });
      client.callRpc.mockImplementation((rpcName, params) => {
        if (rpcName === 'dish_session' && params.command === 'create') {
          return Promise.resolve({ ok: true, data: { roomId, code: 'GCD999', version: 1, expiresAt: '2026-11-05T07:00:00Z' } });
        }
        if (rpcName === 'dish_session' && params.command === 'snapshot') {
          return Promise.resolve({ ok: true, data: canonicalCreatedSnapshot });
        }
        return originalCallRpc?.(rpcName, params) ?? Promise.resolve({ ok: true, data: {} });
      });
      const repo = createRoomRepository({ client });
      await repo.restoreSession();

      const gateway = createLiveDishSetupGateway(repo);
      const read = await gateway.read();
      expect(read.connected).toBe(true);
      expect(read.friends).toHaveLength(1);
      expect(read.friends[0]?.label).toBe('Linh');

      const reply = await gateway.write({
        kind: 'settings',
        requestId: 'req_setup_test',
        draft: {
          mealSlot: 'lunch',
          dishCount: 15,
          timeMode: 'now',
          desiredAt: null,
          budget: null,
          avoidRecent: true,
          inviteeIds: [],
        },
      });

      expect(reply.ok).toBe(true);
      if (reply.ok) {
        expect(reply.room.code).toBe('GCD999');
        expect(reply.room.state).toBe('LOBBY');
      }

      // Assert canonical dish_session dispatch with supplement contract and exact 3 settings keys
      expect(client.callRpc).toHaveBeenCalledWith(
        'dish_session',
        expect.objectContaining({
          command: 'create',
          payload: expect.objectContaining({
            contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
            settings: { dishCount: 15, mealSlot: 'lunch', desiredAt: null },
          }),
        })
      );
    });

    it('maps dish shortage error to SHORTAGE with available and requested numbers', async () => {
      const client = createMockApiClient();
      client.callRpc.mockImplementation((_rpc: string, params: { command: string }) => {
        if (params.command === 'create') {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'INSUFFICIENT_DISHES',
              messageKey: 'INSUFFICIENT_DISHES',
              details: { available: 8, requested: 15 },
            },
          });
        }
        return Promise.resolve({ ok: true, data: {} });
      });

      const repo = createRoomRepository({ client });
      await repo.restoreSession();

      const gateway = createLiveDishSetupGateway(repo);
      const reply = await gateway.write({
        kind: 'settings',
        requestId: 'req_shortage',
        draft: {
          mealSlot: 'lunch',
          dishCount: 15,
          timeMode: 'now',
          desiredAt: null,
          budget: null,
          avoidRecent: true,
          inviteeIds: [],
        },
      });

      expect(reply.ok).toBe(false);
      if (!reply.ok) {
        expect(reply.code).toBe('SHORTAGE');
        if (reply.code === 'SHORTAGE') {
          expect(reply.available).toBe(8);
          expect(reply.requested).toBe(15);
        }
      }
    });

    it('maps version conflict to STALE and network error to UNKNOWN', async () => {
      const client = createMockApiClient();
      let shouldFailNetwork = false;
      client.callRpc.mockImplementation((_rpc: string, params: { command: string }) => {
        if (params.command === 'create') {
          if (shouldFailNetwork) {
            return Promise.resolve({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
          }
          return Promise.resolve({ ok: false, error: { messageKey: 'VERSION_CONFLICT' } });
        }
        return Promise.resolve({ ok: true, data: {} });
      });

      const repo = createRoomRepository({ client });
      await repo.restoreSession();
      const gateway = createLiveDishSetupGateway(repo);

      // Stale
      const staleReply = await gateway.write({
        kind: 'settings',
        requestId: 'req_stale',
        draft: { mealSlot: 'lunch', dishCount: 15, timeMode: 'now', desiredAt: null, budget: null, avoidRecent: true, inviteeIds: [] },
      });
      expect(staleReply.ok).toBe(false);
      if (!staleReply.ok) expect(staleReply.code).toBe('STALE');

      // Network
      shouldFailNetwork = true;
      const netReply = await gateway.write({
        kind: 'settings',
        requestId: 'req_net',
        draft: { mealSlot: 'lunch', dishCount: 15, timeMode: 'now', desiredAt: null, budget: null, avoidRecent: true, inviteeIds: [] },
      });
      expect(netReply.ok).toBe(false);
      if (!netReply.ok) expect(netReply.code).toBe('UNKNOWN');
    });

    it('throws error when reading snapshot fails instead of returning fake connected', async () => {
      const client = createMockApiClient();
      client.callRpc.mockImplementation((_rpc: string, params: { command: string }) => {
        if (params.command === 'snapshot') {
          return Promise.resolve({
            ok: false,
            error: { messageKey: 'NETWORK_ERROR' },
          });
        }
        return Promise.resolve({ ok: true, data: {} });
      });

      const repo = createRoomRepository({ client });
      await repo.restoreSession();
      const gateway = createLiveDishSetupGateway(repo, 'room_live_001');

      await expect(gateway.read()).rejects.toThrow();
    });
  });

  // Node 330:3069 — 05 · Tham gia phòng / QR / Lỗi vào phòng
  describe('Node 330:3069 — Tham gia phòng & Public Preview trước khi Join', () => {
    it('renders 6-character room code input and triggers preview without leaking private room data', async () => {
      const client = createMockApiClient();
      const repo = createRoomRepository({ client });
      await repo.restoreSession();

      const onEntered = jest.fn();
      const onBack = jest.fn();

      const previewFn = jest.fn().mockResolvedValue({
        ok: true,
        data: { code: 'GCD999', memberCount: 2, capacity: 20 },
      });

      await render(
        <JoinRoomScreen
          repository={repo}
          preview={previewFn}
          initialDisplayName="Tuấn"
          initialCode="GCD999"
          onEntered={onEntered}
          onBack={onBack}
        />
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục →' }));
      expect(previewFn).toHaveBeenCalledWith('GCD999');
      expect(await screen.findByText('2/20 thành viên')).toBeOnTheScreen();
      expect(screen.getByText('Phòng GCD999')).toBeOnTheScreen();
      expect(screen.getByText('Xác nhận để vào phòng. Xem trước không giữ chỗ.')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận vào phòng' }));
      expect(onEntered).toHaveBeenCalledWith(expect.objectContaining({ role: 'member', code: 'GCD999' }));
    });

    it('displays error states for full or expired room preview', async () => {
      const client = createMockApiClient();
      const repo = createRoomRepository({ client });

      const fullPreview = jest.fn().mockResolvedValue({
        ok: false,
        error: { messageKey: 'ROOM_FULL' },
      });

      await render(
        <JoinRoomScreen
          repository={repo}
          preview={fullPreview}
          initialDisplayName="Tuấn"
          initialCode="GCD999"
          onEntered={jest.fn()}
          onBack={jest.fn()}
        />
      );

      await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục →' }));
      expect(await screen.findByText('Phòng đã đủ 20 người')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Xác nhận vào phòng' })).toBeNull();
    });
  });

  // Node 388:7816 — 04 · Khẩu vị / Lưu nháp / Lỗi
  describe('Node 388:7816 — Khẩu vị Dish-only không có Ready flow', () => {
    it('renders dish preferences with Anything choice, skip, save actions and privacy note', async () => {
      const onChange = jest.fn();
      const onSave = jest.fn();
      const onBack = jest.fn();

      await render(
        <DishPreferencesScreen
          preferences={emptyPreferences(false)}
          catalogue={dishSetupCatalogue}
          onChange={onChange}
          onBack={onBack}
          onSave={onSave}
          editing={false}
        />
      );

      expect(screen.getByText('Ăn gì cũng được')).toBeOnTheScreen();
      expect(screen.getByText('Bỏ qua')).toBeOnTheScreen();
      expect(screen.getByText('Vào phòng chờ →')).toBeOnTheScreen();
      expect(screen.getByText('Lựa chọn này áp dụng cho lịch sử cá nhân của tài khoản. Lưu lịch sử nhóm là quyền riêng, không bị thay đổi ở đây. Khẩu vị chỉ áp dụng cho phòng này.')).toBeOnTheScreen();

      // Ensure no legacy ready banner or text exists
      expect(screen.queryByText(/sẵn sàng/i)).toBeNull();

      // Click Skip
      await fireEvent.press(screen.getByRole('button', { name: 'Bỏ qua' }));
      expect(onSave).toHaveBeenCalledWith(true);

      // Click Enter Lobby
      await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng chờ →' }));
      expect(onSave).toHaveBeenCalledWith(false);
    });
  });

  // Node 330:3070 — 06 · Phòng chờ / Chủ phòng / Thành viên
  describe('Node 330:3070 — Phòng chờ Live Lobby không có Ready flow', () => {
    it('renders real lobby with 20 member capacity, host start without ready requirement', async () => {
      const client = createMockApiClient();
      const repo = createRoomRepository({ client });
      const onHome = jest.fn();
      const onStart = jest.fn();

      await render(
        <LobbyScreen
          repository={repo}
          roomId="room_live_001"
          currentUserId="usr_tri_001"
          onHome={onHome}
          onStartRound={onStart}
        />
      );

      expect(await screen.findByText('GCD999')).toBeOnTheScreen();
      expect(screen.getByText('Thành viên · 2/20')).toBeOnTheScreen();

      // Ready controls are removed
      expect(screen.queryByRole('button', { name: /sẵn sàng/i })).toBeNull();

      // Host can start directly
      const startBtn = screen.getByRole('button', { name: 'Bắt đầu chọn món' });
      expect(startBtn.props.accessibilityState.disabled).not.toBe(true);

      await fireEvent.press(startBtn);
      expect(client.callRpc).toHaveBeenCalledWith(
        'dish_session',
        expect.objectContaining({
          command: 'start',
          payload: expect.objectContaining({
            contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
            roomId: 'room_live_001',
            expectedVersion: 1,
          }),
        })
      );
    });

    it('member role shows leave room button with confirmation sheet', async () => {
      const client = createMockApiClient();
      const repo = createRoomRepository({ client });
      const onHome = jest.fn();

      await render(
        <LobbyScreen
          repository={repo}
          roomId="room_live_001"
          currentUserId="usr_tuan_002"
          onHome={onHome}
        />
      );

      expect(await screen.findByText('GCD999')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Bắt đầu chọn món' })).toBeNull();

      const leaveBtn = screen.getByRole('button', { name: 'Rời phòng' });
      await fireEvent.press(leaveBtn);

      expect(screen.getByText('Xác nhận rời phòng?')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận rời' }));

      expect(client.callRpc).toHaveBeenCalledWith(
        'dish_session',
        expect.objectContaining({
          command: 'leave',
          payload: expect.objectContaining({
            contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
            roomId: 'room_live_001',
            expectedVersion: 1,
          }),
        })
      );
    });
  });
});
