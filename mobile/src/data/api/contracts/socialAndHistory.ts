import type { PoolDish } from './discovery';

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

export interface CanonicalHistoryScoredResult {
  resultId: string;
  contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B' | 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
  policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1';
  status: 'DECIDED' | 'NO_CONSENSUS';
  round: 1 | 2;
  winner: PoolDish | null;
  reasonCode: 'UNANIMOUS_WANT' | 'ACCEPTABLE_FINAL' | 'EMPTY_INTERSECTION' | 'ALL_REMOVED';
  finalizedAt: string;
  scoreVersion: 'want2-ok1-round1-v1' | null;
  rankingVersion: 'score-desc-dense-rank-v1' | null;
  topDishes: { dish: PoolDish; score: number; rank: number; isWinner: boolean }[];
  round1BallotCount: number;
}

export interface CanonicalHistoryLegacyResult {
  capability: 'legacy-unscored-v1';
  status: 'DECIDED' | 'NO_CONSENSUS';
  winner: PoolDish | null;
  reasonCode?: string | null;
  finalizedAt: string;
}

export interface CanonicalHistoryItem {
  historyId: string;
  roomId: string;
  resultId: string;
  scope: 'personal' | 'group';
  createdAt: string;
  expiresAt: string;
  result: CanonicalHistoryScoredResult | CanonicalHistoryLegacyResult;
  desiredAt?: string | null;
  finalizedAt?: string;
  memberCount?: number;
  round1BallotCount?: number;
  participants?: { displayName: string; role: string }[];
}

export interface CanonicalHistoryPage { items: CanonicalHistoryItem[] }

export interface UpdateHistoryConsentRequest {
  scope: 'personal' | 'group';
  consent: boolean;
  requestId?: string;
}

/** The authenticated caller's account-level history choices. */
export interface HistoryConsent {
  personal: boolean;
  group: boolean;
}
