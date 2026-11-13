import type {
  FlavorProfile,
  MealSlot,
  PoolDish,
  ServiceMode,
  TimeHint,
} from './discovery';
import type { BallotVoteValue, RoomResult, SubmissionReceipt } from './voting';

export type RoomState =
  | 'LOBBY'
  | 'ROUND_1'
  | 'WAITING_1'
  | 'ROUND_2'
  | 'WAITING_2'
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

/** Host removes a member while the room is still in the lobby. */
export interface RemoveRoomMemberRequest {
  roomId: string;
  memberUserId: string;
  expectedVersion: number;
  requestId?: string;
}

export interface CancelRoomRequest {
  roomId: string;
  expectedVersion: number;
  confirmCancel: boolean;
  requestId?: string;
}

export interface RoomSnapshot {
  roomId: string;
  code: string;
  state: RoomState;
  version: number;
  hostUserId: string;
  context?: RoomContext;
  settings?: { dishCount?: number; mealSlot?: MealSlot; desiredAt?: string | null };
  dishCount?: number;
  submittedCount?: number;
  memberCount?: number;
  ownBallot?: unknown;
  ownWaiting?: boolean;
  waitingStartedAt?: string | null;
  deadline?: string | null;
  canEndWaiting?: boolean;
  removalCap?: number | null;
  serverTime?: string;
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
