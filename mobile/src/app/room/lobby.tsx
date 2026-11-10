import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { LobbyScreen } from '../../features/rooms/screens/LobbyScreen';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { createDurableRequestId } from '../../features/rooms/services/roomRepository';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function LobbyRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  return <RequireActiveSession onHome={() => router.replace('/')}>
    <LobbyScreen
      key={`${roomId ?? 'missing'}-${live.user?.id ?? 'unknown'}`}
      onNavigate={path => router.push(path as Href)}
      onHome={() => router.replace('/')}
      repository={live.repository}
      roomId={typeof roomId === 'string' ? roomId : undefined}
      currentUserId={live.user?.id}
      createRequestId={action => createDurableRequestId(`lobby_${action}`)}
      onStartRound={snapshot => router.replace({ pathname: '/room/vote', params: { roomId: snapshot.roomId } })}
      onEditSettings={snapshot => router.push({ pathname: '/room/setup', params: { roomId: snapshot.roomId, stage: 'setup' } })}
      onEditPreferences={snapshot => router.push({ pathname: '/room/setup', params: { roomId: snapshot.roomId, stage: 'preferences' } })}
    />
  </RequireActiveSession>;
}
