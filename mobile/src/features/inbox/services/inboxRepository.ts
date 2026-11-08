import { ApiClientImpl } from '../../../data/api/client';
import type { InboxItem, JoinRoomResponse, ReadResult, WriteResult } from '../../../data/api/contracts';
import { isVoidPayload } from '../../../data/api/responseGuards';
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
  markAllRead(requestId: string): Promise<WriteResult<void>>;
  /** Suppress a server event after its invitation action succeeded for this app session. */
  markHandled(eventId: string): void;
  acceptFriend(invitationId: string): Promise<WriteResult<void>>;
  rejectFriend(invitationId: string): Promise<WriteResult<void>>;
  acceptRoom(invitationId: string, displayName: string): Promise<WriteResult<JoinRoomResponse>>;
  rejectRoom(invitationId: string): Promise<WriteResult<void>>;
  resolveAcceptedRoom(roomId: string): Promise<ReadResult<ResolvedRoom>>;
  resolveRoomResult(roomId: string, resultId: string): Promise<ReadResult<ResolvedRoom>>;
}

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTRACTS = new Set(['dish-session-v4/roadmap-v2/GM-07.B', 'dish-session-v4/roadmap-v2/GM-07.B-supplement']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function isInboxProjection(value: unknown): value is InboxItem {
  if (!isRecord(value) || !exactKeys(value, ['id', 'eventId', 'type', 'title', 'body', 'read', 'metadata', 'createdAt'])) return false;
  if (typeof value.id !== 'string' || !UUID.test(value.id) || typeof value.eventId !== 'string' || !UUID.test(value.eventId)
    || typeof value.title !== 'string' || typeof value.body !== 'string' || typeof value.read !== 'boolean'
    || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || !isRecord(value.metadata)) return false;
  const metadata = value.metadata;
  if (value.type === 'friend_invite') return exactKeys(metadata, ['invitationId']) && typeof metadata.invitationId === 'string' && UUID.test(metadata.invitationId);
  if (value.type === 'room_invite') return exactKeys(metadata, ['invitationId', 'roomId'])
    && typeof metadata.invitationId === 'string' && UUID.test(metadata.invitationId)
    && typeof metadata.roomId === 'string' && UUID.test(metadata.roomId);
  if (value.type !== 'room_result'
    || typeof metadata.roomId !== 'string' || !UUID.test(metadata.roomId)
    || typeof metadata.resultId !== 'string' || !UUID.test(metadata.resultId)) return false;
  if (exactKeys(metadata, ['roomId', 'resultId'])) return true;
  return exactKeys(metadata, ['roomId', 'resultId', 'status', 'contractVersion', 'eventVersion'])
    && (metadata.status === 'DECIDED' || metadata.status === 'NO_CONSENSUS')
    && typeof metadata.contractVersion === 'string' && CONTRACTS.has(metadata.contractVersion)
    && Number.isInteger(metadata.eventVersion) && Number(metadata.eventVersion) >= 1;
}

function malformedList(): ReadResult<InboxPage> {
  return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
}

/** Server-owned inbox. Cursor values are inbox row IDs from the API, never event IDs. */
export function createInboxRepository(roomRepository: RoomRepository): InboxRepository {
  const handledEventIdsByIdentity = new Map<string, Set<string>>();
  const handledEventIds = () => {
    const identityId = roomRepository.getCurrentUser()?.id ?? 'no-active-session';
    let handled = handledEventIdsByIdentity.get(identityId);
    if (!handled) {
      handled = new Set<string>();
      handledEventIdsByIdentity.set(identityId, handled);
    }
    return handled;
  };
  const resolveRoom = async (roomId: string, expectedResultId?: string): Promise<ReadResult<ResolvedRoom>> => {
    if (!UUID.test(roomId) || (expectedResultId !== undefined && !UUID.test(expectedResultId))) return { ok: false, error: { messageKey: 'INVALID_INPUT' } };
    // RoomRepository owns the canonical dish_session(snapshot) path and its session guard.
    const response = await roomRepository.getRoomSnapshot(roomId);
    if (!response.ok) return response;
    const snapshot = response.data;
    const raw = snapshot as unknown as Record<string, unknown>;
    const state = raw.state;
    if (snapshot.roomId !== roomId) return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
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
      const actualResultId = isRecord(result) && typeof result.resultId === 'string' && UUID.test(result.resultId)
        ? result.resultId
        : undefined;
      if (!actualResultId) return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
      if (expectedResultId && actualResultId !== expectedResultId) {
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
      if (!Array.isArray(result.data) || !result.data.every(isInboxProjection)) return malformedList();
      const seen = new Set(knownEventIds);
      const handled = handledEventIds();
      const items = result.data.filter(item => {
        if (seen.has(item.eventId) || handled.has(item.eventId)) return false;
        seen.add(item.eventId);
        return true;
      });
      const last = result.data[result.data.length - 1];
      return { ok: true, data: { items, nextCursor: result.data.length === PAGE_SIZE ? last?.id : undefined, fetchedAt: new Date().toISOString() } };
    },
    markAllRead: requestId => callSessionApi(roomRepository, async client => {
      if (!(client instanceof ApiClientImpl)) {
        return { ok: false, requestId, error: { messageKey: 'NOT_READY' } };
      }
      const raw = await client.callRpc<unknown>('mark_all_partner_inbox_read', { requestId });
      if (isRecord(raw) && raw.ok === true
        && (!exactKeys(raw, ['ok', 'requestId', 'data']) || raw.requestId !== requestId || raw.data !== null)) {
        return { ok: false, requestId, error: { messageKey: 'MALFORMED_RESPONSE' } };
      }
      return client.normalizeWriteResponse(raw, requestId, isVoidPayload);
    }),
    markHandled(eventId) {
      if (UUID.test(eventId)) handledEventIds().add(eventId);
    },
    acceptFriend: invitationId => callSessionApi(roomRepository, client => client.acceptPartner(invitationId, createDurableRequestId('partner_accept'))),
    rejectFriend: invitationId => callSessionApi(roomRepository, client => client.rejectPartner(invitationId, createDurableRequestId('partner_reject'))),
    acceptRoom: (invitationId, displayName) => callSessionApi(roomRepository, client => client.acceptRoomInvite({ invitationId, displayName, requestId: createDurableRequestId('room_invite_accept') })),
    rejectRoom: invitationId => callSessionApi(roomRepository, client => client.rejectRoomInvite(invitationId, createDurableRequestId('room_invite_reject'))),
    resolveAcceptedRoom: roomId => resolveRoom(roomId),
    resolveRoomResult: (roomId, resultId) => resolveRoom(roomId, resultId),
  };
}
