import type {
  Friend,
  FriendInvitation,
  InvitePartnerRequest,
  ReadResult,
  SocialIdentity,
  WriteResult,
} from '../../../data/api/contracts';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../shared/services/sessionApi';

export interface SocialRepository {
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
    getIdentity: () => callSessionApi(roomRepository, client => client.getMySocialIdentity()),
    listFriends: () => callSessionApi(roomRepository, client => client.listFriends()),
    invite: request => callSessionApi(roomRepository, client => client.invitePartner({ ...request, requestId: request.requestId ?? createDurableRequestId('partner_invite') })),
    accept: invitationId => callSessionApi(roomRepository, client => client.acceptPartner(invitationId, createDurableRequestId('partner_accept'))),
    reject: invitationId => callSessionApi(roomRepository, client => client.rejectPartner(invitationId, createDurableRequestId('partner_reject'))),
    removeFriend: partnerId => callSessionApi(roomRepository, client => client.unfriend(partnerId, createDurableRequestId('unfriend'))),
  };
}
