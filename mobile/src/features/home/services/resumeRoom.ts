import type { RoomSnapshot } from '../../../data/api/contracts';

/** Screen that matches a room's server state, used when the user resumes an active room from Home. */
export function resumePathForRoom(room: Pick<RoomSnapshot, 'state'>): '/room/vote' | '/room/final-round' | '/room/result' | '/room/no-consensus' | '/room/lobby' {
  switch (room.state) {
    case 'ROUND_1': case 'WAITING_1': case 'VOTING': return '/room/vote';
    case 'ROUND_2': case 'WAITING_2': return '/room/final-round';
    case 'DECIDED': case 'FINALIZED': case 'COMPLETED': return '/room/result';
    case 'NO_CONSENSUS': return '/room/no-consensus';
    default: return '/room/lobby';
  }
}
