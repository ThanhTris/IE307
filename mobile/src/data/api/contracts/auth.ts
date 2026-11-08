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
