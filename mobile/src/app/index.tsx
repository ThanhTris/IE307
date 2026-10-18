import { useRouter } from 'expo-router';
import { Gm25HomeScreen } from '../features/home/screens/Gm25HomeScreen';
import { PreviewControls, previewSessionToken, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function IndexRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;
  const sessionToken = isReal ? undefined : previewSessionToken;

  return (
    <Gm25HomeScreen
      key={isReal ? 'live-home' : preview.revision}
      repository={repository}
      sessionToken={sessionToken}
      liveSession={isReal ? live : undefined}
      activeRoom={isReal ? undefined : preview.active}
      onCreate={() => router.push('/create-room')}
      onJoin={() => router.push('/join-room')}
      onResume={() => router.push('/room-preview')}
      onFriends={isReal ? () => router.push('/gm28/friends') : undefined}
      onInbox={isReal ? () => router.push('/gm28/inbox') : undefined}
      onOpenFoundation={isReal ? undefined : () => router.push('/foundation')}
      onOpenRoomSetup={isReal ? undefined : () => router.push('/gm10/context')}
      onOpenGm24={isReal ? undefined : () => router.push('/gm24/context')}
      previewControls={isReal ? undefined : (busy => <PreviewControls disabled={busy} />)}
    />
  );
}
