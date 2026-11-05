import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { DishSetupPreviewFlow } from '../../bootstrap/DishSetupPreviewFlow';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { DishSetupFlow } from '../../features/context/screens/DishSetupFlow';
import { createLiveDishSetupGateway } from '../../bootstrap/liveDishSetupGateway';
import { createDurableRequestId } from '../../features/rooms/services/roomRepository';
import type { SetupRoom } from '../../features/context/services/dishSetup';

export default function DishSetupRoute() {
  const router = useRouter(), live = useRoomRepository();
  const back = () => router.dismissTo('/');
  const toLobby = (room: SetupRoom) => router.replace({ pathname: '/room/lobby', params: { roomId: room.id } });
  const liveGateway = useMemo(() => (live.mode === 'real' ? createLiveDishSetupGateway(live.repository) : undefined), [live.mode, live.repository]);
  const generateRequestId = useCallback(() => createDurableRequestId('setup'), []);

  if (live.mode === 'real' && liveGateway) {
    return (
      <RequireActiveSession onHome={back}>
        <DishSetupFlow
          gateway={liveGateway}
          requestId={generateRequestId}
          onExit={back}
          onLobby={toLobby}
        />
      </RequireActiveSession>
    );
  }
  return <DishSetupPreviewFlow onExit={back} onLobby={toLobby} />;
}
