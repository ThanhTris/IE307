/**
 * GM-07 — API contracts, DTO interfaces, error envelopes, and client specifications.
 * Spec: docs/architecture/API_CONTRACT.md
 * Database parity: supabase/migrations/0001_core_schema.sql
 * Dictionary parity: docs/data/FOOD_DATA_DICTIONARY.md
 * Contract version: food-v1/roadmap-v2/GM-07.1
 * GM-15 supplement: decision-v2 result vocabulary (selection 1.0.0), pending review.
 */

// ============================================================================
// 1. Error Codes & Envelopes
// ============================================================================

export type ErrorCode =
  // Auth & Permissions
  | 'AUTH_REQUIRED'
  | 'NOT_MEMBER'
  | 'NOT_HOST'
  | 'NOT_READY'
  | 'NOT_PARTNER'
  | 'NOT_RECIPIENT'
  | 'CONSENT_REQUIRED'
  // Validation & Input
  | 'INVALID_INPUT'
  | 'INVALID_DISH'
  | 'INCOMPLETE_BALLOT'
  // Room Lifecycle & State
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_LOCKED'
  | 'ROOM_EXPIRED'
  | 'ROOM_TERMINAL'
  | 'INVALID_ROOM_STATE'
  | 'CONTEXT_CHANGED'
  // Voting & Submission
  | 'ALREADY_SUBMITTED'
  | 'VERSION_CONFLICT'
  | 'REQUEST_ID_REUSED'
  // Eligibility & Coverage
  | 'OUT_OF_COVERAGE'
  | 'NO_ELIGIBLE_FOOD'
  | 'AVAILABILITY_UNKNOWN'
  | 'DESIRED_TIME_PASSED'
  // Social & Invitations
  | 'INVITE_EXPIRED'
  | 'INVITE_REJECTED'
  | 'INVITE_CANCELLED'
  // Rate limit & Infra
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN_ERROR';

export interface ApiError {
  messageKey: ErrorCode;
  message?: string;
  details?: Record<string, unknown>;
}

export type ReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type WriteResult<T = void> =
  | { ok: true; requestId?: string; roomId?: string; version?: number; state?: RoomState | string; data: T }
  | { ok: false; requestId?: string; roomId?: string; error: ApiError };

// ============================================================================
// 2. Auth & Session DTOs (GM-16)
// ============================================================================

export interface SessionUser {
  id: string;
  displayName: string;
  isGuest: boolean;
  avatarSeed?: string;
  createdAt: string;
}

export interface SessionResponse {
  token: string;
  user: SessionUser;
  expiresAt: string;
}

export interface SocialIdentity {
  id: string;
  displayName: string;
  friendCode: string;
  avatarSeed: string;
}

export interface CreateGuestSessionRequest {
  displayName: string;
  requestId?: string;
}

// ============================================================================
// 3. Discovery, Coverage & Catalogue DTOs (GM-04, GM-18)
// ============================================================================

export interface PublicAnchor {
  id: string;
  coverageId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface CoverageArea {
  id: string;
  name: string;
  adminAreaId: string;
}

export interface DiscoveryContextResponse {
  anchors: PublicAnchor[];
  coverageAreas: CoverageArea[];
  serverTime: string;
}

export interface DishArtwork {
  url: string;
  usageRights: 'unknown' | 'granted' | 'licensed' | 'public_domain' | 'denied';
  license: string | null;
  attribution: string | null;
}

export interface FlavorItem {
  present: boolean | null;
  intensity: 'none' | 'low' | 'medium' | 'high' | 'unknown';
}

export interface FlavorProfile {
  spicy: FlavorItem;
  salty: FlavorItem;
  sweet: FlavorItem;
  sour: FlavorItem;
}

export type ServiceMode = 'dine_in' | 'takeaway' | 'delivery';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type TimeHint = 'late_night';

export type CurrencyCode = 'VND' | 'USD' | 'THB' | 'KRW' | 'JPY' | 'CNY' | 'EUR' | 'other';
export type PriceUnit = 'portion' | 'item' | 'person' | 'group' | 'kg' | 'menu_item_unspecified';

export interface DishPrice {
  priceMin: number | null;
  priceMax: number | null;
  currency: CurrencyCode | null;
  unit: PriceUnit | null;
  servingSize: string | null;
  sourceRef?: string | null;
  pricingStrategy?: string | null;
}

export interface PoolDish {
  roundDishId: string;
  choiceId: string;
  dishId: string;
  name: string;
  description?: string | null;
  cuisineIds: string[];
  categoryIds: string[];
  origin?: 'north' | 'central' | 'south' | 'unknown' | 'not_applicable';
  temperature?: 'hot' | 'warm' | 'cold' | 'ambient' | 'unknown' | null;
  flavor?: FlavorProfile | null;
  artwork?: DishArtwork | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: CurrencyCode | null;
  unit?: PriceUnit | null;
  servingSize?: string | null;
  price?: DishPrice | null;
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  distanceM?: number;
}

export interface PreviewFoodPoolRequest {
  anchorId: string;
  radiusM: number;
  desiredAt: string;
  serviceMode: ServiceMode;
  mealSlot: MealSlot;
  timeHint?: TimeHint;
  cuisineIds?: string[];
  categoryIds?: string[];
  budget?: number | null;
}

export interface PreviewFoodPoolResponse {
  pool: PoolDish[];
  datasetVersion: string;
  eligibilityVersion: string;
  evaluatedAt: string;
  totalCandidateCount: number;
}

// ============================================================================
// 4. Room Lifecycle DTOs (GM-19)
// ============================================================================

export type RoomState =
  | 'LOBBY'
  | 'ROUND_1'
  | 'ROUND_2'
  | 'DECIDED'
  | 'NO_CONSENSUS'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FINALIZED'
  | 'VOTING'
  | 'COMPLETED';

export interface RoomContext {
  anchorId: string;
  anchorName?: string;
  radiusM: number;
  desiredAt: string;
  serviceMode: ServiceMode;
  mealSlot: MealSlot;
  timeHint?: TimeHint;
  budget?: number | null;
  avoidRecent: boolean;
}

export interface RoomMember {
  userId: string;
  displayName: string;
  isHost: boolean;
  ready: boolean;
  joinedAt: string;
  hasSubmitted?: boolean;
}

export interface UserPreferences {
  cuisineIds: string[];
  categoryIds: string[];
  temperature?: 'hot' | 'warm' | 'cold' | 'ambient' | 'unknown';
  flavor?: FlavorProfile;
  historyConsent: boolean;
}

export interface CreateRoomRequest {
  displayName: string;
  context: RoomContext;
  requestId?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  code: string;
  version: number;
  expiresAt: string;
}

export interface JoinRoomRequest {
  code: string;
  displayName: string;
  requestId?: string;
}

export interface JoinRoomResponse {
  roomId: string;
  code: string;
  version: number;
  memberId: string;
}

export interface UpdatePreferencesRequest {
  roomId: string;
  expectedVersion: number;
  preferences: UserPreferences;
  requestId?: string;
}

export interface UpdateContextRequest {
  roomId: string;
  expectedVersion: number;
  context: RoomContext;
  requestId?: string;
}

export interface SetReadyRequest {
  roomId: string;
  expectedVersion: number;
  ready: boolean;
  requestId?: string;
}

export interface StartRoundRequest {
  roomId: string;
  expectedVersion: number;
  requestId?: string;
}

export interface LeaveRoomRequest {
  roomId: string;
  expectedVersion: number;
  requestId?: string;
}

export interface CancelRoomRequest {
  roomId: string;
  expectedVersion: number;
  confirmCancel: boolean;
  requestId?: string;
}

// ============================================================================
// 5. Voting, Submission & Results DTOs (GM-15, GM-20)
// ============================================================================

export type BallotVoteValue = 'WANT' | 'OK' | 'NO' | 'KEEP' | 'REMOVE';

export interface BallotVoteItem {
  roundDishId: string;
  vote: BallotVoteValue;
}

export interface SubmitBallotRequest {
  roomId: string;
  round: 1 | 2;
  poolVersion: number;
  intentId: string;
  expectedVersion: number;
  votes: BallotVoteItem[];
  requestId?: string;
}

export interface SubmissionReceipt {
  round: 1 | 2;
  intentId: string;
  requestId: string;
  submittedAt: string;
  voteCount: number;
  votesSummary?: Array<{ roundDishId: string; vote: BallotVoteValue }>;
}

export interface SubmitBallotResponse {
  accepted: boolean;
  round: 1 | 2;
  allMembersSubmitted: boolean;
  roomVersion: number;
  requestId?: string;
  receipt?: SubmissionReceipt;
}

export type DecisionReasonCode = 'UNANIMOUS_WANT' | 'ACCEPTABLE_FINAL'
  | 'EMPTY_INTERSECTION' | 'ALL_REMOVED';
export type DecisionMatchTier = 'PERFECT' | 'CONSENSUS' | 'COMPROMISE' | 'NO_CONSENSUS';

export interface RoomResult {
  resultId: string;
  roomId: string;
  round: 1 | 2;
  winnerRoundDishId: string | null;
  winnerDish: PoolDish | null;
  reasonCode: DecisionReasonCode;
  matchTier: DecisionMatchTier;
  finalizedAt: string;
  policyVersion: 'decision-v2';
}

export interface RoomSnapshot {
  roomId: string;
  code: string;
  state: RoomState;
  version: number;
  hostUserId: string;
  context: RoomContext;
  members: RoomMember[];
  ownPreferences?: UserPreferences;
  round: 1 | 2;
  poolVersion: number;
  pool: PoolDish[];
  ownVotes?: Record<string, BallotVoteValue>;
  ownSubmission?: SubmissionReceipt | null;
  datasetVersion?: string | null;
  eligibilityVersion?: string | null;
  evaluatedAt?: string | null;
  result?: RoomResult | null;
  expiresAt: string;
}

// ============================================================================
// 6. Social, Friends & Invitations DTOs (GM-22)
// ============================================================================

export interface Friend {
  id: string;
  friendUserId: string;
  displayName: string;
  friendCode: string;
  status: 'active';
  since: string;
}

export interface FriendInvitation {
  id: string;
  inviterUserId: string;
  inviterName: string;
  inviteeUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface RoomInvitation {
  id: string;
  roomId: string;
  roomCode: string;
  inviterUserId: string;
  inviterName: string;
  inviteeUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface InvitePartnerRequest {
  friendCode?: string;
  partnerId?: string;
  requestId?: string;
}

export interface InviteToRoomRequest {
  roomId: string;
  partnerId: string;
  expectedVersion: number;
  requestId?: string;
}

export interface AcceptRoomInviteRequest {
  invitationId: string;
  displayName: string;
  requestId?: string;
}

// ============================================================================
// 7. Inbox, Push Device & History DTOs (GM-21, GM-23)
// ============================================================================

export interface InboxItem {
  id: string;
  eventId: string;
  type: 'friend_invite' | 'room_invite' | 'room_result';
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type PushPermissionStatus = 'granted' | 'denied' | 'provisional' | 'unknown';
export type StoragePushPermission = 'granted' | 'denied' | 'unknown';

export function toStoragePermission(permission: PushPermissionStatus): StoragePushPermission {
  if (permission === 'granted') return 'granted';
  if (permission === 'denied') return 'denied';
  return 'unknown';
}

export interface RegisterPushDeviceRequest {
  deviceId: string;
  token: string;
  permission: PushPermissionStatus;
  requestId?: string;
}

export interface HistoryItem {
  id: string;
  roomId: string;
  roomCode: string;
  mealDate: string;
  winnerName?: string;
  winnerArtworkUrl?: string | null;
  memberCount: number;
  scope: 'personal' | 'group';
}

export interface UpdateHistoryConsentRequest {
  scope: 'personal' | 'group';
  consent: boolean;
  requestId?: string;
}

// ============================================================================
// 8. ApiClient Interface Definition
// ============================================================================

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
  updateHistoryConsent(req: UpdateHistoryConsentRequest): Promise<WriteResult<void>>;
  deleteHistory(historyId: string, requestId?: string): Promise<WriteResult<void>>;
}
