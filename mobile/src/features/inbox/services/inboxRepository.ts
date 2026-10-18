import type { InboxItem, JoinRoomResponse, ReadResult, WriteResult } from '../../../data/api/contracts';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../shared/services/sessionApi';

export interface InboxPage {
  items: InboxItem[];
  nextCursor?: string;
  fetchedAt: string;
}

export interface InboxRepository {
  list(cursor?: string, knownEventIds?: ReadonlySet<string>): Promise<ReadResult<InboxPage>>;
  acceptFriend(invitationId: string): Promise<WriteResult<void>>;
  rejectFriend(invitationId: string): Promise<WriteResult<void>>;
  acceptRoom(invitationId: string, displayName: string): Promise<WriteResult<JoinRoomResponse>>;
  rejectRoom(invitationId: string): Promise<WriteResult<void>>;
}

const PAGE_SIZE = 50;

/** Server-owned inbox. Cursor values are inbox row IDs from the API, never event IDs. */
export function createInboxRepository(roomRepository: RoomRepository): InboxRepository {
  return {
    async list(cursor, knownEventIds = new Set()) {
      const result = await callSessionApi(roomRepository, client => client.listPartnerInbox(cursor));
      if (!result.ok) return result;
      const seen = new Set(knownEventIds);
      const items = result.data.filter(item => {
        if (seen.has(item.eventId)) return false;
        seen.add(item.eventId);
        return true;
      });
      const last = result.data[result.data.length - 1];
      return {
        ok: true,
        data: {
          items,
          nextCursor: result.data.length === PAGE_SIZE ? last?.id : undefined,
          fetchedAt: new Date().toISOString(),
        },
      };
    },
    acceptFriend: invitationId => callSessionApi(roomRepository, client => client.acceptPartner(invitationId, createDurableRequestId('partner_accept'))),
    rejectFriend: invitationId => callSessionApi(roomRepository, client => client.rejectPartner(invitationId, createDurableRequestId('partner_reject'))),
    acceptRoom: (invitationId, displayName) => callSessionApi(roomRepository, client => client.acceptRoomInvite({ invitationId, displayName, requestId: createDurableRequestId('room_invite_accept') })),
    rejectRoom: invitationId => callSessionApi(roomRepository, client => client.rejectRoomInvite(invitationId, createDurableRequestId('room_invite_reject'))),
  };
}
