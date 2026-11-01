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

export interface UpdateHistoryConsentRequest {
  scope: 'personal' | 'group';
  consent: boolean;
  requestId?: string;
}
