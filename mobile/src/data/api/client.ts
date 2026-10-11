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
  RoomState,
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
  baseUrl?: string;
  transport?: ApiTransport;
  defaultTimeoutMs?: number;
  initialToken?: string | null;
  fetchFn?: typeof fetch;
}

/**
 * Standard HTTP/Fetch transport for Supabase RPC endpoints.
 */
export class FetchTransport implements ApiTransport {
  private readonly baseUrl: string;
  private readonly fetchFn?: typeof fetch;

  constructor(baseUrl: string, fetchFn?: typeof fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchFn = fetchFn;
  }

  getBaseUrl(): string {
    return this.baseUrl;
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
      const activeFetch = this.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined);
      if (!activeFetch) {
        throw new Error('Fetch API is not available in current environment');
      }

      const response = await activeFetch(url, {
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
    if (config?.transport) {
      this.transport = config.transport;
    } else {
      const defaultUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL)
        ? process.env.EXPO_PUBLIC_SUPABASE_URL
        : 'http://127.0.0.1:54321';
      const baseUrl = config?.baseUrl ?? defaultUrl;
      this.transport = new FetchTransport(baseUrl, config?.fetchFn);
    }
    this.defaultTimeoutMs = config?.defaultTimeoutMs ?? 15000;
    if (config?.initialToken) {
      this.token = config.initialToken;
    }
  }

  getTransport(): ApiTransport {
    return this.transport;
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

    // Handle Supabase/PostgREST error payloads
    if (errObj.body && typeof errObj.body === 'object') {
      const body = errObj.body as Record<string, unknown>;
      if (body.messageKey && typeof body.messageKey === 'string' && this.isValidErrorCode(body.messageKey)) {
        return {
          messageKey: body.messageKey as ErrorCode,
          message: typeof body.message === 'string' ? body.message : undefined,
          details: body.details as Record<string, unknown> | undefined,
        };
      }
      if (body.code && typeof body.code === 'string') {
        if (body.code === 'P0001' && typeof body.message === 'string') {
          // Custom raise exception from Postgres
          const match = body.message.match(/^[A-Z_]+/);
          if (match && this.isValidErrorCode(match[0])) {
            return { messageKey: match[0] as ErrorCode, message: body.message };
          }
        }
      }
    }

    // Handle HTTP status mapping
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
      'ROOM_NOT_FOUND', 'ROOM_FULL', 'ROOM_LOCKED', 'ROOM_EXPIRED', 'ROOM_TERMINAL',
      'INVALID_ROOM_STATE', 'CONTEXT_CHANGED',
      'ALREADY_SUBMITTED', 'VERSION_CONFLICT', 'REQUEST_ID_REUSED',
      'OUT_OF_COVERAGE', 'NO_ELIGIBLE_FOOD', 'AVAILABILITY_UNKNOWN', 'DESIRED_TIME_PASSED',
      'INVITE_EXPIRED', 'INVITE_REJECTED', 'RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT',
      'MALFORMED_RESPONSE', 'UNKNOWN_ERROR',
    ];
    return knownCodes.includes(key as ErrorCode);
  }

  /**
   * Unifies and normalizes RPC responses from Postgres functions.
   * Ensures business errors in HTTP 200 responses are never converted to success,
   * unwraps success envelope, and guards against malformed envelopes.
   */
  private normalizeRpcResponse<T>(
    raw: unknown,
    fallbackRequestId: string,
    roomId?: string
  ):
    | { ok: true; data: T; requestId: string; roomId?: string; version?: number; state?: RoomState | string }
    | { ok: false; requestId: string; roomId?: string; error: ApiError } {
    if (raw === null || raw === undefined) {
      return {
        ok: false,
        requestId: fallbackRequestId,
        roomId,
        error: { messageKey: 'MALFORMED_RESPONSE', message: 'RPC returned empty response' },
      };
    }

    if (typeof raw === 'object') {
      const env = raw as Record<string, any>;
      const resRequestId = typeof env.requestId === 'string' ? env.requestId : fallbackRequestId;
      const resRoomId = typeof env.roomId === 'string' ? env.roomId : roomId;

      // Explicit business error envelope: ok === false or presence of error object
      if (env.ok === false || env.error) {
        const errObj = env.error || {};
        let messageKey: ErrorCode = 'UNKNOWN_ERROR';
        if (typeof errObj.messageKey === 'string' && this.isValidErrorCode(errObj.messageKey)) {
          messageKey = errObj.messageKey;
        } else if (typeof env.messageKey === 'string' && this.isValidErrorCode(env.messageKey)) {
          messageKey = env.messageKey;
        }
        return {
          ok: false,
          requestId: resRequestId,
          roomId: resRoomId,
          error: {
            messageKey,
            message: errObj.message ?? env.message ?? 'Operation failed',
            details: errObj.details ?? env.details,
          },
        };
      }

      // Explicit success envelope: ok === true
      if (env.ok === true) {
        const dataPayload = env.data !== undefined ? env.data : env;
        return {
          ok: true,
          data: dataPayload as T,
          requestId: resRequestId,
          roomId: resRoomId,
          version: typeof env.version === 'number' ? env.version : undefined,
          state: typeof env.state === 'string' ? env.state : undefined,
        };
      }

      // Direct representation object (without ok wrapper)
      return {
        ok: true,
        data: raw as T,
        requestId: resRequestId,
        roomId: resRoomId,
        version: typeof env.version === 'number' ? env.version : undefined,
        state: typeof env.state === 'string' ? env.state : undefined,
      };
    }

    // Primitive return values (e.g., boolean, number)
    return {
      ok: true,
      data: raw as T,
      requestId: fallbackRequestId,
      roomId,
    };
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

  async createGuestSession(req: CreateGuestSessionRequest & { requestId?: string }): Promise<WriteResult<SessionResponse>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('create_guest_session', {
        requestId,
        display_name: req.displayName,
      });
      const norm = this.normalizeRpcResponse<SessionResponse>(raw, requestId);
      if (!norm.ok) return norm;
      if (norm.data?.token) {
        this.setAuthToken(norm.data.token);
      }
      return { ok: true, requestId: norm.requestId, data: norm.data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async restoreSession(token: string): Promise<ReadResult<SessionUser>> {
    try {
      const raw = await this.transport.invoke<unknown>('restore_session', {}, { token });
      const norm = this.normalizeRpcResponse<SessionUser>(raw, '');
      if (!norm.ok) return { ok: false, error: norm.error };
      this.setAuthToken(token);
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async logout(): Promise<WriteResult<void>> {
    const requestId = this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('logout', { requestId });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      this.setAuthToken(null);
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Discovery & Catalogue RPCs
  // ==========================================================================

  async getDiscoveryContext(areaId?: string, anchorId?: string): Promise<ReadResult<DiscoveryContextResponse>> {
    try {
      const raw = await this.callRpc<unknown>('get_discovery_context', {
        area_id: areaId ?? null,
        anchor_id: anchorId ?? null,
      });
      const norm = this.normalizeRpcResponse<DiscoveryContextResponse>(raw, '');
      if (!norm.ok) return { ok: false, error: norm.error };
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async previewFoodPool(req: PreviewFoodPoolRequest): Promise<ReadResult<PreviewFoodPoolResponse>> {
    try {
      const raw = await this.callRpc<unknown>('preview_food_pool', {
        anchor_id: req.anchorId,
        radius_m: req.radiusM,
        desired_at: req.desiredAt,
        service_mode: req.serviceMode,
        meal_slot: req.mealSlot,
        time_hint: req.timeHint ?? null,
        cuisine_ids: req.cuisineIds ?? null,
        category_ids: req.categoryIds ?? null,
        budget: req.budget ?? null,
      });
      const norm = this.normalizeRpcResponse<PreviewFoodPoolResponse>(raw, '');
      if (!norm.ok) return { ok: false, error: norm.error };
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Room Lifecycle RPCs
  // ==========================================================================

  async createRoom(req: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('create_room', {
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
      const norm = this.normalizeRpcResponse<CreateRoomResponse>(raw, requestId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: norm.data?.roomId ?? norm.roomId,
        version: norm.version ?? norm.data?.version ?? 1,
        state: norm.state ?? 'LOBBY',
        data: norm.data,
      };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async joinRoom(req: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('join_room', {
        requestId,
        code: req.code,
        display_name: req.displayName,
      });
      const norm = this.normalizeRpcResponse<JoinRoomResponse>(raw, requestId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: norm.data?.roomId ?? norm.roomId,
        version: norm.version ?? norm.data?.version ?? 1,
        state: norm.state ?? 'LOBBY',
        data: norm.data,
      };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    try {
      const raw = await this.callRpc<unknown>('get_room_snapshot', {
        room_id: roomId,
      });
      const norm = this.normalizeRpcResponse<RoomSnapshot>(raw, '', roomId);
      if (!norm.ok) return { ok: false, error: norm.error };
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async updatePreferences(req: UpdatePreferencesRequest): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('update_preferences', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
        cuisine_ids: req.preferences.cuisineIds,
        category_ids: req.preferences.categoryIds,
        temperature: req.preferences.temperature ?? null,
        flavor: req.preferences.flavor ?? null,
        history_consent: req.preferences.historyConsent,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: req.roomId,
        version: norm.version ?? req.expectedVersion + 1,
        state: norm.state ?? 'LOBBY',
        data: undefined,
      };
    } catch (err) {
      return { ok: false, requestId, roomId: req.roomId, error: this.mapError(err) };
    }
  }

  async updateContext(req: UpdateContextRequest): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('update_context', {
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
      const norm = this.normalizeRpcResponse<void>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: req.roomId,
        version: norm.version ?? req.expectedVersion + 1,
        state: norm.state ?? 'LOBBY',
        data: undefined,
      };
    } catch (err) {
      return { ok: false, requestId, roomId: req.roomId, error: this.mapError(err) };
    }
  }

  async setReady(req: SetReadyRequest): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('set_ready', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
        ready: req.ready,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: req.roomId,
        version: norm.version ?? req.expectedVersion,
        state: norm.state ?? 'LOBBY',
        data: undefined,
      };
    } catch (err) {
      return { ok: false, requestId, roomId: req.roomId, error: this.mapError(err) };
    }
  }

  async startRound(req: StartRoundRequest): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('start_round', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: req.roomId,
        version: norm.version ?? req.expectedVersion + 1,
        state: norm.state ?? 'ROUND_1',
        data: undefined,
      };
    } catch (err) {
      return { ok: false, requestId, roomId: req.roomId, error: this.mapError(err) };
    }
  }

  async leaveRoom(req: LeaveRoomRequest): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('leave_room', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: req.roomId,
        version: norm.version ?? req.expectedVersion + 1,
        data: undefined,
      };
    } catch (err) {
      return { ok: false, requestId, roomId: req.roomId, error: this.mapError(err) };
    }
  }

  async cancelRoom(req: CancelRoomRequest): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('cancel_room', {
        requestId,
        room_id: req.roomId,
        expected_version: req.expectedVersion,
        confirm_cancel: req.confirmCancel,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: req.roomId,
        version: norm.version ?? req.expectedVersion + 1,
        state: norm.state ?? 'CANCELLED',
        data: undefined,
      };
    } catch (err) {
      return { ok: false, requestId, roomId: req.roomId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Voting RPCs
  // ==========================================================================

  async submitBallot(req: SubmitBallotRequest): Promise<WriteResult<SubmitBallotResponse>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('submit_ballot', {
        requestId,
        room_id: req.roomId,
        round: req.round,
        pool_version: req.poolVersion,
        intent_id: req.intentId,
        expected_version: req.expectedVersion,
        votes: req.votes,
      });
      const norm = this.normalizeRpcResponse<SubmitBallotResponse>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return {
        ok: true,
        requestId: norm.requestId,
        roomId: req.roomId,
        version: norm.version ?? norm.data?.roomVersion,
        state: norm.state,
        data: norm.data,
      };
    } catch (err) {
      return { ok: false, requestId, roomId: req.roomId, error: this.mapError(err) };
    }
  }

  async getResultOfferings(roomId: string, resultId: string): Promise<ReadResult<PoolDish[]>> {
    try {
      const raw = await this.callRpc<unknown>('get_result_offerings', {
        room_id: roomId,
        result_id: resultId,
      });
      const norm = this.normalizeRpcResponse<PoolDish[]>(raw, '', roomId);
      if (!norm.ok) return { ok: false, error: norm.error };
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Social & Friends RPCs
  // ==========================================================================

  async listFriends(): Promise<ReadResult<Friend[]>> {
    try {
      const raw = await this.callRpc<unknown>('list_friends', {});
      const norm = this.normalizeRpcResponse<Friend[]>(raw, '');
      if (!norm.ok) return { ok: false, error: norm.error };
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async invitePartner(req: InvitePartnerRequest & { requestId?: string }): Promise<WriteResult<FriendInvitation>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('invite_partner', {
        requestId,
        friend_code: req.friendCode ?? null,
        partner_id: req.partnerId ?? null,
      });
      const norm = this.normalizeRpcResponse<FriendInvitation>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: norm.data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async acceptPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    const requestId = customRequestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('accept_partner', {
        requestId,
        invitation_id: invitationId,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async rejectPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    const requestId = customRequestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('reject_partner', {
        requestId,
        invitation_id: invitationId,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async unfriend(partnerId: string, customRequestId?: string): Promise<WriteResult<void>> {
    const requestId = customRequestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('unfriend', {
        requestId,
        partner_id: partnerId,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async inviteToRoom(req: InviteToRoomRequest & { requestId?: string }): Promise<WriteResult<RoomInvitation>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('invite_to_room', {
        requestId,
        room_id: req.roomId,
        partner_id: req.partnerId,
        expected_version: req.expectedVersion,
      });
      const norm = this.normalizeRpcResponse<RoomInvitation>(raw, requestId, req.roomId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, roomId: req.roomId, data: norm.data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async acceptRoomInvite(req: AcceptRoomInviteRequest & { requestId?: string }): Promise<WriteResult<JoinRoomResponse>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('accept_room_invite', {
        requestId,
        invitation_id: req.invitationId,
        display_name: req.displayName,
      });
      const norm = this.normalizeRpcResponse<JoinRoomResponse>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, roomId: norm.data?.roomId ?? norm.roomId, data: norm.data };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // Inbox & Devices RPCs
  // ==========================================================================

  async listPartnerInbox(cursor?: string): Promise<ReadResult<InboxItem[]>> {
    try {
      const raw = await this.callRpc<unknown>('list_partner_inbox', {
        cursor: cursor ?? null,
      });
      const norm = this.normalizeRpcResponse<InboxItem[]>(raw, '');
      if (!norm.ok) return { ok: false, error: norm.error };
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async registerPushDevice(req: RegisterPushDeviceRequest): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('register_push_device', {
        requestId,
        device_id: req.deviceId,
        token: req.token,
        permission: req.permission,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async unregisterPushDevice(deviceId: string, customRequestId?: string): Promise<WriteResult<void>> {
    const requestId = customRequestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('unregister_push_device', {
        requestId,
        device_id: deviceId,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  // ==========================================================================
  // History RPCs
  // ==========================================================================

  async getHistory(scope: 'personal' | 'group', cursor?: string): Promise<ReadResult<HistoryItem[]>> {
    try {
      const raw = await this.callRpc<unknown>('get_history', {
        scope,
        cursor: cursor ?? null,
      });
      const norm = this.normalizeRpcResponse<HistoryItem[]>(raw, '');
      if (!norm.ok) return { ok: false, error: norm.error };
      return { ok: true, data: norm.data };
    } catch (err) {
      return { ok: false, error: this.mapError(err) };
    }
  }

  async updateHistoryConsent(req: UpdateHistoryConsentRequest & { requestId?: string }): Promise<WriteResult<void>> {
    const requestId = req.requestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('update_history_consent', {
        requestId,
        scope: req.scope,
        consent: req.consent,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }

  async deleteHistory(historyId: string, customRequestId?: string): Promise<WriteResult<void>> {
    const requestId = customRequestId ?? this.generateRequestId();
    try {
      const raw = await this.callRpc<unknown>('delete_history', {
        requestId,
        history_id: historyId,
      });
      const norm = this.normalizeRpcResponse<void>(raw, requestId);
      if (!norm.ok) return norm;
      return { ok: true, requestId: norm.requestId, data: undefined };
    } catch (err) {
      return { ok: false, requestId, error: this.mapError(err) };
    }
  }
}
