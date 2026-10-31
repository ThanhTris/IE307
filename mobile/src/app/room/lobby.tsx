import { useLocalSearchParams, useRouter } from 'expo-router';
import { LiveLobbyScreen } from '../../features/rooms/screens/LiveLobbyScreen';
import { pathForDemoDestination } from '../../features/shared/navigation';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { createDurableRequestId } from '../../features/rooms/services/roomRepository';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function LobbyRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const lobby = (
    <LiveLobbyScreen
      key={isReal ? `live-${roomId ?? 'missing'}-${live.user?.id ?? 'unknown'}` : 'mock'}
      onNavigate={destination => router.push(pathForDemoDestination(destination))}
      onHome={() => router.replace('/')}
      repository={isReal ? live.repository : undefined}
      roomId={typeof roomId === 'string' ? roomId : undefined}
      currentUserId={live.user?.id}
      createRequestId={action => createDurableRequestId(`lobby_${action}`)}
      onEditContext={snapshot => router.push({ pathname: '/room/context', params: { roomId: snapshot.roomId } })}
    />
  );
  return isReal ? <RequireActiveSession onHome={() => router.replace('/')}>{lobby}</RequireActiveSession> : lobby;
}
