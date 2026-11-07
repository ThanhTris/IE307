import type { InboxItem, JoinRoomResponse, ReadResult, WriteResult } from '../../../data/api/contracts';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../shared/services/sessionApi';

export interface InboxPage {
  items: InboxItem[];
  nextCursor?: string;
  fetchedAt: string;
}
export type RoomDestination = 'lobby' | 'vote' | 'final-round' | 'result' | 'no-consensus';
export interface ResolvedRoom { roomId: string; destination: RoomDestination; resultId?: string }
export interface InboxRepository {
  list(cursor?: string, knownEventIds?: ReadonlySet<string>): Promise<ReadResult<InboxPage>>;
  acceptFriend(invitationId: string): Promise<WriteResult<void>>;
  rejectFriend(invitationId: string): Promise<WriteResult<void>>;
  acceptRoom(invitationId: string, displayName: string): Promise<WriteResult<JoinRoomResponse>>;
  rejectRoom(invitationId: string): Promise<WriteResult<void>>;
  resolveAcceptedRoom(roomId: string): Promise<ReadResult<ResolvedRoom>>;
  resolveRoomResult(roomId: string, resultId: string): Promise<ReadResult<ResolvedRoom>>;
}

const PAGE_SIZE = 50;

/** Server-owned inbox. Cursor values are inbox row IDs from the API, never event IDs. */
export function createInboxRepository(roomRepository: RoomRepository): InboxRepository {
  const resolveRoom = async (roomId: string, expectedResultId?: string): Promise<ReadResult<ResolvedRoom>> => {
    if (!roomId.trim()) return { ok: false, error: { messageKey: 'INVALID_INPUT' } };
    const response = await callSessionApi(roomRepository, client => client.getRoomSnapshot(roomId));
    if (!response.ok) return response;
    const snapshot = response.data;
    const raw = snapshot as unknown as Record<string, unknown>;
    const state = raw.state;
    if (state === 'LOBBY') return expectedResultId
      ? { ok: false, error: { messageKey: 'VERSION_CONFLICT' } }
      : { ok: true, data: { roomId: snapshot.roomId, destination: 'lobby' } };
    if (state === 'ROUND_1' || state === 'WAITING_1') return expectedResultId
      ? { ok: false, error: { messageKey: 'VERSION_CONFLICT' } }
      : { ok: true, data: { roomId: snapshot.roomId, destination: 'vote' } };
    if (state === 'ROUND_2' || state === 'WAITING_2') return expectedResultId
      ? { ok: false, error: { messageKey: 'VERSION_CONFLICT' } }
      : { ok: true, data: { roomId: snapshot.roomId, destination: 'final-round' } };
    if (state === 'DECIDED' || state === 'NO_CONSENSUS') {
      const result = raw.result;
      const actualResultId = typeof result === 'object' && result !== null && 'resultId' in result
        ? String((result as { resultId: unknown }).resultId)
        : undefined;
      if (!actualResultId || (expectedResultId && actualResultId !== expectedResultId)) {
        return { ok: false, error: { messageKey: 'VERSION_CONFLICT' } };
      }
      return { ok: true, data: { roomId: snapshot.roomId, destination: state === 'DECIDED' ? 'result' : 'no-consensus', resultId: actualResultId } };
    }
    return { ok: false, error: { messageKey: state === 'EXPIRED' ? 'ROOM_EXPIRED' : 'ROOM_TERMINAL' } };
  };

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
      return { ok: true, data: { items, nextCursor: result.data.length === PAGE_SIZE ? last?.id : undefined, fetchedAt: new Date().toISOString() } };
    },
    acceptFriend: invitationId => callSessionApi(roomRepository, client => client.acceptPartner(invitationId, createDurableRequestId('partner_accept'))),
    rejectFriend: invitationId => callSessionApi(roomRepository, client => client.rejectPartner(invitationId, createDurableRequestId('partner_reject'))),
    acceptRoom: (invitationId, displayName) => callSessionApi(roomRepository, client => client.acceptRoomInvite({ invitationId, displayName, requestId: createDurableRequestId('room_invite_accept') })),
    rejectRoom: invitationId => callSessionApi(roomRepository, client => client.rejectRoomInvite(invitationId, createDurableRequestId('room_invite_reject'))),
    resolveAcceptedRoom: roomId => resolveRoom(roomId),
    resolveRoomResult: (roomId, resultId) => resolveRoom(roomId, resultId),
  };
}
