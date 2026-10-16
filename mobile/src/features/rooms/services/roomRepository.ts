/**
 * GM-25 — Live Room Repository implementation.
 * Connects Home, context, preferences, and lobby to the real API client and auth session.
 * Spec: docs/architecture/API_CONTRACT.md
 * Task: GM-25 (Issue #86)
 */

import type {
  ApiClient,
  CreateGuestSessionRequest,
  CreateRoomRequest,
  CreateRoomResponse,
  DiscoveryContextResponse,
  Friend,
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
  WriteResult,
} from '../../../data/api/contracts';
import type { SessionApi, SessionStorage } from '../../../data/auth/types';
import type { RoomEntryRepository } from './roomEntry';
import type { PreferenceCatalogue, RoomSetupRepository } from '../../context/services/roomSetup';
import type { SessionSnapshot, SessionStatus } from './sessionState';

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

  // Lobby RPC operations
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

  // --- Session & Identity ---

  async restoreSession(sessionToken?: string): Promise<ReadResult<SessionUser>> {
    const revision = ++this.identityRevision;
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
      const restore = this.session.restoreSession as (token?: string) => Promise<ReadResult<SessionUser>>;
      result = await restore.call(this.session, sessionToken);
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
      const next = noSavedSession
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

  async joinRoom(request: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    const rid = request.requestId || this.nextRequestId('room_join');
    if (this.getSessionStatus() !== 'active') {
      return { ok: false, requestId: rid, error: { messageKey: 'AUTH_REQUIRED' } };
    }
    return this.request(() => this.client.joinRoom({ ...request, requestId: rid }));
  }

  async getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    return this.request(() => this.client.getRoomSnapshot(roomId));
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
    return this.request(() => this.client.updatePreferences({ ...request, requestId: rid }));
  }

  // --- Lobby Actions (GM-11 / Ready / Start / Leave / Cancel) ---

  async setReady(request: SetReadyRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('ready');
    return this.request(() => this.client.setReady({ ...request, requestId: rid }));
  }

  async startRound(request: StartRoundRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('start');
    return this.request(() => this.client.startRound({ ...request, requestId: rid }));
  }

  async leaveRoom(request: LeaveRoomRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('leave');
    return this.request(() => this.client.leaveRoom({ ...request, requestId: rid }));
  }

  async cancelRoom(request: CancelRoomRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('cancel');
    return this.request(() => this.client.cancelRoom({ ...request, requestId: rid }));
  }

  async inviteToRoom(request: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>> {
    const rid = request.requestId || this.nextRequestId('invite');
    return this.request(() => this.client.inviteToRoom({ ...request, requestId: rid }));
  }

  private async request<T>(operation: () => Promise<T>): Promise<T> {
    const result = await operation();
    const response = result as { ok?: boolean; error?: { messageKey?: string } };
    if (!response.ok && response.error?.messageKey === 'AUTH_REQUIRED' && this.session && readManagerStatus(this.session) === 'lost') {
      ++this.identityRevision;
      this.updateSessionSnapshot({ status: 'lost', user: null, issue: 'session-revoked' });
    }
    return result;
  }
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
