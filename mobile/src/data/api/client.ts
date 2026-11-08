/**
 * GM-07 — Supabase RPC client implementation with transport injection,
 * timeout handling, error mapping, and privacy-preserving error logging.
 * Spec: docs/architecture/API_CONTRACT.md
 * Database parity: supabase/migrations/0001_core_schema.sql
 */

import {
  ApiClient,
  ApiError,
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
  SocialIdentity,
  InvitePartnerRequest,
  FriendInvitation,
  InviteToRoomRequest,
  RoomInvitation,
  AcceptRoomInviteRequest,
  InboxItem,
  RegisterPushDeviceRequest,
  HistoryConsent,
  HistoryItem,
  UpdateHistoryConsentRequest,
  RoomState,
} from './contracts';
import type { ResponseGuard } from './responseGuards';
import type { SessionApi } from '../auth/types';
import {
  TransportOptions,
  ApiTransport,
  ClientConfig,
  FetchTransport,
} from './client/transport';
import {
  RpcCallerContext,
  generateRequestIdHelper,
  mapErrorHelper,
  normalizeWriteResponseHelper,
  normalizeReadResponseHelper,
} from './client/helpers';
import {
  createGuestSessionMethod,
  restoreSessionMethod,
  logoutMethod,
  getDiscoveryContextMethod,
  previewFoodPoolMethod,
} from './client/authAndDiscoveryMethods';
import {
  createRoomMethod,
  joinRoomMethod,
  getRoomSnapshotMethod,
  updatePreferencesMethod,
  updateContextMethod,
  setReadyMethod,
  startRoundMethod,
  leaveRoomMethod,
  cancelRoomMethod,
  submitBallotMethod,
  getResultOfferingsMethod,
} from './client/roomAndVotingMethods';
import {
  getMySocialIdentityMethod,
  listFriendsMethod,
  invitePartnerMethod,
  acceptPartnerMethod,
  rejectPartnerMethod,
  unfriendMethod,
  inviteToRoomMethod,
  acceptRoomInviteMethod,
  rejectRoomInviteMethod,
  listPartnerInboxMethod,
  markAllPartnerInboxReadMethod,
  registerPushDeviceMethod,
  unregisterPushDeviceMethod,
  getHistoryMethod,
  getHistoryConsentMethod,
  updateHistoryConsentMethod,
  deleteHistoryMethod,
} from './client/socialAndHistoryMethods';

export type { TransportOptions, ApiTransport, ClientConfig };
export { FetchTransport };

export class ApiClientImpl implements ApiClient {
  private readonly authSession?: SessionApi;
  private transport: ApiTransport;
  private token: string | null = null;
  private defaultTimeoutMs: number;

  constructor(config?: ClientConfig) {
    this.authSession = config?.authSession;
    if (config?.transport) {
      this.transport = config.transport;
    } else {
      const defaultUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL)
        ? process.env.EXPO_PUBLIC_SUPABASE_URL
        : 'http://127.0.0.1:54321';
      const baseUrl = config?.baseUrl ?? defaultUrl;
      this.transport = new FetchTransport(baseUrl, config?.fetchFn, config?.publicKey);
    }
    this.defaultTimeoutMs = config?.defaultTimeoutMs ?? config?.timeoutMs ?? 15000;
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
    return generateRequestIdHelper();
  }

  private mapError(err: unknown): ApiError {
    return mapErrorHelper(err);
  }

  normalizeWriteResponse<T>(
    raw: unknown,
    fallbackRequestId: string,
    guard: ResponseGuard<T>,
    roomId?: string
  ):
    | { ok: true; data: T; requestId: string; roomId?: string; version?: number; state?: RoomState | string }
    | { ok: false; requestId: string; roomId?: string; error: ApiError } {
    return normalizeWriteResponseHelper(raw, fallbackRequestId, guard, roomId);
  }

  normalizeReadResponse<T>(raw: unknown, guard: ResponseGuard<T>): ReadResult<T> {
    return normalizeReadResponseHelper(raw, guard);
  }

  normalizeRpcResponse<T>(raw: unknown, fallbackRequestId: string, guard: ResponseGuard<T>, roomId?: string) {
    return this.normalizeWriteResponse<T>(raw, fallbackRequestId, guard, roomId);
  }

  async callRpc<T>(rpcName: string, params: Record<string, unknown>): Promise<T> {
    const generation = this.authSession?.getGeneration();
    let token = this.token ?? undefined;
    if (this.authSession) {
      const result = await this.authSession.getAccessToken();
      if (!result.ok) throw { body: result.error };
      token = result.data;
      if (generation !== this.authSession.getGeneration()) throw { body: { messageKey: 'AUTH_REQUIRED' } };
    }
    const response = await this.transport.invoke<T>(rpcName, params, {
      token,
      timeoutMs: this.defaultTimeoutMs,
    });
    if (this.authSession && generation !== this.authSession.getGeneration()) {
      throw { body: { messageKey: 'AUTH_REQUIRED' } };
    }
    return response;
  }

  private get ctx(): RpcCallerContext & {
    authSession?: SessionApi;
    transport: ApiTransport;
    setAuthToken(token: string | null): void;
  } {
    return {
      authSession: this.authSession,
      transport: this.transport,
      setAuthToken: (token) => this.setAuthToken(token),
      generateRequestId: () => this.generateRequestId(),
      mapError: (err) => this.mapError(err),
      callRpc: (rpcName, params) => this.callRpc(rpcName, params),
      normalizeWriteResponse: (raw, fallbackRequestId, guard, roomId) =>
        this.normalizeWriteResponse(raw, fallbackRequestId, guard, roomId),
      normalizeReadResponse: (raw, guard) => this.normalizeReadResponse(raw, guard),
    };
  }

  createGuestSession(req: CreateGuestSessionRequest): Promise<WriteResult<SessionResponse>> {
    return createGuestSessionMethod(this.ctx, req);
  }

  restoreSession(token: string): Promise<ReadResult<SessionUser>> {
    return restoreSessionMethod(this.ctx, token);
  }

  logout(customRequestId?: string): Promise<WriteResult<void>> {
    return logoutMethod(this.ctx, customRequestId);
  }

  getDiscoveryContext(areaId?: string, anchorId?: string): Promise<ReadResult<DiscoveryContextResponse>> {
    return getDiscoveryContextMethod(this.ctx, areaId, anchorId);
  }

  previewFoodPool(req: PreviewFoodPoolRequest): Promise<ReadResult<PreviewFoodPoolResponse>> {
    return previewFoodPoolMethod(this.ctx, req);
  }

  createRoom(req: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>> {
    return createRoomMethod(this.ctx, req);
  }

  joinRoom(req: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>> {
    return joinRoomMethod(this.ctx, req);
  }

  getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    return getRoomSnapshotMethod(this.ctx, roomId);
  }

  updatePreferences(req: UpdatePreferencesRequest): Promise<WriteResult<void>> {
    return updatePreferencesMethod(this.ctx, req);
  }

  updateContext(req: UpdateContextRequest): Promise<WriteResult<void>> {
    return updateContextMethod(this.ctx, req);
  }

  setReady(req: SetReadyRequest): Promise<WriteResult<void>> {
    return setReadyMethod(this.ctx, req);
  }

  startRound(req: StartRoundRequest): Promise<WriteResult<void>> {
    return startRoundMethod(this.ctx, req);
  }

  leaveRoom(req: LeaveRoomRequest): Promise<WriteResult<void>> {
    return leaveRoomMethod(this.ctx, req);
  }

  cancelRoom(req: CancelRoomRequest): Promise<WriteResult<void>> {
    return cancelRoomMethod(this.ctx, req);
  }

  submitBallot(req: SubmitBallotRequest): Promise<WriteResult<SubmitBallotResponse>> {
    return submitBallotMethod(this.ctx, req);
  }

  getResultOfferings(roomId: string, resultId: string): Promise<ReadResult<PoolDish[]>> {
    return getResultOfferingsMethod(this.ctx, roomId, resultId);
  }

  getMySocialIdentity(): Promise<ReadResult<SocialIdentity>> {
    return getMySocialIdentityMethod(this.ctx);
  }

  listFriends(): Promise<ReadResult<Friend[]>> {
    return listFriendsMethod(this.ctx);
  }

  invitePartner(req: InvitePartnerRequest): Promise<WriteResult<FriendInvitation>> {
    return invitePartnerMethod(this.ctx, req);
  }

  acceptPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return acceptPartnerMethod(this.ctx, invitationId, customRequestId);
  }

  rejectPartner(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return rejectPartnerMethod(this.ctx, invitationId, customRequestId);
  }

  unfriend(partnerId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return unfriendMethod(this.ctx, partnerId, customRequestId);
  }

  inviteToRoom(req: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>> {
    return inviteToRoomMethod(this.ctx, req);
  }

  acceptRoomInvite(req: AcceptRoomInviteRequest): Promise<WriteResult<JoinRoomResponse>> {
    return acceptRoomInviteMethod(this.ctx, req);
  }

  rejectRoomInvite(invitationId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return rejectRoomInviteMethod(this.ctx, invitationId, customRequestId);
  }

  listPartnerInbox(cursor?: string): Promise<ReadResult<InboxItem[]>> {
    return listPartnerInboxMethod(this.ctx, cursor);
  }

  markAllPartnerInboxRead(requestId?: string): Promise<WriteResult<void>> {
    return markAllPartnerInboxReadMethod(this.ctx, requestId);
  }

  registerPushDevice(req: RegisterPushDeviceRequest): Promise<WriteResult<void>> {
    return registerPushDeviceMethod(this.ctx, req);
  }

  unregisterPushDevice(deviceId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return unregisterPushDeviceMethod(this.ctx, deviceId, customRequestId);
  }

  getHistory(scope: 'personal' | 'group', cursor?: string): Promise<ReadResult<HistoryItem[]>> {
    return getHistoryMethod(this.ctx, scope, cursor);
  }

  getHistoryConsent(): Promise<ReadResult<HistoryConsent>> {
    return getHistoryConsentMethod(this.ctx);
  }

  updateHistoryConsent(req: UpdateHistoryConsentRequest): Promise<WriteResult<void>> {
    return updateHistoryConsentMethod(this.ctx, req);
  }

  deleteHistory(historyId: string, customRequestId?: string): Promise<WriteResult<void>> {
    return deleteHistoryMethod(this.ctx, historyId, customRequestId);
  }
}
