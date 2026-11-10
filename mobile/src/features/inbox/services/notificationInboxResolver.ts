import type { InboxItem, ReadResult } from '../../../data/api/contracts';
import type { InboxRepository, ResolvedRoom } from './inboxRepository';

const MAX_LOOKUP_PAGES = 20;

/** Finds a notification by its server-owned event ID using the existing inbox API. */
export async function findInboxEventById(
  repository: Pick<InboxRepository, 'list'>,
  eventId: string,
): Promise<ReadResult<InboxItem | null>> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    return { ok: false, error: { messageKey: 'INVALID_INPUT' } };
  }

  let cursor: string | undefined;
  const visitedCursors = new Set<string>();
  for (let pageNumber = 0; pageNumber < MAX_LOOKUP_PAGES; pageNumber += 1) {
    const page = await repository.list(cursor);
    if (!page.ok) return page;
    const item = page.data.items.find(candidate => candidate.eventId === eventId);
    if (item) return { ok: true, data: item };
    const nextCursor = page.data.nextCursor;
    if (!nextCursor) return { ok: true, data: null };
    if (visitedCursors.has(nextCursor)) return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
    visitedCursors.add(nextCursor);
    cursor = nextCursor;
  }
  return { ok: false, error: { messageKey: 'NOT_READY' } };
}

/** Maps only a session-authorized server resolution to its existing screen. */
/** After accepting a room invite, a member still in the lobby picks preferences first (same as joining by code). */
export function acceptedRoomPath(room: ResolvedRoom): string {
  if (room.destination === 'lobby') return `/room/setup?roomId=${encodeURIComponent(room.roomId)}&stage=preferences`;
  return roomDestinationPath(room);
}

export function roomDestinationPath(room: ResolvedRoom): string {
  const roomId = encodeURIComponent(room.roomId);
  if (room.destination === 'lobby') return `/room/lobby?roomId=${roomId}`;
  if (room.destination === 'vote') return `/room/vote?roomId=${roomId}`;
  if (room.destination === 'final-round') return `/room/final-round?roomId=${roomId}`;
  if (room.resultContract === 'legacy') return `/inbox-result?roomId=${roomId}&resultId=${encodeURIComponent(room.resultId ?? '')}`;
  if (room.destination === 'no-consensus') return `/room/no-consensus?roomId=${roomId}&resultId=${encodeURIComponent(room.resultId ?? '')}`;
  return `/room/result?roomId=${roomId}&resultId=${encodeURIComponent(room.resultId ?? '')}`;
}
