import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { DishSetupFlow } from '../../features/context/screens/DishSetupFlow';
import { createLiveDishSetupGateway } from '../../features/context/services/liveDishSetupGateway';
import { createDurableRequestId } from '../../features/rooms/services/roomRepository';
import type { SetupRoom } from '../../features/context/services/dishSetup';

export default function DishSetupRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const back = () => router.dismissTo('/');
  const toLobby = (room: SetupRoom) => router.replace({ pathname: '/room/lobby', params: { roomId: room.id } });
  const gateway = useMemo(() => createLiveDishSetupGateway(live.repository), [live.repository]);
  const generateRequestId = useCallback(() => createDurableRequestId('setup'), []);
  return (
    <RequireActiveSession onHome={back}>
      <DishSetupFlow gateway={gateway} requestId={generateRequestId} onExit={back} onLobby={toLobby} />
    </RequireActiveSession>
  );
}
