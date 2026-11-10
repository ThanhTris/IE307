import { useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import type { RoomSnapshot } from '../data/api/contracts';
import { ContinueSessionScreen } from '../features/home/screens/ContinueSessionScreen';

/** Resume an active room on the screen that matches its server state. */
function pathForRoom(room: RoomSnapshot) {
  switch (room.state) {
    case 'ROUND_1': case 'WAITING_1': case 'VOTING': return '/room/vote';
    case 'ROUND_2': case 'WAITING_2': return '/room/final-round';
    case 'DECIDED': case 'FINALIZED': case 'COMPLETED': return '/room/result';
    case 'NO_CONSENSUS': return '/room/no-consensus';
    default: return '/room/lobby';
  }
}

export default function ContinueSessionRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  return <ContinueSessionScreen
    repository={live.repository}
    userId={live.user?.id}
    enabled={!live.isInitializing && live.status === 'active' && live.issue === 'none'}
    isInitializing={live.isInitializing}
    onHome={() => router.replace('/')}
    onContinue={room => router.replace({ pathname: pathForRoom(room), params: { roomId: room.roomId } })}
  />;
}
