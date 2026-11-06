/**
 * GM-25 — Live Room Repository implementation.
 * Connects Home, context, preferences, and lobby to the real API client and auth session.
 * Spec: docs/architecture/API_CONTRACT.md
 * Task: GM-25 (Issue #86)
 * ADR-019 / v4 consumer compliance: ready flow removed from consumer.
 */

import type {
  ApiClient,
  ApiError,
  CreateGuestSessionRequest,
  ErrorCode,
  CreateRoomRequest,
  CreateRoomResponse,
  DiscoveryContextResponse,
  Friend,
  HistoryConsent,
  InviteToRoomRequest,
  JoinRoomRequest,
  JoinRoomResponse,
  LeaveRoomRequest,
  CancelRoomRequest,
  PreviewFoodPoolRequest,
  PreviewFoodPoolResponse,
  ReadResult,
  RoomInvitation,
  RoomSnapshot,
  SessionResponse,
  SessionUser,
  SetReadyRequest,
  StartRoundRequest,
  UpdateContextRequest,
  UpdatePreferencesRequest,
  UserPreferences,
  WriteResult,
} from '../../../data/api/contracts';
import { mapErrorHelper } from '../../../data/api/client/helpers';
import { isCanonicalRoomSnapshot, isRoomSnapshot } from '../../../data/api/responseGuards';
import type { SessionApi, SessionStorage } from '../../../data/auth/types';
import type { RoomEntryRepository } from './roomEntry';
import type { JoinRoomPublicPreview } from './joinPreview';
import { normalizeRoomCode, validRoomCode } from './roomEntry';
import type { PreferenceCatalogue, RoomSetupRepository } from '../../context/services/roomSetup';
import type { SessionSnapshot, SessionStatus } from './sessionState';

export const CANONICAL_CONTRACT_VERSION = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
export const BASELINE_CONTRACT_VERSION = 'dish-session-v4/roadmap-v2/GM-07.B';

export type RequestIdGenerator = (prefix?: string) => string;

let requestSeq = 0;
/**
 * Creates a unique durable request ID for idempotent RPC operations.
 * Resistant to collisions across retries and client instances.
 */
export function createDurableRequestId(prefix = 'req'): string {
  const ts = Date.now().toString(36);
  const seq = (++requestSeq).toString(36);
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${ts}_${seq}_${rand}`;
}

export interface PreviewJoinAck {
  joinable: boolean;
  memberCount: number;
  memberLimit: number;
  dishCount: number;
  mealSlot: string;
  roomState: string;
  reasonCode?: string | null;
}

export function isPreviewJoinAck(data: unknown): data is PreviewJoinAck {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (typeof d.joinable !== 'boolean') return false;
  if (typeof d.memberCount !== 'number' || !Number.isInteger(d.memberCount) || d.memberCount < 0 || d.memberCount > 20) return false;
  if (d.memberLimit !== 20) return false;
  if (typeof d.dishCount !== 'number' || !Number.isInteger(d.dishCount) || d.dishCount < 10 || d.dishCount > 20) return false;
  if (typeof d.mealSlot !== 'string' || !['breakfast', 'lunch', 'dinner', 'snack'].includes(d.mealSlot)) return false;
  if (typeof d.roomState !== 'string') return false;
  if (d.reasonCode !== undefined && d.reasonCode !== null && typeof d.reasonCode !== 'string') return false;
  return true;
}

export const defaultPreferenceCatalogue: PreferenceCatalogue = {
  cuisines: [
    { id: 'd7bf6ad7-596c-5ee0-bf45-ccedfcf6460b', label: 'Món Việt' },
    { id: '76754d62-96e1-5d54-bf87-048a0df60e3f', label: 'Món Hoa' },
    { id: '9397254e-ad5f-5f85-9674-96933b6c0db2', label: 'Món Hàn' },
    { id: '73e625b4-4d2f-50f8-8051-111b703f6f11', label: 'Món Nhật' },
  ],
  categories: [
    { id: 'e69b5f45-580d-5ee3-9e43-360650b4c650', label: 'Cơm' },
    { id: '14bc9d6f-c43e-5c1d-9c13-eddc5cc80dcc', label: 'Bún' },
    { id: '1f89baf1-52f8-5f1e-98d8-7a36cae7a596', label: 'Phở' },
    { id: '811f6aa0-6b7f-5645-aeb9-c2f96cf50630', label: 'Bánh mì' },
  ],
};

export interface RoomRepositoryConfig {
  client: ApiClient;
  session?: SessionApi;
  sessionStorage?: SessionStorage;
  requestIdGenerator?: RequestIdGenerator;
}

export interface RoomRepository extends Omit<RoomEntryRepository, 'restoreSession'>, RoomSetupRepository {
  restoreSession(sessionToken?: string): Promise<ReadResult<SessionUser>>;

  /**
   * Public preview of a room before join (Figma node 330:3069).
   * Returns only public fields (code, memberCount, capacity); never leaks private ballots or settings.
   */
  previewJoin(code: string): Promise<ReadResult<JoinRoomPublicPreview>>;

  // Modern dish session dispatch for canonical v4 rooms
  dispatchDishSession<T = unknown>(
    command: string,
    payload: Record<string, unknown>,
    version?: 'supplement' | 'baseline'
  ): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }>;

  getDefaultPreferences(): Promise<ReadResult<{ revision: number; preferences: UserPreferences }>>;
  getHistoryConsent(): Promise<ReadResult<HistoryConsent>>;
  updateHistoryConsent(scope: 'personal' | 'group', consent: boolean, requestId?: string): Promise<WriteResult<void>>;

  // Lobby RPC operations
  /** @deprecated GM-25 removes ready flow per ADR-019 / v4 consumer rules. Kept for backwards compatibility. */
  setReady(request: SetReadyRequest): Promise<WriteResult<void>>;
  startRound(request: StartRoundRequest): Promise<WriteResult<void>>;
  leaveRoom(request: LeaveRoomRequest): Promise<WriteResult<void>>;
  cancelRoom(request: CancelRoomRequest): Promise<WriteResult<void>>;
  inviteToRoom(request: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>>;

  // Session & Identity operations
  createGuestSession(displayName: string, requestId?: string): Promise<WriteResult<SessionResponse>>;
  logout(): Promise<WriteResult<void>>;
  getCurrentUser(): SessionUser | null;
  getSessionStatus(): SessionStatus;
  getSessionSnapshot(): SessionSnapshot;
  subscribeSession(listener: () => void): () => void;
  getApiClient(): ApiClient;
  getSessionApi(): SessionApi | undefined;
  runAuthenticatedFeatureApi?<T>(operation: (client: ApiClient) => Promise<T>): Promise<T>;
}

export class LiveRoomRepository implements RoomRepository {
  private readonly client: ApiClient;
  private readonly session?: SessionApi;
  private readonly sessionStorage?: SessionStorage;
  private readonly nextRequestId: RequestIdGenerator;
  private sessionSnapshot: SessionSnapshot = { status: 'empty', user: null, issue: 'none' };
  private readonly listeners = new Set<() => void>();
  private identityRevision = 0;

  constructor(config: RoomRepositoryConfig) {
    if (!config || !config.client) {
      throw new Error('ApiClient is required to construct LiveRoomRepository');
    }
    this.client = config.client;
    this.session = config.session;
    this.sessionStorage = config.sessionStorage;
    this.nextRequestId = config.requestIdGenerator ?? createDurableRequestId;
  }

  private getRpcCaller(): ((rpcName: string, params: Record<string, unknown>) => Promise<unknown>) | null {
    const directCall = (this.client as unknown as { callRpc?: (rpc: string, p: Record<string, unknown>) => Promise<unknown> }).callRpc;
    if (typeof directCall === 'function') {
      return directCall.bind(this.client);
    }
    const ctxCall = (this.client as unknown as { ctx?: { callRpc?: (rpc: string, p: Record<string, unknown>) => Promise<unknown> } })?.ctx?.callRpc;
    if (typeof ctxCall === 'function') {
      return ctxCall.bind((this.client as unknown as { ctx: unknown }).ctx);
    }
    return null;
  }

  // --- Session & Identity ---

  async restoreSession(sessionToken?: string): Promise<ReadResult<SessionUser>> {
    const revision = ++this.identityRevision;
    const recoveringRejectedSession = this.sessionSnapshot.issue === 'session-recovery-required';
    let storedSessionExists: boolean | undefined;

    if (this.session && this.sessionStorage) {
      try {
        storedSessionExists = Boolean(await this.sessionStorage.load());
      } catch {
        this.updateSessionSnapshot({ status: 'blocked', user: null, issue: 'storage-unavailable' });
        return { ok: false, error: { messageKey: 'UNKNOWN_ERROR' } };
      }
    }
    if (revision !== this.identityRevision) return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };

    let result: ReadResult<SessionUser>;
    if (this.session) {
      if (recoveringRejectedSession) {
        result = await this.session.refreshSession();
      } else {
        const restore = this.session.restoreSession as (token?: string) => Promise<ReadResult<SessionUser>>;
        result = await restore.call(this.session, sessionToken);
      }
    } else {
      result = await this.client.restoreSession(sessionToken ?? '');
    }

    if (revision !== this.identityRevision) return result;
    if (result.ok) {
      this.updateSessionSnapshot({ status: 'active', user: result.data, issue: 'none' });
    } else if (!this.session) {
      this.updateSessionSnapshot({ status: 'empty', user: null, issue: result.error.messageKey === 'AUTH_REQUIRED' ? 'no-session' : 'restore-unavailable' });
    } else {
      const status = readManagerStatus(this.session);
      const noSavedSession = storedSessionExists === false
        || (storedSessionExists === undefined && result.error.messageKey === 'AUTH_REQUIRED' && this.sessionSnapshot.status === 'empty');
      const next = recoveringRejectedSession && result.error.messageKey === 'AUTH_REQUIRED'
        ? { status: 'lost' as const, user: null, issue: 'session-revoked' as const }
        : recoveringRejectedSession && status === 'blocked'
          ? { status: 'blocked' as const, user: null, issue: 'unknown-error' as const }
          : recoveringRejectedSession
            ? { status: 'lost' as const, user: null, issue: 'session-recovery-required' as const }
            : noSavedSession
        ? { status: 'empty' as const, user: null, issue: 'no-session' as const }
        : result.error.messageKey === 'AUTH_REQUIRED'
          ? { status: 'lost' as const, user: null, issue: 'session-revoked' as const }
          : status === 'blocked'
            ? { status: 'blocked' as const, user: null, issue: result.error.messageKey === 'UNKNOWN_ERROR' ? 'storage-unavailable' as const : 'unknown-error' as const }
            : { status: 'empty' as const, user: null, issue: 'restore-unavailable' as const };
      this.updateSessionSnapshot(next);
    }
    return result;
  }

  private updateSessionSnapshot(snapshot: SessionSnapshot) {
    this.sessionSnapshot = snapshot;
    for (const listener of this.listeners) {
      try { listener(); } catch { /* Session state observers must not block repository results. */ }
    }
  }

  async createGuestSession(displayName: string, requestId?: string): Promise<WriteResult<SessionResponse>> {
    const rid = requestId ?? this.nextRequestId('guest');
    const req: CreateGuestSessionRequest = { displayName: displayName.trim(), requestId: rid };
    const revision = ++this.identityRevision;
    let result: WriteResult<SessionResponse>;
    if (this.session) {
      result = await this.session.createGuestSession(req);
    } else {
      result = await this.client.createGuestSession(req);
    }
    if (revision !== this.identityRevision) return result;
    if (result.ok) {
      this.updateSessionSnapshot({ status: 'active', user: result.data.user, issue: 'none' });
    } else if (this.session) {
      const status = readManagerStatus(this.session);
      if (['NETWORK_ERROR', 'TIMEOUT', 'MALFORMED_RESPONSE'].includes(result.error.messageKey)) {
        this.updateSessionSnapshot({ status: 'blocked', user: null, issue: 'signup-uncertain' });
      } else if (status === 'blocked') {
        this.updateSessionSnapshot({ status: 'blocked', user: null, issue: result.error.messageKey === 'UNKNOWN_ERROR' ? 'storage-unavailable' : 'unknown-error' });
      }
    }
    return result;
  }

  async logout(): Promise<WriteResult<void>> {
    ++this.identityRevision;
    this.updateSessionSnapshot({ status: 'blocked', user: null, issue: 'no-session' });
    let result: WriteResult<void>;
    if (this.session) {
      result = await this.session.logout();
    } else {
      result = await this.client.logout();
    }
    this.updateSessionSnapshot(result.ok
      ? { status: 'empty', user: null, issue: 'no-session' }
      : { status: 'blocked', user: null, issue: 'unknown-error' });
    return result;
  }

  getCurrentUser(): SessionUser | null {
    return this.getSessionSnapshot().user;
  }

  getSessionStatus(): SessionStatus {
    return this.getSessionSnapshot().status;
  }

  getSessionSnapshot(): SessionSnapshot {
    return this.sessionSnapshot;
  }

  subscribeSession(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getApiClient(): ApiClient {
    return this.client;
  }

  getSessionApi(): SessionApi | undefined {
    return this.session;
  }

  runAuthenticatedFeatureApi<T>(operation: (client: ApiClient) => Promise<T>): Promise<T> {
    return this.request(() => operation(this.client));
  }

  // --- Room Entry (GM-09 / Home / Create / Join) ---

  async listFriends(): Promise<ReadResult<Friend[]>> {
    return this.request(() => this.client.listFriends());
  }

  async getDiscoveryContext(): Promise<ReadResult<DiscoveryContextResponse>> {
    return this.request(() => this.client.getDiscoveryContext());
  }

  async createRoom(request: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>> {
    const rid = request.requestId || this.nextRequestId('room_create');
    if (this.getSessionStatus() !== 'active') {
      return { ok: false, requestId: rid, error: { messageKey: 'AUTH_REQUIRED' } };
    }
    return this.request(() => this.client.createRoom({ ...request, requestId: rid }));
  }

  async previewJoin(code: string): Promise<ReadResult<JoinRoomPublicPreview>> {
    const normalized = normalizeRoomCode(code);
    if (!validRoomCode(normalized)) {
      return { ok: false, error: { messageKey: 'INVALID_INPUT' } };
    }
    return this.request(async () => {
      const clientWithPreview = this.client as unknown as { previewJoin?: (c: string) => Promise<ReadResult<JoinRoomPublicPreview>> };
      if (typeof clientWithPreview.previewJoin === 'function') {
        return clientWithPreview.previewJoin(normalized);
      }

      const call = this.getRpcCaller();
      if (!call) {
        return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
      }

      try {
        const raw = (await call('dish_session', {
          command: 'previewJoin',
          payload: {
            contractVersion: CANONICAL_CONTRACT_VERSION,
            requestId: this.nextRequestId('prev_join'),
            code: normalized,
          },
        })) as {
          ok?: boolean;
          data?: unknown;
          error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
        };

        if (raw && !raw.ok) {
          const errCode = (raw.error?.messageKey || raw.error?.code || 'ROOM_NOT_FOUND') as ErrorCode;
          return { ok: false, error: { messageKey: errCode } };
        }

        if (raw?.ok && isPreviewJoinAck(raw.data)) {
          const ack = raw.data;
          if (ack.reasonCode) {
            return { ok: false, error: { messageKey: ack.reasonCode as ErrorCode } };
          }
          if (!ack.joinable) {
            return { ok: false, error: { messageKey: 'ROOM_LOCKED' } };
          }
          return {
            ok: true,
            data: {
              code: normalized,
              memberCount: ack.memberCount,
              capacity: ack.memberLimit,
            },
          };
        }

        return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
      } catch (err: unknown) {
        const mapped = mapErrorHelper(err);
        return { ok: false, error: mapped };
      }
    });
  }

  async joinRoom(request: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    const rid = request.requestId || this.nextRequestId('room_join');
    if (this.getSessionStatus() !== 'active') {
      return { ok: false, requestId: rid, error: { messageKey: 'AUTH_REQUIRED' } };
    }
    return this.request(async () => {
      const normalizedCode = normalizeRoomCode(request.code);
      const call = this.getRpcCaller();

      if (call) {
        try {
          const raw = (await call('dish_session', {
            command: 'join',
            payload: {
              contractVersion: CANONICAL_CONTRACT_VERSION,
              requestId: rid,
              code: normalizedCode,
              displayName: request.displayName,
            },
          })) as {
            ok?: boolean;
            data?: { roomId?: string; code?: string; version?: number; memberId?: string };
            error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
          };

          if (raw?.ok && raw.data?.roomId && raw.data?.memberId) {
            return {
              ok: true,
              requestId: rid,
              roomId: raw.data.roomId,
              data: {
                roomId: raw.data.roomId,
                code: raw.data.code || normalizedCode,
                version: raw.data.version ?? 1,
                memberId: raw.data.memberId,
                role: 'member',
              },
            };
          }

          if (raw && !raw.ok) {
            const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
            return { ok: false, requestId: rid, error: { messageKey: errCode, details: raw.error?.details } };
          }
          return { ok: false, requestId: rid, error: { messageKey: 'UNKNOWN_ERROR' } };
        } catch (err: unknown) {
          const mapped = mapErrorHelper(err);
          return { ok: false, requestId: rid, error: mapped };
        }
      }

      return this.client.joinRoom({ ...request, requestId: rid });
    });
  }

  async getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    return this.request(async () => {
      const call = this.getRpcCaller();
      if (call) {
        try {
          const raw = (await call('dish_session', {
            command: 'snapshot',
            payload: {
              contractVersion: CANONICAL_CONTRACT_VERSION,
              roomId,
            },
          })) as {
            ok?: boolean;
            data?: unknown;
            error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
          };

          if (raw?.ok && raw.data && typeof raw.data === 'object') {
            if (!isCanonicalRoomSnapshot(raw.data) && !isRoomSnapshot(raw.data)) {
              return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE', message: 'Snapshot does not match the canonical or legacy contract' } };
            }
            return { ok: true, data: raw.data as RoomSnapshot };
          }
          if (raw && !raw.ok) {
            const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
            return { ok: false, error: { messageKey: errCode, details: raw.error?.details } };
          }
          return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
        } catch (err: unknown) {
          const mapped = mapErrorHelper(err);
          return { ok: false, error: mapped };
        }
      }

      return this.client.getRoomSnapshot(roomId);
    });
  }

  // --- Room Setup (GM-10 / Context / Preferences) ---

  async previewFoodPool(request: PreviewFoodPoolRequest): Promise<ReadResult<PreviewFoodPoolResponse>> {
    return this.request(() => this.client.previewFoodPool(request));
  }

  async updateContext(request: UpdateContextRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('ctx_upd');
    return this.request(() => this.client.updateContext({ ...request, requestId: rid }));
  }

  async updatePreferences(request: UpdatePreferencesRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('pref_upd');
    return this.request(async () => {
      const call = this.getRpcCaller();
      if (call) {
        try {
          const raw = (await call('dish_session', {
            command: 'updatePreferences',
            payload: {
              contractVersion: CANONICAL_CONTRACT_VERSION,
              requestId: rid,
              roomId: request.roomId,
              expectedVersion: request.expectedVersion,
              preferences: request.preferences,
            },
          })) as {
            ok?: boolean;
            data?: unknown;
            error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
          };

          if (raw?.ok) {
            return { ok: true, requestId: rid, roomId: request.roomId, data: undefined };
          }
          if (raw && !raw.ok) {
            const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
            return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: errCode, details: raw.error?.details } };
          }
          return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: 'UNKNOWN_ERROR' } };
        } catch (err: unknown) {
          const mapped = mapErrorHelper(err);
          return { ok: false, requestId: rid, roomId: request.roomId, error: mapped };
        }
      }

      return this.client.updatePreferences({ ...request, requestId: rid });
    });
  }

  // --- Modern dish_session v4 Operations ---

  async dispatchDishSession<T = unknown>(
    command: string,
    payload: Record<string, unknown>,
    version: 'supplement' | 'baseline' = 'supplement'
  ): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
    const call = this.getRpcCaller();
    if (!call) {
      return { ok: false, error: { messageKey: 'NETWORK_ERROR' } };
    }
    const contractVersion = version === 'baseline' ? BASELINE_CONTRACT_VERSION : CANONICAL_CONTRACT_VERSION;
    const isReadCommand = command === 'snapshot' || command === 'getDefaultPreferences';
    const finalPayload: Record<string, unknown> = {
      contractVersion,
      ...payload,
    };
    if (isReadCommand) {
      delete finalPayload.requestId;
    } else if (!finalPayload.requestId) {
      finalPayload.requestId = this.nextRequestId(`ds_${command}`);
    }

    try {
      const raw = (await call('dish_session', {
        command,
        payload: finalPayload,
      })) as {
        ok?: boolean;
        data?: T;
        error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
      };

      if (raw?.ok) {
        return { ok: true, data: raw.data as T };
      }
      const errCode = (raw?.error?.messageKey || raw?.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
      return { ok: false, error: { messageKey: errCode, details: raw?.error?.details } };
    } catch (err: unknown) {
      return { ok: false, error: mapErrorHelper(err) };
    }
  }

  async getDefaultPreferences(): Promise<ReadResult<{ revision: number; preferences: UserPreferences }>> {
    return this.request(async () => {
      const call = this.getRpcCaller();
      if (call) {
        try {
          const raw = (await call('dish_session', {
            command: 'getDefaultPreferences',
            payload: {
              contractVersion: CANONICAL_CONTRACT_VERSION,
            },
          })) as {
            ok?: boolean;
            data?: { revision?: number; preferences?: UserPreferences };
            error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
          };

          if (raw?.ok && raw.data && raw.data.preferences) {
            return {
              ok: true,
              data: {
                revision: raw.data.revision ?? 1,
                preferences: raw.data.preferences,
              },
            };
          }
          if (raw && !raw.ok) {
            const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
            return { ok: false, error: { messageKey: errCode, details: raw.error?.details } };
          }
          return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
        } catch (err: unknown) {
          return { ok: false, error: mapErrorHelper(err) };
        }
      }

      return {
        ok: false,
        error: { messageKey: 'NETWORK_ERROR', message: 'Client RPC caller unavailable' },
      };
    });
  }

  async getHistoryConsent(): Promise<ReadResult<HistoryConsent>> {
    return this.request(() => this.client.getHistoryConsent());
  }

  // --- Lobby Actions (GM-11 / Ready / Start / Leave / Cancel) ---

  async setReady(request: SetReadyRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('ready');
    return this.request(() => this.client.setReady({ ...request, requestId: rid }));
  }

  async startRound(request: StartRoundRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('start');
    return this.request(async () => {
      const call = this.getRpcCaller();
      if (call) {
        try {
          const raw = (await call('dish_session', {
            command: 'start',
            payload: {
              contractVersion: CANONICAL_CONTRACT_VERSION,
              requestId: rid,
              roomId: request.roomId,
              expectedVersion: request.expectedVersion,
            },
          })) as {
            ok?: boolean;
            data?: unknown;
            error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
          };

          if (raw?.ok) {
            return { ok: true, requestId: rid, roomId: request.roomId, data: undefined };
          }
          if (raw && !raw.ok) {
            const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
            return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: errCode, details: raw.error?.details } };
          }
          return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: 'UNKNOWN_ERROR' } };
        } catch (err: unknown) {
          const mapped = mapErrorHelper(err);
          return { ok: false, requestId: rid, roomId: request.roomId, error: mapped };
        }
      }

      return this.client.startRound({ ...request, requestId: rid });
    });
  }

  async leaveRoom(request: LeaveRoomRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('leave');
    return this.request(async () => {
      const call = this.getRpcCaller();
      if (call) {
        try {
          const raw = (await call('dish_session', {
            command: 'leave',
            payload: {
              contractVersion: CANONICAL_CONTRACT_VERSION,
              requestId: rid,
              roomId: request.roomId,
              expectedVersion: request.expectedVersion,
            },
          })) as {
            ok?: boolean;
            data?: unknown;
            error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
          };

          if (raw?.ok) {
            return { ok: true, requestId: rid, roomId: request.roomId, data: undefined };
          }
          if (raw && !raw.ok) {
            const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
            return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: errCode, details: raw.error?.details } };
          }
          return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: 'UNKNOWN_ERROR' } };
        } catch (err: unknown) {
          const mapped = mapErrorHelper(err);
          return { ok: false, requestId: rid, roomId: request.roomId, error: mapped };
        }
      }

      return this.client.leaveRoom({ ...request, requestId: rid });
    });
  }

  async cancelRoom(request: CancelRoomRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('cancel');
    return this.request(async () => {
      const call = this.getRpcCaller();
      if (call) {
        try {
          const raw = (await call('dish_session', {
            command: 'cancel',
            payload: {
              contractVersion: CANONICAL_CONTRACT_VERSION,
              requestId: rid,
              roomId: request.roomId,
              expectedVersion: request.expectedVersion,
            },
          })) as {
            ok?: boolean;
            data?: unknown;
            error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
          };

          if (raw?.ok) {
            return { ok: true, requestId: rid, roomId: request.roomId, data: undefined };
          }
          if (raw && !raw.ok) {
            const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
            return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: errCode, details: raw.error?.details } };
          }
          return { ok: false, requestId: rid, roomId: request.roomId, error: { messageKey: 'UNKNOWN_ERROR' } };
        } catch (err: unknown) {
          const mapped = mapErrorHelper(err);
          return { ok: false, requestId: rid, roomId: request.roomId, error: mapped };
        }
      }

      return this.client.cancelRoom({ ...request, requestId: rid });
    });
  }

  async inviteToRoom(request: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>> {
    const rid = request.requestId || this.nextRequestId('invite');
    return this.request(() => this.client.inviteToRoom({ ...request, requestId: rid }));
  }

  async updateHistoryConsent(scope: 'personal' | 'group', consent: boolean, requestId?: string): Promise<WriteResult<void>> {
    const rid = requestId || this.nextRequestId('consent');
    return this.request(async () => {
      const call = this.getRpcCaller();
      if (call) {
        try {
          const raw = (await call('update_history_consent', {
            requestId: rid,
            scope,
            consent,
          })) as { ok?: boolean; error?: { messageKey?: string; code?: string; details?: Record<string, unknown> } };
          if (raw?.ok) {
            return { ok: true, requestId: rid, data: undefined };
          }
          const errCode = (raw?.error?.messageKey || raw?.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
          return { ok: false, requestId: rid, error: { messageKey: errCode, details: raw?.error?.details } };
        } catch (err: unknown) {
          return { ok: false, requestId: rid, error: mapErrorHelper(err) };
        }
      }
      return this.client.updateHistoryConsent({ requestId: rid, scope, consent });
    });
  }

  private async request<T>(operation: () => Promise<T>): Promise<T> {
    const revision = this.identityRevision;
    if (this.session && this.sessionSnapshot.status !== 'active') {
      return authRequiredResult() as T;
    }
    const result = await operation();
    const response = result as { ok?: boolean; error?: { messageKey?: string } };
    if (this.session && revision !== this.identityRevision) {
      return authRequiredResult(result) as T;
    }
    if (!response.ok && response.error?.messageKey === 'AUTH_REQUIRED' && this.session && this.sessionSnapshot.status === 'active') {
      ++this.identityRevision;
      this.updateSessionSnapshot({ status: 'lost', user: null, issue: 'session-recovery-required' });
    }
    return result;
  }
}

function authRequiredResult<T>(previous?: unknown): T {
  const result = previous && typeof previous === 'object'
    ? { ...(previous as Record<string, unknown>) }
    : {};
  delete (result as Record<string, unknown>).data;
  return { ...result, ok: false, error: { messageKey: 'AUTH_REQUIRED' } } as T;
}

function readManagerStatus(session: SessionApi): SessionStatus {
  const getStatus = (session as SessionApi & { getStatus?: () => SessionStatus }).getStatus;
  return typeof getStatus === 'function' ? getStatus.call(session) : 'empty';
}

/**
 * Factory helper to construct a LiveRoomRepository instance.
 */
export function createRoomRepository(config: RoomRepositoryConfig): LiveRoomRepository {
  return new LiveRoomRepository(config);
}
