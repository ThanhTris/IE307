import { useLocalSearchParams, useRouter } from 'expo-router';
import { LobbyScreen } from '../../features/rooms/screens/LobbyScreen';
import { pathForDemoDestination } from '../../features/shared/navigation';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';

export default function LobbyRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  return (
    <LobbyScreen
      onNavigate={destination => router.push(pathForDemoDestination(destination))}
      onHome={() => router.replace('/')}
      repository={isReal ? live.repository : undefined}
      roomId={typeof roomId === 'string' ? roomId : undefined}
      currentUserId={live.user?.id}
      onEditContext={snapshot => router.push({ pathname: '/gm10/context', params: { roomId: snapshot.roomId } })}
    />
  );
}
