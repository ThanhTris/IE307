import type { RoomSnapshot } from '../../../data/api/contracts';

/** Screen that matches a room's server state, used when the user resumes an active room from Home. */
export function resumePathForRoom(room: Pick<RoomSnapshot, 'state'>): '/room/vote' | '/room/final-round' | '/room/result' | '/room/no-consensus' | '/room/lobby' {
  switch (room.state) {
    case 'ROUND_1': case 'WAITING_1': case 'VOTING': return '/room/vote';
    // Round 2 cannot be re-entered (ADR-027), but a person already inside it keeps its screen.
    case 'ROUND_2': case 'WAITING_2': return '/room/final-round';
    case 'DECIDED': case 'FINALIZED': case 'COMPLETED': return '/room/result';
    case 'NO_CONSENSUS': return '/room/no-consensus';
    default: return '/room/lobby';
  }
}

/** The router target that takes a person back into a room, on the screen that matches its state. */
export function resumeHref(room: Pick<RoomSnapshot, 'state' | 'roomId'>) {
  return { pathname: resumePathForRoom(room), params: { roomId: room.roomId } };
}
