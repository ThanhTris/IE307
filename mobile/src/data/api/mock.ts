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
  SocialIdentity,
  InvitePartnerRequest,
  FriendInvitation,
  InviteToRoomRequest,
  RoomInvitation,
  AcceptRoomInviteRequest,
  InboxItem,
  RegisterPushDeviceRequest,
  HistoryItem,
  HistoryConsent,
  UpdateHistoryConsentRequest,
} from './contracts';
import {
  MOCK_COVERAGE_AREAS,
  MOCK_ANCHORS,
  MOCK_DISHES,
} from './mock/discoveryFixtures';
import {
  MOCK_CURRENT_USER,
  MOCK_DEFAULT_ROOM_CODE,
  MOCK_FRIENDS,
  MOCK_INBOX_ITEMS,
  MOCK_HISTORY_ITEMS,
} from './mock/socialFixtures';
import {
  MockMode,
  MockConsensusScenario,
  MockConfig,
  OwnRoomData,
  SharedRoomData,
  MockStateContext,
  buildDefaultRoom,
} from './mock/mockStore';
import {
  mockCreateRoom,
  mockJoinRoom,
  mockGetRoomSnapshot,
  mockUpdatePreferences,
  mockUpdateContext,
  mockSetReady,
  mockStartRound,
  mockLeaveRoom,
  mockCancelRoom,
  mockSubmitBallot,
  mockGetResultOfferings,
} from './mock/roomAndVotingMock';
import {
  mockGetMySocialIdentity,
  mockListFriends,
  mockInvitePartner,
  mockAcceptPartner,
  mockRejectPartner,
  mockUnfriend,
  mockInviteToRoom,
  mockAcceptRoomInvite,
  mockRejectRoomInvite,
  mockListPartnerInbox,
  mockMarkAllPartnerInboxRead,
  mockRegisterPushDevice,
  mockUnregisterPushDevice,
  mockGetHistory,
  mockGetHistoryConsent,
  mockUpdateHistoryConsent,
  mockDeleteHistory,
} from './mock/socialAndHistoryMock';

export type { MockMode, MockConsensusScenario, MockConfig };
export {
  MOCK_COVERAGE_AREAS,
  MOCK_ANCHORS,
  MOCK_DISHES,
  MOCK_CURRENT_USER,
  MOCK_DEFAULT_ROOM_CODE,
  MOCK_FRIENDS,
  MOCK_INBOX_ITEMS,
  MOCK_HISTORY_ITEMS,
};

export class MockApiClient implements ApiClient {
  private mode: MockMode;
  private scenario: MockConsensusScenario;
  private delayMs: number;
  private simulatedErrorCode: ErrorCode;
  private currentUser: SessionUser;

  private rooms: Map<string, SharedRoomData> = new Map();
  private ownRoomData: Map<string, Map<string, OwnRoomData>> = new Map();
  private friends: Friend[] = [...MOCK_FRIENDS];
  private inbox: InboxItem[] = [...MOCK_INBOX_ITEMS];
  private history: HistoryItem[] = [...MOCK_HISTORY_ITEMS];
  private historyConsents: Map<string, HistoryConsent> = new Map();
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

  private getOwnRoomData(roomId: string): OwnRoomData {
    let users = this.ownRoomData.get(roomId);
    if (!users) {
      users = new Map();
      this.ownRoomData.set(roomId, users);
    }
    let own = users.get(this.currentUser.id);
    if (!own) {
      own = {};
      users.set(this.currentUser.id, own);
    }
    return own;
  }

  private initDefaultRoom(): void {
    const defaultRoom = buildDefaultRoom(this.currentUser);
    this.rooms.set(defaultRoom.roomId, defaultRoom);
    this.rooms.set(defaultRoom.code, defaultRoom);
  }

  private async wait(): Promise<void> {
    const effectiveDelayMs = this.mode === 'loading' ? Math.max(this.delayMs, 300) : this.delayMs;
    if (effectiveDelayMs > 0) {
      await new Promise((r) => setTimeout(r, effectiveDelayMs));
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

  private get ctx(): MockStateContext {
    const self = this;
    return {
      get mode() { return self.mode; },
      get scenario() { return self.scenario; },
      get delayMs() { return self.delayMs; },
      get simulatedErrorCode() { return self.simulatedErrorCode; },
      get currentUser() { return self.currentUser; },
      rooms: this.rooms,
      ownRoomData: this.ownRoomData,
      get friends() { return self.friends; },
      set friends(val) { self.friends = val; },
      get inbox() { return self.inbox; },
      set inbox(val) { self.inbox = val; },
      get history() { return self.history; },
      set history(val) { self.history = val; },
      historyConsents: this.historyConsents,
      idempotencyMap: this.idempotencyMap,
      wait: () => this.wait(),
      checkFailure: () => this.checkFailure(),
      getOwnRoomData: (roomId) => this.getOwnRoomData(roomId),
      checkIdempotency: (op, reqId, payload) => this.checkIdempotency(op, reqId, payload),
      recordIdempotency: (op, reqId, sig, res) => this.recordIdempotency(op, reqId, sig, res),
    };
  }

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

  createRoom(req: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>> {
    return mockCreateRoom(this.ctx, req);
  }

  joinRoom(req: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    return mockJoinRoom(this.ctx, req);
  }

  getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    return mockGetRoomSnapshot(this.ctx, roomId);
  }

  updatePreferences(req: UpdatePreferencesRequest): Promise<WriteResult<void>> {
    return mockUpdatePreferences(this.ctx, req);
  }

  updateContext(req: UpdateContextRequest): Promise<WriteResult<void>> {
    return mockUpdateContext(this.ctx, req);
  }

  setReady(req: SetReadyRequest): Promise<WriteResult<void>> {
    return mockSetReady(this.ctx, req);
  }

  startRound(req: StartRoundRequest): Promise<WriteResult<void>> {
    return mockStartRound(this.ctx, req);
  }

  leaveRoom(req: LeaveRoomRequest): Promise<WriteResult<void>> {
    return mockLeaveRoom(this.ctx, req);
  }

  cancelRoom(req: CancelRoomRequest): Promise<WriteResult<void>> {
    return mockCancelRoom(this.ctx, req);
  }

  submitBallot(req: SubmitBallotRequest): Promise<WriteResult<SubmitBallotResponse>> {
    return mockSubmitBallot(this.ctx, req);
  }

  getResultOfferings(roomId: string, resultId: string): Promise<ReadResult<PoolDish[]>> {
    return mockGetResultOfferings(this.ctx, roomId, resultId);
  }

  getMySocialIdentity(): Promise<ReadResult<SocialIdentity>> {
    return mockGetMySocialIdentity(this.ctx);
  }

  listFriends(): Promise<ReadResult<Friend[]>> {
    return mockListFriends(this.ctx);
  }

  invitePartner(req: InvitePartnerRequest): Promise<WriteResult<FriendInvitation>> {
    return mockInvitePartner(this.ctx, req);
  }

  acceptPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return mockAcceptPartner(this.ctx, invitationId, customRequestId);
  }

  rejectPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return mockRejectPartner(this.ctx, invitationId, customRequestId);
  }

  unfriend(partnerId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return mockUnfriend(this.ctx, partnerId, customRequestId);
  }

  inviteToRoom(req: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>> {
    return mockInviteToRoom(this.ctx, req);
  }

  acceptRoomInvite(req: AcceptRoomInviteRequest): Promise<WriteResult<JoinRoomResponse>> {
    return mockAcceptRoomInvite(this.ctx, req);
  }

  rejectRoomInvite(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return mockRejectRoomInvite(this.ctx, invitationId, customRequestId);
  }

  listPartnerInbox(cursor?: string): Promise<ReadResult<InboxItem[]>> {
    return mockListPartnerInbox(this.ctx, cursor);
  }

  markAllPartnerInboxRead(customRequestId?: string): Promise<WriteResult<void>> {
    return mockMarkAllPartnerInboxRead(this.ctx, customRequestId);
  }

  registerPushDevice(req: RegisterPushDeviceRequest): Promise<WriteResult<void>> {
    return mockRegisterPushDevice(this.ctx, req);
  }

  unregisterPushDevice(deviceId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return mockUnregisterPushDevice(this.ctx, deviceId, customRequestId);
  }

  getHistory(scope: 'personal' | 'group', cursor?: string): Promise<ReadResult<HistoryItem[]>> {
    return mockGetHistory(this.ctx, scope, cursor);
  }

  getHistoryConsent(): Promise<ReadResult<HistoryConsent>> {
    return mockGetHistoryConsent(this.ctx);
  }

  updateHistoryConsent(req: UpdateHistoryConsentRequest): Promise<WriteResult<void>> {
    return mockUpdateHistoryConsent(this.ctx, req);
  }

  deleteHistory(historyId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return mockDeleteHistory(this.ctx, historyId, customRequestId);
  }
}
