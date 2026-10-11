/**
 * GM-07 — Mock API adapter implementing ApiClient interface.
 * Provides configurable modes (default, loading, empty, error, expired, stale)
 * and rich realistic in-memory state for UI screens (GM-09..14).
 * Spec: docs/architecture/API_CONTRACT.md
 */

import {
  ApiClient,
  ReadResult,
  WriteResult,
  ErrorCode,
  CreateGuestSessionRequest,
  SessionResponse,
  SessionUser,
  DiscoveryContextResponse,
  PreviewFoodPoolRequest,
  PreviewFoodPoolResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomSnapshot,
  UpdatePreferencesRequest,
  UpdateContextRequest,
  SetReadyRequest,
  StartRoundRequest,
  LeaveRoomRequest,
  CancelRoomRequest,
  SubmitBallotRequest,
  SubmitBallotResponse,
  PoolDish,
  Friend,
  InvitePartnerRequest,
  FriendInvitation,
  InviteToRoomRequest,
  RoomInvitation,
  AcceptRoomInviteRequest,
  InboxItem,
  RegisterPushDeviceRequest,
  HistoryItem,
  UpdateHistoryConsentRequest,
  PublicAnchor,
  CoverageArea,
  RoomResult,
  SubmissionReceipt,
} from './contracts';

export type MockMode = 'default' | 'loading' | 'empty' | 'error' | 'expired' | 'stale';
export type MockConsensusScenario = 'unanimous' | 'no_consensus' | 'round_two';

export interface MockConfig {
  mode?: MockMode;
  scenario?: MockConsensusScenario;
  delayMs?: number;
  simulatedErrorCode?: ErrorCode;
  currentUser?: SessionUser;
}

// ============================================================================
// Realistic Presets & Fixtures
// ============================================================================

export const MOCK_COVERAGE_AREAS: CoverageArea[] = [
  { id: 'cov_quan_1', name: 'Quận 1, TP. Hồ Chí Minh', adminAreaId: 'VN-SG-Q1' },
  { id: 'cov_quan_3', name: 'Quận 3, TP. Hồ Chí Minh', adminAreaId: 'VN-SG-Q3' },
  { id: 'cov_thu_duc', name: 'TP. Thủ Đức, TP. Hồ Chí Minh', adminAreaId: 'VN-SG-TD' },
];

export const MOCK_ANCHORS: PublicAnchor[] = [
  {
    id: 'anc_ho_con_rua',
    coverageId: 'cov_quan_3',
    name: 'Hồ Con Rùa',
    address: 'Vòng xoay Công trường Quốc Tế, Phường 6, Quận 3',
    lat: 10.7828,
    lng: 106.6958,
  },
  {
    id: 'anc_pho_di_bo',
    coverageId: 'cov_quan_1',
    name: 'Phố Đi Bộ Nguyễn Huệ',
    address: 'Nguyễn Huệ, Bến Nghé, Quận 1',
    lat: 10.7743,
    lng: 106.7034,
  },
  {
    id: 'anc_dai_hoc_bach_khoa',
    coverageId: 'cov_quan_1',
    name: 'Đại Học Bách Khoa (Cơ sở 1)',
    address: '268 Lý Thường Kiệt, Phường 14, Quận 10',
    lat: 10.7721,
    lng: 106.6579,
  },
  {
    id: 'anc_cho_ben_thanh',
    coverageId: 'cov_quan_1',
    name: 'Chợ Bến Thành',
    address: 'Lê Lợi, Phường Bến Thành, Quận 1',
    lat: 10.7725,
    lng: 106.6980,
  },
];

export const MOCK_DISHES: PoolDish[] = [
  {
    roundDishId: 'rd_01',
    choiceId: 'choice_01',
    dishId: 'dish_pho_bo',
    name: 'Phở bò tái nạm',
    description: 'Nước dùng ninh xương 12 tiếng thơm quế hồi, thịt bò tái mềm',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_nuoc'],
    origin: 'north',
    temperature: 'hot',
    priceMin: 55000,
    priceMax: 75000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 55000,
      priceMax: 75000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_pho_phu_vuong',
    venueName: 'Phở Phú Vương',
    venueAddress: '339 Lê Văn Sỹ, Quận 3',
    distanceM: 650,
    artwork: {
      url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Markus Winkler',
    },
    flavor: {
      spicy: { present: false, intensity: 'none' },
      salty: { present: true, intensity: 'medium' },
      sweet: { present: true, intensity: 'low' },
      sour: { present: false, intensity: 'none' },
    },
  },
  {
    roundDishId: 'rd_02',
    choiceId: 'choice_02',
    dishId: 'dish_com_tam',
    name: 'Cơm tấm sườn bì chả',
    description: 'Sườn nướng than hoa mật ong đậm đà, chả trứng béo ngậy',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_com'],
    origin: 'south',
    temperature: 'warm',
    priceMin: 45000,
    priceMax: 65000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 45000,
      priceMax: 65000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_com_tam_ba_ghien',
    venueName: 'Cơm Tấm Ba Ghiền',
    venueAddress: '84 Đặng Văn Ngữ, Phú Nhuận',
    distanceM: 1200,
    artwork: {
      url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Thu Nguyen',
    },
    flavor: {
      spicy: { present: false, intensity: 'none' },
      salty: { present: true, intensity: 'medium' },
      sweet: { present: true, intensity: 'medium' },
      sour: { present: false, intensity: 'none' },
    },
  },
  {
    roundDishId: 'rd_03',
    choiceId: 'choice_03',
    dishId: 'dish_bun_cha',
    name: 'Bún chả Hà Nội',
    description: 'Chả viên nướng xém cạnh, chả miếng thơm lừng cùng nước mắm chua ngọt',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_nuoc'],
    origin: 'north',
    temperature: 'warm',
    priceMin: 50000,
    priceMax: 65000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 50000,
      priceMax: 65000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_bun_cha_145',
    venueName: 'Bún Chả 145 Bùi Viện',
    venueAddress: '145 Bùi Viện, Quận 1',
    distanceM: 950,
    artwork: {
      url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Manki Kim',
    },
    flavor: {
      spicy: { present: false, intensity: 'none' },
      salty: { present: true, intensity: 'medium' },
      sweet: { present: true, intensity: 'medium' },
      sour: { present: true, intensity: 'medium' },
    },
  },
  {
    roundDishId: 'rd_04',
    choiceId: 'choice_04',
    dishId: 'dish_bun_dau',
    name: 'Bún đậu mắm tôm thập cẩm',
    description: 'Đậu mơ rán giòn vỏ mềm trong, chả cốm nóng hổi, thịt bắp luộc',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_an_vat'],
    origin: 'north',
    temperature: 'warm',
    priceMin: 55000,
    priceMax: 70000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    price: {
      priceMin: 55000,
      priceMax: 70000,
      currency: 'VND',
      unit: 'menu_item_unspecified',
      servingSize: '1 phần',
    },
    venueId: 'ven_bun_dau_a_chanh',
    venueName: 'Bún Đậu A Chảnh',
    venueAddress: '175 Thành Thái, Quận 10',
    distanceM: 1400,
    artwork: {
      url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
      usageRights: 'granted',
      license: 'Unsplash License',
      attribution: 'Dan Gold',
    },
    flavor: {
      spicy: { present: true, intensity: 'medium' },
      salty: { present: true, intensity: 'high' },
      sweet: { present: true, intensity: 'low' },
      sour: { present: true, intensity: 'medium' },
    },
  },
];

export const MOCK_CURRENT_USER: SessionUser = {
  id: 'usr_me_001',
  displayName: 'Bạn (Trang)',
  isGuest: true,
  createdAt: '2026-10-10T12:00:00Z',
};

export const MOCK_FRIENDS: Friend[] = [
  {
    id: 'fr_01',
    friendUserId: 'usr_tuan_002',
    displayName: 'Tuấn',
    friendCode: 'TUAN88',
    status: 'active',
    since: '2026-10-01T08:00:00Z',
  },
  {
    id: 'fr_02',
    friendUserId: 'usr_tri_003',
    displayName: 'Trí',
    friendCode: 'TRIS99',
    status: 'active',
    since: '2026-10-02T09:30:00Z',
  },
  {
    id: 'fr_03',
    friendUserId: 'usr_vinh_004',
    displayName: 'Vinh',
    friendCode: 'VINH55',
    status: 'active',
    since: '2026-10-05T14:15:00Z',
  },
];

export const MOCK_INBOX_ITEMS: InboxItem[] = [
  {
    id: 'inbox_01',
    eventId: 'evt_invite_01',
    type: 'room_invite',
    title: 'Lời mời ăn trưa',
    body: 'Tuấn mời bạn tham gia phòng chọn món #GCD1',
    read: false,
    metadata: { roomId: 'room_mock_001', roomCode: 'GCD1' },
    createdAt: '2026-10-11T07:45:00Z',
  },
  {
    id: 'inbox_02',
    eventId: 'evt_result_02',
    type: 'room_result',
    title: 'Kết quả bữa trưa hôm qua',
    body: 'Nhóm bạn đã chốt món: Phở bò tái nạm tại Phở Phú Vương.',
    read: true,
    metadata: { roomId: 'room_mock_past', dishName: 'Phở bò tái nạm' },
    createdAt: '2026-10-10T12:30:00Z',
  },
];

export const MOCK_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: 'hist_01',
    roomId: 'room_hist_01',
    roomCode: 'PAST1',
    mealDate: '2026-10-10T12:30:00Z',
    winnerName: 'Phở bò tái nạm',
    winnerArtworkUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600',
    memberCount: 4,
    scope: 'group',
  },
  {
    id: 'hist_02',
    roomId: 'room_hist_02',
    roomCode: 'PAST2',
    mealDate: '2026-10-08T18:45:00Z',
    winnerName: 'Cơm tấm sườn bì chả',
    winnerArtworkUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
    memberCount: 3,
    scope: 'personal',
  },
];

export class MockApiClient implements ApiClient {
  private mode: MockMode;
  private scenario: MockConsensusScenario;
  private delayMs: number;
  private simulatedErrorCode: ErrorCode;
  private currentUser: SessionUser;

  // In-memory mutable states
  private rooms: Map<string, RoomSnapshot> = new Map();
  private friends: Friend[] = [...MOCK_FRIENDS];
  private inbox: InboxItem[] = [...MOCK_INBOX_ITEMS];
  private history: HistoryItem[] = [...MOCK_HISTORY_ITEMS];
  private idempotencyMap: Map<string, { payloadSignature: string; response: WriteResult<any> }> = new Map();

  constructor(config?: MockConfig) {
    this.mode = config?.mode ?? 'default';
    this.scenario = config?.scenario ?? 'unanimous';
    this.delayMs = config?.delayMs ?? 100;
    this.simulatedErrorCode = config?.simulatedErrorCode ?? 'NETWORK_ERROR';
    this.currentUser = config?.currentUser ?? MOCK_CURRENT_USER;

    this.initDefaultRoom();
  }

  setMode(mode: MockMode, errorCode?: ErrorCode): void {
    this.mode = mode;
    if (errorCode) {
      this.simulatedErrorCode = errorCode;
    }
  }

  setScenario(scenario: MockConsensusScenario): void {
    this.scenario = scenario;
  }

  setDelayMs(delayMs: number): void {
    this.delayMs = delayMs;
  }

  setCurrentUser(user: SessionUser): void {
    this.currentUser = user;
  }

  private initDefaultRoom(): void {
    const defaultRoom: RoomSnapshot = {
      roomId: 'room_mock_001',
      code: 'GCD1',
      state: 'LOBBY',
      version: 1,
      hostUserId: this.currentUser.id,
      context: {
        anchorId: 'anc_ho_con_rua',
        anchorName: 'Hồ Con Rùa',
        radiusM: 1500,
        desiredAt: '2026-10-11T12:00:00Z',
        serviceMode: 'dine_in',
        mealSlot: 'lunch',
        budget: 70000,
        avoidRecent: true,
      },
      members: [
        {
          userId: this.currentUser.id,
          displayName: this.currentUser.displayName,
          isHost: true,
          ready: false,
          joinedAt: '2026-10-11T11:00:00Z',
        },
        {
          userId: 'usr_tuan_002',
          displayName: 'Tuấn',
          isHost: false,
          ready: true,
          joinedAt: '2026-10-11T11:05:00Z',
        },
      ],
      round: 1,
      poolVersion: 1,
      pool: [...MOCK_DISHES],
      datasetVersion: '2026-10-11-core-01',
      eligibilityVersion: '1.0.0',
      evaluatedAt: '2026-10-11T12:00:00Z',
      ownSubmission: null,
      expiresAt: '2026-10-11T13:00:00Z',
    };
    this.rooms.set(defaultRoom.roomId, defaultRoom);
    this.rooms.set(defaultRoom.code, defaultRoom);
  }

  private async wait(): Promise<void> {
    if (this.delayMs > 0) {
      await new Promise((r) => setTimeout(r, this.delayMs));
    }
  }

  private checkFailure(): ErrorCode | null {
    if (this.mode === 'error') {
      return this.simulatedErrorCode;
    }
    if (this.mode === 'expired') {
      return 'ROOM_EXPIRED';
    }
    if (this.mode === 'stale') {
      return 'VERSION_CONFLICT';
    }
    return null;
  }

  private checkIdempotency<T>(
    operation: string,
    requestId: string,
    payload: unknown
  ): { cachedResponse?: WriteResult<T>; conflictError?: WriteResult<T>; signature: string } {
    const signature = JSON.stringify(payload);
    const cacheKey = `${this.currentUser.id}:${operation}:${requestId}`;
    const existing = this.idempotencyMap.get(cacheKey);

    if (existing) {
      if (existing.payloadSignature === signature) {
        return { cachedResponse: existing.response as WriteResult<T>, signature };
      }
      return {
        conflictError: {
          ok: false,
          requestId,
          error: {
            messageKey: 'REQUEST_ID_REUSED',
            message: 'Mã requestId đã được sử dụng cho một payload khác',
          },
        },
        signature,
      };
    }

    return { signature };
  }

  private recordIdempotency<T>(
    operation: string,
    requestId: string,
    signature: string,
    response: WriteResult<T>
  ): void {
    const cacheKey = `${this.currentUser.id}:${operation}:${requestId}`;
    this.idempotencyMap.set(cacheKey, { payloadSignature: signature, response });
  }

  // ==========================================================================
  // Auth RPCs
  // ==========================================================================

  async createGuestSession(req: CreateGuestSessionRequest): Promise<WriteResult<SessionResponse>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<SessionResponse>(
      'createGuestSession',
      requestId,
      { displayName: req.displayName }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const user: SessionUser = {
      id: 'usr_guest_' + Math.random().toString(36).substring(2, 8),
      displayName: req.displayName || 'Khách',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    this.currentUser = user;

    const response: WriteResult<SessionResponse> = {
      ok: true,
      requestId,
      data: {
        token: 'mock_jwt_' + user.id,
        user,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    };
    this.recordIdempotency('createGuestSession', requestId, signature, response);
    return response;
  }

  async restoreSession(_token: string): Promise<ReadResult<SessionUser>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    return { ok: true, data: this.currentUser };
  }

  async logout(customRequestId?: string): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'logout',
      requestId,
      { action: 'logout' }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('logout', requestId, signature, response);
    return response;
  }

  // ==========================================================================
  // Discovery & Catalogue RPCs
  // ==========================================================================

  async getDiscoveryContext(_areaId?: string, _anchorId?: string): Promise<ReadResult<DiscoveryContextResponse>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    if (this.mode === 'empty') {
      return {
        ok: true,
        data: { anchors: [], coverageAreas: [], serverTime: new Date().toISOString() },
      };
    }

    return {
      ok: true,
      data: {
        anchors: MOCK_ANCHORS,
        coverageAreas: MOCK_COVERAGE_AREAS,
        serverTime: new Date().toISOString(),
      },
    };
  }

  async previewFoodPool(req: PreviewFoodPoolRequest): Promise<ReadResult<PreviewFoodPoolResponse>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    if (this.mode === 'empty' || req.radiusM < 100) {
      return {
        ok: true,
        data: {
          pool: [],
          datasetVersion: '1.1.0',
          eligibilityVersion: '1.0.0',
          evaluatedAt: new Date().toISOString(),
          totalCandidateCount: 0,
        },
      };
    }

    return {
      ok: true,
      data: {
        pool: MOCK_DISHES,
        datasetVersion: '1.1.0',
        eligibilityVersion: '1.0.0',
        evaluatedAt: new Date().toISOString(),
        totalCandidateCount: MOCK_DISHES.length,
      },
    };
  }

  // ==========================================================================
  // Room Lifecycle RPCs
  // ==========================================================================

  async createRoom(req: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<CreateRoomResponse>(
      'createRoom',
      requestId,
      { displayName: req.displayName, context: req.context }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const roomId = 'room_' + Math.random().toString(36).substring(2, 9);
    const code = ('GCD' + Math.floor(100 + Math.random() * 900)).substring(0, 4);

    const anchor = MOCK_ANCHORS.find((a) => a.id === req.context.anchorId);
    const snapshot: RoomSnapshot = {
      roomId,
      code,
      state: 'LOBBY',
      version: 1,
      hostUserId: this.currentUser.id,
      context: {
        ...req.context,
        anchorName: anchor?.name ?? 'Địa điểm đã chọn',
      },
      members: [
        {
          userId: this.currentUser.id,
          displayName: req.displayName || this.currentUser.displayName,
          isHost: true,
          ready: false,
          joinedAt: new Date().toISOString(),
        },
      ],
      round: 1,
      poolVersion: 1,
      pool: [...MOCK_DISHES],
      datasetVersion: '2026-10-11-core-01',
      eligibilityVersion: '1.0.0',
      evaluatedAt: new Date().toISOString(),
      ownSubmission: null,
      expiresAt: new Date(Date.now() + 7200000).toISOString(),
    };

    this.rooms.set(roomId, snapshot);
    this.rooms.set(code, snapshot);

    const response: WriteResult<CreateRoomResponse> = {
      ok: true,
      requestId,
      roomId,
      version: snapshot.version,
      state: snapshot.state,
      data: {
        roomId,
        code,
        version: snapshot.version,
        expiresAt: snapshot.expiresAt,
      },
    };
    this.recordIdempotency('createRoom', requestId, signature, response);
    return response;
  }

  async joinRoom(req: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<JoinRoomResponse>(
      'joinRoom',
      requestId,
      { code: req.code, displayName: req.displayName }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.code.trim().toUpperCase());
    if (!room) {
      return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng với mã này' } };
    }
    if (room.state !== 'LOBBY') {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'ROOM_LOCKED', message: 'Phòng đã bắt đầu hoặc kết thúc' } };
    }
    if (room.members.length >= 8) {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'ROOM_FULL', message: 'Phòng đã đủ số lượng thành viên' } };
    }

    const existing = room.members.find((m) => m.userId === this.currentUser.id);
    if (!existing) {
      room.members.push({
        userId: this.currentUser.id,
        displayName: req.displayName || this.currentUser.displayName,
        isHost: false,
        ready: false,
        joinedAt: new Date().toISOString(),
      });
      room.version += 1;
    }

    const response: WriteResult<JoinRoomResponse> = {
      ok: true,
      requestId,
      roomId: room.roomId,
      version: room.version,
      data: {
        roomId: room.roomId,
        code: room.code,
        version: room.version,
        memberId: this.currentUser.id,
      },
    };
    this.recordIdempotency('joinRoom', requestId, signature, response);
    return response;
  }

  async getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const room = this.rooms.get(roomId);
    if (!room) {
      return { ok: false, error: { messageKey: 'ROOM_NOT_FOUND' } };
    }

    return { ok: true, data: { ...room, members: [...room.members], pool: [...room.pool] } };
  }

  async updatePreferences(req: UpdatePreferencesRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'updatePreferences',
      requestId,
      { roomId: req.roomId, expectedVersion: req.expectedVersion, preferences: req.preferences }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
    if (room.version !== req.expectedVersion) {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
    }

    room.ownPreferences = req.preferences;
    const member = room.members.find((m) => m.userId === this.currentUser.id);
    if (member) member.ready = false;
    room.version += 1;

    const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, data: undefined };
    this.recordIdempotency('updatePreferences', requestId, signature, response);
    return response;
  }

  async updateContext(req: UpdateContextRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'updateContext',
      requestId,
      { roomId: req.roomId, expectedVersion: req.expectedVersion, context: req.context }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
    if (room.version !== req.expectedVersion) {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
    }

    room.context = { ...req.context };
    room.members.forEach((m) => (m.ready = false));
    room.version += 1;

    const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, data: undefined };
    this.recordIdempotency('updateContext', requestId, signature, response);
    return response;
  }

  async setReady(req: SetReadyRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'setReady',
      requestId,
      { roomId: req.roomId, expectedVersion: req.expectedVersion, ready: req.ready }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
    if (room.version !== req.expectedVersion) {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
    }

    const member = room.members.find((m) => m.userId === this.currentUser.id);
    if (member) {
      member.ready = req.ready;
      room.version += 1;
    }

    const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, state: room.state, data: undefined };
    this.recordIdempotency('setReady', requestId, signature, response);
    return response;
  }

  async startRound(req: StartRoundRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'startRound',
      requestId,
      { roomId: req.roomId, expectedVersion: req.expectedVersion }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
    if (room.version !== req.expectedVersion) {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
    }

    room.state = 'ROUND_1';
    room.round = 1;
    room.version += 1;
    room.members.forEach((m) => (m.hasSubmitted = false));

    const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, state: room.state, data: undefined };
    this.recordIdempotency('startRound', requestId, signature, response);
    return response;
  }

  async leaveRoom(req: LeaveRoomRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'leaveRoom',
      requestId,
      { roomId: req.roomId, expectedVersion: req.expectedVersion }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    if (room) {
      room.members = room.members.filter((m) => m.userId !== this.currentUser.id);
      room.version += 1;
    }

    const response: WriteResult<void> = { ok: true, requestId, roomId: req.roomId, data: undefined };
    this.recordIdempotency('leaveRoom', requestId, signature, response);
    return response;
  }

  async cancelRoom(req: CancelRoomRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'cancelRoom',
      requestId,
      { roomId: req.roomId, expectedVersion: req.expectedVersion, confirmCancel: req.confirmCancel }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    if (room && req.confirmCancel) {
      room.state = 'CANCELLED';
      room.version += 1;
    }

    const response: WriteResult<void> = { ok: true, requestId, roomId: req.roomId, data: undefined };
    this.recordIdempotency('cancelRoom', requestId, signature, response);
    return response;
  }

  // ==========================================================================
  // Voting RPCs
  // ==========================================================================

  async submitBallot(req: SubmitBallotRequest): Promise<WriteResult<SubmitBallotResponse>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId || ('req_' + req.intentId);

    // Contract: check idempotency cache BEFORE room state/version.
    // Signature MUST include intentId and expectedVersion to catch reuses with different payload!
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<SubmitBallotResponse>(
      'submitBallot',
      requestId,
      {
        roomId: req.roomId,
        round: req.round,
        poolVersion: req.poolVersion,
        intentId: req.intentId,
        expectedVersion: req.expectedVersion,
        votes: req.votes,
      }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };

    // Contract: only allow submitting in voting states
    if (room.state !== 'ROUND_1' && room.state !== 'ROUND_2' && room.state !== 'VOTING') {
      return {
        ok: false,
        requestId,
        roomId: room.roomId,
        error: {
          messageKey: 'INVALID_ROOM_STATE',
          message: 'Chỉ có thể nộp phiếu khi phòng ở trạng thái bình chọn (ROUND_1 / ROUND_2 / VOTING)',
        },
      };
    }

    if (room.version !== req.expectedVersion) {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
    }
    if (req.votes.length !== room.pool.length) {
      return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'INCOMPLETE_BALLOT', message: 'Chưa bình chọn đủ tất cả các món' } };
    }

    // Save own votes
    const voteMap: Record<string, typeof req.votes[0]['vote']> = {};
    req.votes.forEach((v) => (voteMap[v.roundDishId] = v.vote));
    room.ownVotes = voteMap;

    room.members.forEach((m) => (m.hasSubmitted = true));
    const allSubmitted = true;

    if (allSubmitted) {
      // Consensus rule: NO KHÔNG THỂ THÀNH WINNER!
      const candidateMap = new Map<string, { wantCount: number; okCount: number; hasNo: boolean; dish: PoolDish }>();
      for (const d of room.pool) {
        candidateMap.set(d.roundDishId, { wantCount: 0, okCount: 0, hasNo: false, dish: d });
      }

      for (const v of req.votes) {
        const item = candidateMap.get(v.roundDishId);
        if (item) {
          if (v.vote === 'NO' || v.vote === 'REMOVE') item.hasNo = true;
          else if (v.vote === 'WANT') item.wantCount += 1;
          else if (v.vote === 'OK' || v.vote === 'KEEP') item.okCount += 1;
        }
      }

      if (this.scenario === 'no_consensus') {
        for (const item of candidateMap.values()) {
          item.hasNo = true;
        }
      } else if (this.scenario === 'round_two' && req.round === 1) {
        for (const item of candidateMap.values()) {
          item.hasNo = true;
        }
      } else {
        const nonNoCandidates = Array.from(candidateMap.values()).filter((c) => !c.hasNo);
        if (nonNoCandidates.length > 0 && nonNoCandidates[0]) {
          nonNoCandidates[0].wantCount = room.members.length;
        }
      }

      const viable = Array.from(candidateMap.values())
        .filter((c) => !c.hasNo)
        .sort((a, b) => (b.wantCount * 2 + b.okCount) - (a.wantCount * 2 + a.okCount));

      if (viable.length === 0) {
        if (req.round === 1 && this.scenario === 'round_two') {
          room.round = 2;
          room.state = 'ROUND_2';
          room.pool = room.pool.slice(0, Math.max(2, Math.floor(room.pool.length / 2)));
          room.members.forEach((m) => (m.hasSubmitted = false));
        } else {
          room.state = 'NO_CONSENSUS';
          room.result = {
            resultId: 'res_' + Math.random().toString(36).substring(2, 9),
            roomId: room.roomId,
            round: req.round,
            winnerRoundDishId: null,
            winnerDish: null,
            reasonCode: 'NO_CONSENSUS',
            matchTier: 'TIER_NONE',
            finalizedAt: new Date().toISOString(),
            policyVersion: 'food-v1',
          };
        }
      } else {
        const top = viable[0]!;
        const isUnanimous = top.wantCount === room.members.length;
        const winner = top.dish;
        const result: RoomResult = {
          resultId: 'res_' + Math.random().toString(36).substring(2, 9),
          roomId: room.roomId,
          round: req.round,
          winnerRoundDishId: winner.roundDishId,
          winnerDish: winner,
          reasonCode: isUnanimous ? 'UNANIMOUS_WANT' : 'HIGHEST_SCORE',
          matchTier: isUnanimous ? 'TIER_1' : 'TIER_2',
          finalizedAt: new Date().toISOString(),
          policyVersion: 'food-v1',
        };
        room.result = result;
        room.state = 'DECIDED';
      }
    }

    room.version += 1;

    const receipt: SubmissionReceipt = {
      round: req.round,
      intentId: req.intentId,
      requestId,
      submittedAt: new Date().toISOString(),
      voteCount: req.votes.length,
      votesSummary: req.votes.map((v) => ({ roundDishId: v.roundDishId, vote: v.vote })),
    };
    room.ownSubmission = receipt;

    const response: WriteResult<SubmitBallotResponse> = {
      ok: true,
      requestId,
      roomId: room.roomId,
      version: room.version,
      state: room.state,
      data: {
        accepted: true,
        round: req.round,
        allMembersSubmitted: allSubmitted,
        roomVersion: room.version,
        requestId,
        receipt,
      },
    };

    this.recordIdempotency('submitBallot', requestId, signature, response);
    return response;
  }

  async getResultOfferings(roomId: string, _resultId: string): Promise<ReadResult<PoolDish[]>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    if (this.mode === 'empty') return { ok: true, data: [] };

    const room = this.rooms.get(roomId);
    if (!room || !room.result) {
      return { ok: false, error: { messageKey: 'ROOM_NOT_FOUND' } };
    }
    return { ok: true, data: room.result.winnerDish ? [room.result.winnerDish] : [] };
  }

  // ==========================================================================
  // Social & Friends RPCs
  // ==========================================================================

  async listFriends(): Promise<ReadResult<Friend[]>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    if (this.mode === 'empty') return { ok: true, data: [] };
    return { ok: true, data: [...this.friends] };
  }

  async invitePartner(req: InvitePartnerRequest): Promise<WriteResult<FriendInvitation>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<FriendInvitation>(
      'invitePartner',
      requestId,
      { friendCode: req.friendCode, partnerId: req.partnerId }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const invitation: FriendInvitation = {
      id: 'inv_' + Math.random().toString(36).substring(2, 8),
      inviterUserId: this.currentUser.id,
      inviterName: this.currentUser.displayName,
      inviteeUserId: req.partnerId || 'usr_invited',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 604800000).toISOString(),
    };
    const response: WriteResult<FriendInvitation> = { ok: true, requestId, data: invitation };
    this.recordIdempotency('invitePartner', requestId, signature, response);
    return response;
  }

  async acceptPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'acceptPartner',
      requestId,
      { invitationId }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('acceptPartner', requestId, signature, response);
    return response;
  }

  async rejectPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'rejectPartner',
      requestId,
      { invitationId }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('rejectPartner', requestId, signature, response);
    return response;
  }

  async unfriend(partnerId: string, customRequestId?: string): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'unfriend',
      requestId,
      { partnerId }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    this.friends = this.friends.filter((f) => f.friendUserId !== partnerId);
    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('unfriend', requestId, signature, response);
    return response;
  }

  async inviteToRoom(req: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<RoomInvitation>(
      'inviteToRoom',
      requestId,
      { roomId: req.roomId, partnerId: req.partnerId, expectedVersion: req.expectedVersion }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const room = this.rooms.get(req.roomId);
    const invitation: RoomInvitation = {
      id: 'rinv_' + Math.random().toString(36).substring(2, 8),
      roomId: req.roomId,
      roomCode: room?.code ?? 'GCD1',
      inviterUserId: this.currentUser.id,
      inviterName: this.currentUser.displayName,
      inviteeUserId: req.partnerId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
    };
    const response: WriteResult<RoomInvitation> = { ok: true, requestId, data: invitation };
    this.recordIdempotency('inviteToRoom', requestId, signature, response);
    return response;
  }

  async acceptRoomInvite(req: AcceptRoomInviteRequest): Promise<WriteResult<JoinRoomResponse>> {
    return this.joinRoom({ code: 'GCD1', displayName: req.displayName, requestId: req.requestId });
  }

  // ==========================================================================
  // Inbox & Devices RPCs
  // ==========================================================================

  async listPartnerInbox(_cursor?: string): Promise<ReadResult<InboxItem[]>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    if (this.mode === 'empty') return { ok: true, data: [] };
    return { ok: true, data: [...this.inbox] };
  }

  async registerPushDevice(req: RegisterPushDeviceRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'registerPushDevice',
      requestId,
      { deviceId: req.deviceId, token: req.token, permission: req.permission }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('registerPushDevice', requestId, signature, response);
    return response;
  }

  async unregisterPushDevice(deviceId: string, customRequestId?: string): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'unregisterPushDevice',
      requestId,
      { deviceId }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('unregisterPushDevice', requestId, signature, response);
    return response;
  }

  // ==========================================================================
  // History RPCs
  // ==========================================================================

  async getHistory(scope: 'personal' | 'group', _cursor?: string): Promise<ReadResult<HistoryItem[]>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    if (this.mode === 'empty') return { ok: true, data: [] };
    return { ok: true, data: this.history.filter((h) => h.scope === scope) };
  }

  async updateHistoryConsent(req: UpdateHistoryConsentRequest): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'updateHistoryConsent',
      requestId,
      { scope: req.scope, consent: req.consent }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('updateHistoryConsent', requestId, signature, response);
    return response;
  }

  async deleteHistory(historyId: string, customRequestId?: string): Promise<WriteResult<void>> {
    await this.wait();
    const fail = this.checkFailure();
    if (fail) return { ok: false, error: { messageKey: fail } };

    const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
    const { cachedResponse, conflictError, signature } = this.checkIdempotency<void>(
      'deleteHistory',
      requestId,
      { historyId }
    );
    if (cachedResponse) return cachedResponse;
    if (conflictError) return conflictError;

    this.history = this.history.filter((h) => h.id !== historyId);
    const response: WriteResult<void> = { ok: true, requestId, data: undefined };
    this.recordIdempotency('deleteHistory', requestId, signature, response);
    return response;
  }
}
