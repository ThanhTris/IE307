import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LiveRoomRepository, createDurableRequestId, createRoomRepository } from '../../src/features/rooms/services/roomRepository';
import { CreateRoomEntryScreen } from '../../src/features/rooms/screens/CreateRoomEntryScreen';
import { JoinRoomEntryScreen } from '../../src/features/rooms/screens/JoinRoomEntryScreen';
import { LiveLobbyScreen } from '../../src/features/rooms/screens/LiveLobbyScreen';
import { DishPreferencesScreen } from '../../src/features/preferences/screens/DishPreferencesScreen';
import { emptyPreferences } from '../../src/features/context/services/dishSetup';
import { dishSetupCatalogue } from '../../src/bootstrap/dishSetupCatalogue';
import { createLiveDishSetupGateway } from '../../src/bootstrap/liveDishSetupGateway';
import type { ApiClient, RoomSnapshot, SessionUser } from '../../src/data/api/contracts';
import { MockApiClient } from '../../src/data/api';

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

  function createMockApiClient(): jest.Mocked<ApiClient> {
    return {
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
    } as unknown as jest.Mocked<ApiClient>;
  }

  // Node 330:3068 — 03 · Tạo phòng / Hẹn giờ / Tình huống
  describe('Node 330:3068 — Tạo phòng Dish-only', () => {
    it('renders dish-only create room entry with host name and setup summary', async () => {
      const onOpenSetup = jest.fn().mockResolvedValue(true);
      const onBack = jest.fn();

      await render(
        <CreateRoomEntryScreen
          displayName="Trí Thanh"
          summary={{ meal: 'Bữa trưa', dishCount: 15 }}
          onOpenSetup={onOpenSetup}
          onBack={onBack}
          isMock={false}
        />
      );

      expect(screen.getByText('Chủ phòng: Trí Thanh')).toBeOnTheScreen();
      expect(screen.getByText('Bữa trưa · 15 món')).toBeOnTheScreen();
      expect(screen.getByText('Chọn 10–20 món để bắt đầu. Mỗi người tự chọn khẩu vị; không cần chia sẻ vị trí.')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục thiết lập' }));
      expect(onOpenSetup).toHaveBeenCalledTimes(1);
    });

    it('liveDishSetupGateway reads friends and creates room with dish-only context', async () => {
      const client = createMockApiClient();
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
      expect(client.createRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'Trí Thanh',
          context: expect.objectContaining({ mealSlot: 'lunch', avoidRecent: true }),
        })
      );
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
        <JoinRoomEntryScreen
          repository={repo}
          preview={previewFn}
          initialDisplayName="Tuấn"
          initialCode="GCD999"
          isMock={false}
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
      expect(client.joinRoom).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'GCD999', displayName: 'Tuấn' })
      );
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
        <JoinRoomEntryScreen
          repository={repo}
          preview={fullPreview}
          initialDisplayName="Tuấn"
          initialCode="GCD999"
          isMock={false}
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
      expect(screen.getByText('Khẩu vị là riêng tư. Thay đổi áp dụng cho phòng này; không ghi đè mặc định tài khoản.')).toBeOnTheScreen();

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
        <LiveLobbyScreen
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
      expect(client.startRound).toHaveBeenCalledWith(
        expect.objectContaining({ roomId: 'room_live_001', expectedVersion: 1 })
      );
    });

    it('member role shows leave room button with confirmation sheet', async () => {
      const client = createMockApiClient();
      const repo = createRoomRepository({ client });
      const onHome = jest.fn();

      await render(
        <LiveLobbyScreen
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

      expect(client.leaveRoom).toHaveBeenCalledWith(
        expect.objectContaining({ roomId: 'room_live_001', expectedVersion: 1 })
      );
    });
  });
});
