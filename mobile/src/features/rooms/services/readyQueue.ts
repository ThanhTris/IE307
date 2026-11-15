import type { RoomRepository } from './roomRepository';

/**
 * Sends the lobby "ready" flag one request at a time, in the order it was asked for, so the last intention is the one the
 * server ends with (entering the taste screen and leaving it quickly must not land out of order).
 */
const chains = new Map<string, Promise<unknown>>();

export function queueReady(repository: Pick<RoomRepository, 'dispatchDishSession'>, roomId: string, ready: boolean): Promise<void> {
  const previous = chains.get(roomId) ?? Promise.resolve();
  const next = previous
    .then(() => repository.dispatchDishSession('setReady', { roomId, ready }))
    .catch(() => undefined)
    .then(() => { if (chains.get(roomId) === next) chains.delete(roomId); });
  chains.set(roomId, next);
  return next;
}
