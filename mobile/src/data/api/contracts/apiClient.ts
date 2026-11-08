import type {
  CreateGuestSessionRequest,
  SessionResponse,
  SessionUser,
  SocialIdentity,
} from './auth';
import type { ReadResult, WriteResult } from './common';
import type {
  DiscoveryContextResponse,
  PoolDish,
  PreviewFoodPoolRequest,
  PreviewFoodPoolResponse,
} from './discovery';
import type {
  CancelRoomRequest,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  LeaveRoomRequest,
  RoomSnapshot,
  SetReadyRequest,
  StartRoundRequest,
  UpdateContextRequest,
  UpdatePreferencesRequest,
} from './rooms';
import type {
  AcceptRoomInviteRequest,
  Friend,
  FriendInvitation,
  HistoryItem,
  HistoryConsent,
  InboxItem,
  InvitePartnerRequest,
  InviteToRoomRequest,
  RegisterPushDeviceRequest,
  RoomInvitation,
  UpdateHistoryConsentRequest,
} from './socialAndHistory';
import type { SubmitBallotRequest, SubmitBallotResponse } from './voting';

export interface ApiClient {
  // Auth
  createGuestSession(req: CreateGuestSessionRequest): Promise<WriteResult<SessionResponse>>;
  restoreSession(token: string): Promise<ReadResult<SessionUser>>;
  logout(requestId?: string): Promise<WriteResult<void>>;

  // Discovery
  getDiscoveryContext(areaId?: string, anchorId?: string): Promise<ReadResult<DiscoveryContextResponse>>;
  previewFoodPool(req: PreviewFoodPoolRequest): Promise<ReadResult<PreviewFoodPoolResponse>>;

  // Room
  createRoom(req: CreateRoomRequest): Promise<WriteResult<CreateRoomResponse>>;
  joinRoom(req: JoinRoomRequest): Promise<WriteResult<JoinRoomResponse>>;
  getRoomSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>>;
  updatePreferences(req: UpdatePreferencesRequest): Promise<WriteResult<void>>;
  updateContext(req: UpdateContextRequest): Promise<WriteResult<void>>;
  setReady(req: SetReadyRequest): Promise<WriteResult<void>>;
  startRound(req: StartRoundRequest): Promise<WriteResult<void>>;
  leaveRoom(req: LeaveRoomRequest): Promise<WriteResult<void>>;
  cancelRoom(req: CancelRoomRequest): Promise<WriteResult<void>>;

  // Voting
  submitBallot(req: SubmitBallotRequest): Promise<WriteResult<SubmitBallotResponse>>;
  getResultOfferings(roomId: string, resultId: string): Promise<ReadResult<PoolDish[]>>;

  // Social
  getMySocialIdentity(): Promise<ReadResult<SocialIdentity>>;
  listFriends(): Promise<ReadResult<Friend[]>>;
  invitePartner(req: InvitePartnerRequest): Promise<WriteResult<FriendInvitation>>;
  acceptPartner(invitationId: string, requestId?: string): Promise<WriteResult<void>>;
  rejectPartner(invitationId: string, requestId?: string): Promise<WriteResult<void>>;
  unfriend(partnerId: string, requestId?: string): Promise<WriteResult<void>>;
  inviteToRoom(req: InviteToRoomRequest): Promise<WriteResult<RoomInvitation>>;
  acceptRoomInvite(req: AcceptRoomInviteRequest): Promise<WriteResult<JoinRoomResponse>>;
  rejectRoomInvite(invitationId: string, requestId?: string): Promise<WriteResult<void>>;

  // Inbox & Devices
  listPartnerInbox(cursor?: string): Promise<ReadResult<InboxItem[]>>;
  registerPushDevice(req: RegisterPushDeviceRequest): Promise<WriteResult<void>>;
  unregisterPushDevice(deviceId: string, requestId?: string): Promise<WriteResult<void>>;

  // History
  getHistory(scope: 'personal' | 'group', cursor?: string): Promise<ReadResult<HistoryItem[]>>;
  getHistoryConsent(): Promise<ReadResult<HistoryConsent>>;
  updateHistoryConsent(req: UpdateHistoryConsentRequest): Promise<WriteResult<void>>;
  deleteHistory(historyId: string, requestId?: string): Promise<WriteResult<void>>;

  // Low-level RPC dispatch
  callRpc?<T>(rpcName: string, params: Record<string, unknown>): Promise<T>;
}
