/**
 * GM-07 — Supabase RPC client implementation with transport injection,
 * timeout handling, error mapping, and privacy-preserving error logging.
 * Spec: docs/architecture/API_CONTRACT.md
 * Database parity: supabase/migrations/0001_core_schema.sql
 */

import {
  ApiClient,
  ApiError,
  ErrorCode,
  ReadResult,
  WriteResult,
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
} from './contracts';

export interface TransportOptions {
  token?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ApiTransport {
  invoke<T>(rpcName: string, params: Record<string, unknown>, options?: TransportOptions): Promise<T>;
}

export interface ClientConfig {
  transport?: ApiTransport;
  defaultTimeoutMs?: number;
  initialToken?: string;
}

/**
 * Standard HTTP/Fetch transport for Supabase RPC endpoints.
 */
export class FetchTransport implements ApiTransport {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async invoke<T>(rpcName: string, params: Record<string, unknown>, options?: TransportOptions): Promise<T> {
    const url = `${this.baseUrl}/rest/v1/rpc/${rpcName}`;
    const timeoutMs = options?.timeoutMs ?? 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    if (options?.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: options?.signal ?? controller.signal,
      });

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        throw { status: response.status, body: errorBody };
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export class ApiClientImpl implements ApiClient {
  private transport: ApiTransport;
  private token: string | null = null;
  private defaultTimeoutMs: number;

  constructor(config?: ClientConfig) {
    this.transport = config?.transport ?? new FetchTransport('http://127.0.0.1:54321');
    this.defaultTimeoutMs = config?.defaultTimeoutMs ?? 15000;
    if (config?.initialToken) {
      this.token = config.initialToken;
    }
  }

  setAuthToken(token: string | null): void {
    this.token = token;
  }

  getAuthToken(): string | null {
    return this.token;
  }

  setTransport(transport: ApiTransport): void {
    this.transport = transport;
  }

  private generateRequestId(): string {
    return 'req_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  private mapError(err: unknown): ApiError {
    if (!err || typeof err !== 'object') {
      return { messageKey: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
    }

    const errObj = err as Record<string, unknown>;

    // Handle AbortError / Timeout
    if (errObj.name === 'AbortError' || errObj.message === 'Timeout') {
      return { messageKey: 'TIMEOUT', message: 'Request timed out' };
    }

    // Inspect server response body
    if (errObj.body && typeof errObj.body === 'object') {
      const body = errObj.body as Record<string, unknown>;
      const messageKey = (body.messageKey || body.code || body.message) as string;
      if (typeof messageKey === 'string' && this.isValidErrorCode(messageKey)) {
        return {
          messageKey: messageKey as ErrorCode,
          message: typeof body.message === 'string' ? body.message : undefined,
          details: typeof body.details === 'object' ? (body.details as Record<string, unknown>) : undefined,
        };
      }
    }

    // Status code fallback
    if (typeof errObj.status === 'number') {
      if (errObj.status === 401 || errObj.status === 403) {
        return { messageKey: 'AUTH_REQUIRED', message: 'Authentication required' };
      }
      if (errObj.status === 404) {
        return { messageKey: 'ROOM_NOT_FOUND', message: 'Resource not found' };
      }
      if (errObj.status === 409) {
        return { messageKey: 'VERSION_CONFLICT', message: 'Resource version conflict' };
      }
      if (errObj.status === 429) {
        return { messageKey: 'RATE_LIMITED', message: 'Too many requests' };
      }
    }

    if (errObj.message && typeof errObj.message === 'string' && errObj.message.includes('Network')) {
      return { messageKey: 'NETWORK_ERROR', message: 'Network connection error' };
    }

    return { messageKey: 'UNKNOWN_ERROR', message: 'Operation failed' };
  }

  private isValidErrorCode(key: string): key is ErrorCode {
    const knownCodes: ErrorCode[] = [
      'AUTH_REQUIRED', 'NOT_MEMBER', 'NOT_HOST', 'NOT_READY', 'NOT_PARTNER', 'CONSENT_REQUIRED',
      'INVALID_INPUT', 'INVALID_DISH', 'INCOMPLETE_BALLOT',
      'ROOM_NOT_FOUND', 'ROOM_FULL', 'ROOM_LOCKED', 'ROOM_EXPIRED', 'ROOM_TERMINAL', 'CONTEXT_CHANGED',
      'ALREADY_SUBMITTED', 'VERSION_CONFLICT', 'REQUEST_ID_REUSED',
      'OUT_OF_COVERAGE', 'NO_ELIGIBLE_FOOD', 'AVAILABILITY_UNKNOWN', 'DESIRED_TIME_PASSED',
      'INVITE_EXPIRED', 'INVITE_REJECTED', 'RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT', 'UNKNOWN_ERROR'
    ];
    return knownCodes.includes(key as ErrorCode);
  }

  private async callRpc<T>(rpcName: string, params: Record<string, unknown>): Promise<T> {
    return this.transport.invoke<T>(rpcName, params, {
      token: this.token ?? undefined,
      timeoutMs: this.defaultTimeoutMs,
    });
  }

  // ==========================================================================
  // Auth RPCs
  // ==========================================================================

  async createGuestSession(req: CreateGuestSessionRequest): Promise<WriteResult<SessionResponse>> {
    const requestId = this.generateRequestId();
    try {
      const data = await this.callRpc<SessionResponse>('create_guest_session', {
        requestId,
        display_name: req.displayName,
      });
      if (data?.token) {
        this.setAuthToken(data.token);
      }
      return { ok: true, requestId, data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async restoreSession(token: string): Promise<ReadResult<SessionUser>> {
    try {
      const data = await this.transport.invoke<SessionUser>('restore_session', {}, { token });
      this.setAuthToken(token);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async logout(): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('logout', { requestId });
      this.setAuthToken(null);
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Discovery & Catalogue RPCs
  // ==========================================================================

  async getDiscoveryContext(areaId?: string, anchorId?: string): Promise<ReadResult<DiscoveryContextResponse>> {
    try {
      const data = await this.callRpc<DiscoveryContextResponse>('get_discovery_context', {
        area_id: areaId ?? null,
        anchor_id: anchorId ?? null,
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async previewFoodPool(req: PreviewFoodPoolRequest): Promise<ReadResult<PreviewFoodPoolResponse>> {
    try {
      const data = await this.callRpc<PreviewFoodPoolResponse>('preview_food_pool', {
        anchor_id: req.anchorId,
        radius_m: req.radiusM,
        desired_at: req.desiredAt,
        service_mode: req.serviceMode,
        meal_slot: req.mealSlot,
        time_hint: req.timeHint ?? null,
        cuisine_ids: req.cuisineIds ?? [],
        category_ids: req.categoryIds ?? [],
        budget: req.budget ?? null,
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Room Lifecycle RPCs
  // ==========================================================================

  async createRoom(req: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>> {
    const requestId = this.generateRequestId();
    try {
      const data = await this.callRpc<CreateRoomResponse>('create_room', {
        requestId,
        display_name: req.displayName,
        anchor_id: req.context.anchorId,
        radius_m: req.context.radiusM,
        desired_at: req.context.desiredAt,
        service_mode: req.context.serviceMode,
        meal_slot: req.context.mealSlot,
        time_hint: req.context.timeHint ?? null,
        budget: req.context.budget ?? null,
        avoid_recent: req.context.avoidRecent,
      });
      return { ok: true, requestId, roomId: data.roomId, version: data.version, data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async joinRoom(req: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    const requestId = this.generateRequestId();
    try {
      const data = await this.callRpc<JoinRoomResponse>('join_room', {
        requestId,
        code: req.code,
        display_name: req.displayName,
      });
      return { ok: true, requestId, roomId: data.roomId, version: data.version, data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    try {
      const data = await this.callRpc<RoomSnapshot>('get_room_snapshot', {
        room_id: roomId,
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async updatePreferences(req: UpdatePreferencesRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('update_preferences', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
        cuisine_ids: req.preferences.cuisineIds,
        category_ids: req.preferences.categoryIds,
        temperature: req.preferences.temperature ?? null,
        flavor: req.preferences.flavor ?? null,
        history_consent: req.preferences.historyConsent,
      });
      return { ok: true, requestId, roomId: req.roomId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async updateContext(req: UpdateContextRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('update_context', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
        anchor_id: req.context.anchorId,
        radius_m: req.context.radiusM,
        desired_at: req.context.desiredAt,
        service_mode: req.context.serviceMode,
        meal_slot: req.context.mealSlot,
        time_hint: req.context.timeHint ?? null,
        budget: req.context.budget ?? null,
        avoid_recent: req.context.avoidRecent,
      });
      return { ok: true, requestId, roomId: req.roomId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async setReady(req: SetReadyRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('set_ready', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
        ready: req.ready,
      });
      return { ok: true, requestId, roomId: req.roomId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async startRound(req: StartRoundRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('start_round', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
      });
      return { ok: true, requestId, roomId: req.roomId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async leaveRoom(req: LeaveRoomRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('leave_room', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
      });
      return { ok: true, requestId, roomId: req.roomId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async cancelRoom(req: CancelRoomRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('cancel_room', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
        confirm_cancel: req.confirmCancel,
      });
      return { ok: true, requestId, roomId: req.roomId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Voting RPCs
  // ==========================================================================

  async submitBallot(req: SubmitBallotRequest): Promise<WriteResult<SubmitBallotResponse>> {
    const requestId = this.generateRequestId();
    try {
      const data = await this.callRpc<SubmitBallotResponse>('submit_ballot', {
        requestId,
        room_id: req.roomId,
        round: req.round,
        pool_version: req.poolVersion,
        intent_id: req.intentId,
        expected_version: req.expectedVersion,
        votes: req.votes,
      });
      return { ok: true, requestId, roomId: req.roomId, data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async getResultOfferings(roomId: string, resultId: string): Promise<ReadResult<PoolDish[]>> {
    try {
      const data = await this.callRpc<PoolDish[]>('get_result_offerings', {
        room_id: roomId,
        result_id: resultId,
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Social & Friends RPCs
  // ==========================================================================

  async listFriends(): Promise<ReadResult<Friend[]>> {
    try {
      const data = await this.callRpc<Friend[]>('list_friends', {});
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async invitePartner(req: InvitePartnerRequest): Promise<WriteResult<FriendInvitation>> {
    const requestId = this.generateRequestId();
    try {
      const data = await this.callRpc<FriendInvitation>('invite_partner', {
        requestId,
        friend_code: req.friendCode ?? null,
        partner_id: req.partnerId ?? null,
      });
      return { ok: true, requestId, data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async acceptPartner(invitationId: string): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('accept_partner', {
        requestId,
        invitation_id: invitationId,
      });
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async rejectPartner(invitationId: string): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('reject_partner', {
        requestId,
        invitation_id: invitationId,
      });
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async unfriend(partnerId: string): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('unfriend', {
        requestId,
        partner_id: partnerId,
      });
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async inviteToRoom(req: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>> {
    const requestId = this.generateRequestId();
    try {
      const data = await this.callRpc<RoomInvitation>('invite_to_room', {
        requestId,
        room_id: req.roomId,
        partner_id: req.partnerId,
        expected_version: req.expectedVersion,
      });
      return { ok: true, requestId, roomId: req.roomId, data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async acceptRoomInvite(req: AcceptRoomInviteRequest): Promise<WriteResult<JoinRoomResponse>> {
    const requestId = this.generateRequestId();
    try {
      const data = await this.callRpc<JoinRoomResponse>('accept_room_invite', {
        requestId,
        invitation_id: req.invitationId,
        display_name: req.displayName,
      });
      return { ok: true, requestId, roomId: data.roomId, data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Inbox & Devices RPCs
  // ==========================================================================

  async listPartnerInbox(cursor?: string): Promise<ReadResult<InboxItem[]>> {
    try {
      const data = await this.callRpc<InboxItem[]>('list_partner_inbox', {
        cursor: cursor ?? null,
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async registerPushDevice(req: RegisterPushDeviceRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('register_push_device', {
        requestId,
        device_id: req.deviceId,
        token: req.token,
        permission: req.permission,
      });
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async unregisterPushDevice(deviceId: string): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('unregister_push_device', {
        requestId,
        device_id: deviceId,
      });
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // History RPCs
  // ==========================================================================

  async getHistory(scope: 'personal' | 'group', cursor?: string): Promise<ReadResult<HistoryItem[]>> {
    try {
      const data = await this.callRpc<HistoryItem[]>('get_history', {
        scope,
        cursor: cursor ?? null,
      });
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async updateHistoryConsent(req: UpdateHistoryConsentRequest): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('update_history_consent', {
        requestId,
        scope: req.scope,
        consent: req.consent,
      });
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async deleteHistory(historyId: string): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      await this.callRpc<void>('delete_history', {
        requestId,
        history_id: historyId,
      });
      return { ok: true, requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }
}
