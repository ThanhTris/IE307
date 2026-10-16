import { useRouter } from 'expo-router';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { PreviewControls, previewSessionToken, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function IndexRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;
  const sessionToken = isReal ? (live.user?.id ?? 'live-session') : previewSessionToken;

  return (
    <HomeScreen
      key={isReal ? `live-${live.user?.id}` : preview.revision}
      repository={repository}
      sessionToken={sessionToken}
      activeRoom={isReal ? undefined : preview.active}
      onCreate={() => router.push('/create-room')}
      onJoin={() => router.push('/join-room')}
      onResume={() => router.push('/room-preview')}
      onOpenFoundation={() => router.push('/foundation')}
      onOpenRoomSetup={() => router.push('/gm10/context')}
      previewControls={isReal ? undefined : (busy => <PreviewControls disabled={busy} />)}
    />
  );
}
