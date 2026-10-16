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
import type { SessionStatus } from '../../../data/auth/session';
import type { SessionApi } from '../../../data/auth/types';
import type { RoomEntryRepository } from './roomEntry';
import type { PreferenceCatalogue, RoomSetupRepository } from '../../context/services/roomSetup';

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
  getApiClient(): ApiClient;
  getSessionApi(): SessionApi | undefined;
}

export class LiveRoomRepository implements RoomRepository {
  private readonly client: ApiClient;
  private readonly session?: SessionApi;
  private readonly nextRequestId: RequestIdGenerator;
  private currentUser: SessionUser | null = null;

  constructor(config: RoomRepositoryConfig) {
    if (!config || !config.client) {
      throw new Error('ApiClient is required to construct LiveRoomRepository');
    }
    this.client = config.client;
    this.session = config.session;
    this.nextRequestId = config.requestIdGenerator ?? createDurableRequestId;
  }

  // --- Session & Identity ---

  async restoreSession(sessionToken?: string): Promise<ReadResult<SessionUser>> {
    let result: ReadResult<SessionUser>;
    if (this.session) {
      result = sessionToken !== undefined
        ? await this.session.restoreSession(sessionToken)
        : await (this.session as any).restoreSession();
    } else {
      result = await this.client.restoreSession(sessionToken ?? '');
    }
    if (result.ok) {
      this.currentUser = result.data;
    } else {
      this.currentUser = null;
    }
    return result;
  }

  async createGuestSession(displayName: string, requestId?: string): Promise<WriteResult<SessionResponse>> {
    const rid = requestId ?? this.nextRequestId('guest');
    const req: CreateGuestSessionRequest = { displayName: displayName.trim(), requestId: rid };
    let result: WriteResult<SessionResponse>;
    if (this.session) {
      result = await this.session.createGuestSession(req);
    } else {
      result = await this.client.createGuestSession(req);
    }
    if (result.ok) {
      this.currentUser = result.data.user;
    }
    return result;
  }

  async logout(): Promise<WriteResult<void>> {
    this.currentUser = null;
    if (this.session) {
      return this.session.logout();
    }
    return this.client.logout();
  }

  getCurrentUser(): SessionUser | null {
    return this.currentUser;
  }

  getSessionStatus(): SessionStatus {
    if (this.session && 'getStatus' in this.session && typeof (this.session as any).getStatus === 'function') {
      return (this.session as any).getStatus();
    }
    return this.currentUser ? 'active' : 'empty';
  }

  getApiClient(): ApiClient {
    return this.client;
  }

  getSessionApi(): SessionApi | undefined {
    return this.session;
  }


  // --- Room Entry (GM-09 / Home / Create / Join) ---

  async listFriends(): Promise<ReadResult<Friend[]>> {
    return this.client.listFriends();
  }

  async getDiscoveryContext(): Promise<ReadResult<DiscoveryContextResponse>> {
    return this.client.getDiscoveryContext();
  }

  async createRoom(request: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>> {
    const rid = request.requestId || this.nextRequestId('room_create');
    if (this.getSessionStatus() !== 'active') {
      const guestRes = await this.createGuestSession(request.displayName);
      if (!guestRes.ok) {
        return guestRes;
      }
    }
    return this.client.createRoom({ ...request, requestId: rid });
  }

  async joinRoom(request: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    const rid = request.requestId || this.nextRequestId('room_join');
    if (this.getSessionStatus() !== 'active') {
      const guestRes = await this.createGuestSession(request.displayName);
      if (!guestRes.ok) {
        return guestRes;
      }
    }
    return this.client.joinRoom({ ...request, requestId: rid });
  }

  async getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    return this.client.getRoomSnapshot(roomId);
  }

  // --- Room Setup (GM-10 / Context / Preferences) ---

  async previewFoodPool(request: PreviewFoodPoolRequest): Promise<ReadResult<PreviewFoodPoolResponse>> {
    return this.client.previewFoodPool(request);
  }

  async updateContext(request: UpdateContextRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('ctx_upd');
    return this.client.updateContext({ ...request, requestId: rid });
  }

  async updatePreferences(request: UpdatePreferencesRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('pref_upd');
    return this.client.updatePreferences({ ...request, requestId: rid });
  }

  // --- Lobby Actions (GM-11 / Ready / Start / Leave / Cancel) ---

  async setReady(request: SetReadyRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('ready');
    return this.client.setReady({ ...request, requestId: rid });
  }

  async startRound(request: StartRoundRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('start');
    return this.client.startRound({ ...request, requestId: rid });
  }

  async leaveRoom(request: LeaveRoomRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('leave');
    return this.client.leaveRoom({ ...request, requestId: rid });
  }

  async cancelRoom(request: CancelRoomRequest): Promise<WriteResult<void>> {
    const rid = request.requestId || this.nextRequestId('cancel');
    return this.client.cancelRoom({ ...request, requestId: rid });
  }

  async inviteToRoom(request: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>> {
    const rid = request.requestId || this.nextRequestId('invite');
    return this.client.inviteToRoom({ ...request, requestId: rid });
  }
}

/**
 * Factory helper to construct a LiveRoomRepository instance.
 */
export function createRoomRepository(config: RoomRepositoryConfig): LiveRoomRepository {
  return new LiveRoomRepository(config);
}
