import type {
  Friend,
  FriendInvitation,
  InvitePartnerRequest,
  ReadResult,
  SocialIdentity,
  WriteResult,
} from '../../../data/api/contracts';
import { ApiClientImpl } from '../../../data/api/client';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../rooms/services/sessionApi';

/** Who a friend code belongs to, read before inviting. `null` data = no such code. */
export type FriendCodeOwner = { displayName: string; friendCode: string; self: boolean; alreadyFriends: boolean };

export interface SocialRepository {
  /** Optional so older fakes keep working; the live repository always provides it. */
  lookupFriendCode?(code: string): Promise<ReadResult<FriendCodeOwner | null>>;
  getIdentity(): Promise<ReadResult<SocialIdentity>>;
  listFriends(): Promise<ReadResult<Friend[]>>;
  invite(request: InvitePartnerRequest): Promise<WriteResult<FriendInvitation>>;
  accept(invitationId: string): Promise<WriteResult<void>>;
  reject(invitationId: string): Promise<WriteResult<void>>;
  removeFriend(partnerId: string): Promise<WriteResult<void>>;
}

/** Delegates social writes to the session-aware repository, which owns auth and request IDs. */
export function createSocialRepository(roomRepository: RoomRepository): SocialRepository {
  return {
    async getIdentity() {
      const result = await callSessionApi(roomRepository, client => client.getMySocialIdentity());
      return result.ok && !isSocialIdentityProjection(result.data) ? malformedRead<SocialIdentity>() : result;
    },
    async listFriends() {
      const result = await callSessionApi(roomRepository, client => client.listFriends());
      return result.ok && (!Array.isArray(result.data) || !result.data.every(isFriendProjection)) ? malformedRead<Friend[]>() : result;
    },
    async invite(request) {
      const result = await callSessionApi(roomRepository, client => client.invitePartner({ ...request, requestId: request.requestId ?? createDurableRequestId('partner_invite') }));
      const requestId = 'requestId' in result ? result.requestId : undefined;
      return result.ok && !isFriendInvitationProjection(result.data) ? malformedWrite<FriendInvitation>(requestId) : result;
    },
    accept: invitationId => callSessionApi(roomRepository, client => client.acceptPartner(invitationId, createDurableRequestId('partner_accept'))),
    reject: invitationId => callSessionApi(roomRepository, client => client.rejectPartner(invitationId, createDurableRequestId('partner_reject'))),
    lookupFriendCode: code => callSessionApi(roomRepository, async client => {
      if (!(client instanceof ApiClientImpl)) return { ok: false as const, error: { messageKey: 'NOT_READY' as const } };
      const raw = await client.callRpc<unknown>('find_partner_by_code', { friend_code: code });
      return client.normalizeReadResponse<FriendCodeOwner | null>(raw, (value): value is FriendCodeOwner | null => value === null
        || (isRecord(value) && typeof value.displayName === 'string' && typeof value.friendCode === 'string' && typeof value.self === 'boolean' && typeof value.alreadyFriends === 'boolean'));
    }),
    removeFriend: partnerId => callSessionApi(roomRepository, client => client.unfriend(partnerId, createDurableRequestId('unfriend'))),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function isSocialIdentityProjection(value: unknown): value is SocialIdentity {
  return isRecord(value) && hasExactKeys(value, ['id', 'displayName', 'friendCode', 'avatarSeed'])
    && typeof value.id === 'string' && UUID.test(value.id)
    && typeof value.displayName === 'string' && value.displayName.trim().length > 0 && value.displayName.length <= 24
    && typeof value.friendCode === 'string' && /^[A-HJ-NP-Z2-9]{10}$/.test(value.friendCode)
    && typeof value.avatarSeed === 'string' && value.avatarSeed.length > 0 && value.avatarSeed.length <= 80;
}
function isFriendProjection(value: unknown): value is Friend {
  return isRecord(value) && hasExactKeys(value, ['id', 'friendUserId', 'displayName', 'friendCode', 'status', 'since'])
    && typeof value.id === 'string' && UUID.test(value.id)
    && typeof value.friendUserId === 'string' && UUID.test(value.friendUserId)
    && typeof value.displayName === 'string' && value.displayName.trim().length > 0 && value.displayName.length <= 24
    && typeof value.friendCode === 'string' && /^[A-HJ-NP-Z2-9]{10}$/.test(value.friendCode)
    && value.status === 'active' && isTimestamp(value.since);
}
function isFriendInvitationProjection(value: unknown): value is FriendInvitation {
  return isRecord(value) && hasExactKeys(value, ['id', 'inviterUserId', 'inviterName', 'inviteeUserId', 'status', 'createdAt', 'expiresAt'])
    && typeof value.id === 'string' && UUID.test(value.id)
    && typeof value.inviterUserId === 'string' && UUID.test(value.inviterUserId)
    && typeof value.inviteeUserId === 'string' && UUID.test(value.inviteeUserId)
    && typeof value.inviterName === 'string' && value.inviterName.trim().length > 0 && value.inviterName.length <= 24
    && ['pending', 'accepted', 'rejected', 'expired'].includes(String(value.status))
    && isTimestamp(value.createdAt) && isTimestamp(value.expiresAt);
}
function malformedRead<T>(): ReadResult<T> {
  return { ok: false as const, error: { messageKey: 'MALFORMED_RESPONSE' as const } };
}
function malformedWrite<T>(requestId?: string): WriteResult<T> {
  return { ok: false as const, requestId, error: { messageKey: 'MALFORMED_RESPONSE' as const } };
}
