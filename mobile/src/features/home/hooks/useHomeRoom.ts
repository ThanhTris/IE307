import { useCallback } from 'react';
import type { RoomSnapshot } from '../../../data/api/contracts';
import { useRead } from '../../rooms/hooks/useRoomEntry';
import type { RoomEntryReceipt, RoomEntryRepository } from '../../rooms/services/roomEntry';

export const resumableRoom = (room: RoomSnapshot) =>
  room.state === 'LOBBY' || room.state === 'ROUND_1' || room.state === 'ROUND_2' || room.state === 'VOTING';

export function useHomeRoom(repository: RoomEntryRepository, receipt: RoomEntryReceipt | null | undefined, userId?: string, enabled = true, revision = 0) {
  const roomId = receipt?.roomId;
  const code = receipt?.code;
  const version = receipt?.version;
  const load = useCallback(async () => {
    if (!enabled || !userId) return { ok: false as const, error: { messageKey: 'AUTH_REQUIRED' as const } };
    const result = await repository.getRoomSnapshot(roomId!);
    if (!result.ok) return result;
    const room = result.data;
    if (room.roomId !== roomId || room.code !== code || room.version < (version ?? 0)) {
      return { ok: false as const, error: { messageKey: 'MALFORMED_RESPONSE' as const } };
    }
    if (!room.members.some(member => member.userId === userId)) {
      return { ok: false as const, error: { messageKey: 'NOT_MEMBER' as const } };
    }
    return result;
  }, [repository, roomId, code, version, userId, enabled]);
  const room = useRead(load, enabled && !!roomId && !!userId, revision);
  const active = !!room.data && resumableRoom(room.data);
  const unavailable = room.error === 'ROOM_NOT_FOUND' || room.error === 'ROOM_EXPIRED' || room.error === 'ROOM_TERMINAL' || room.error === 'NOT_MEMBER';
  return { ...room, active, unavailable, blocksEntry: !!receipt && (room.loading || active || (!!room.error && !unavailable)) };
}
