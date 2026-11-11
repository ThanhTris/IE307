import { useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { DishSetupFlow } from '../../features/context/screens/DishSetupFlow';
import { createLiveDishSetupGateway } from '../../features/context/services/liveDishSetupGateway';
import { createDurableRequestId } from '../../features/rooms/services/roomRepository';
import type { SetupRoom } from '../../features/context/services/dishSetup';

/**
 * One setup flow for everyone.
 * - Host, new room: /room/setup → room settings → own preferences.
 * - Host, existing room: /room/setup?roomId=…&stage=setup (edit settings from the lobby).
 * - Member: /room/setup?roomId=…&stage=preferences → own preferences only.
 */
export default function DishSetupRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string; stage?: string }>();
  const roomId = typeof params.roomId === 'string' && params.roomId ? params.roomId : undefined;
  const initialStage = roomId && params.stage === 'preferences' ? 'preferences' : 'setup';
  const live = useRoomRepository();
  const back = () => router.dismissTo('/');
  const toLobby = (room: SetupRoom) => router.replace({ pathname: '/room/lobby', params: { roomId: room.id } });
  const gateway = useMemo(() => createLiveDishSetupGateway(live.repository, roomId), [live.repository, roomId]);
  const generateRequestId = useCallback(() => createDurableRequestId('setup'), []);
  return (
    <RequireActiveSession onHome={back}>
      <DishSetupFlow
        key={`${roomId ?? 'new'}-${initialStage}-${live.user?.id ?? 'unknown'}`}
        gateway={gateway}
        initialStage={initialStage}
        requestId={generateRequestId}
        onExit={back}
        onLobby={toLobby}
      />
    </RequireActiveSession>
  );
}
