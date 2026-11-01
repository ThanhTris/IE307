import { Redirect, useRouter } from 'expo-router';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { PreviewControls, previewSessionToken, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function IndexRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;
  const sessionToken = isReal ? undefined : previewSessionToken;

  const needsGuestEntry = isReal
    ? !live.isInitializing && live.status === 'empty' && live.issue === 'no-session' && !live.user
    : !preview.guestName && !preview.active;
  if (needsGuestEntry) return <Redirect href="/welcome" />;

  return (
    <HomeScreen
      key={isReal ? 'live-home' : preview.revision}
      repository={repository}
      sessionToken={sessionToken}
      liveSession={isReal ? live : undefined}
      activeRoom={isReal ? undefined : preview.active}
      onCreate={() => router.push('/room/create')}
      onJoin={() => router.push('/room/join')}
      onResume={() => router.push('/room/preview')}
      onFriends={() => router.push('/friends')}
      onHistory={() => router.push('/history')}
      onInbox={() => router.push('/inbox')}
      onOpenFoundation={isReal ? undefined : () => router.push('/dev/foundation')}
      onOpenRoomSetup={isReal ? undefined : () => router.push('/room/context')}
      onOpenDiscoveryContext={isReal ? undefined : () => router.push('/dev/discovery-context')}
      previewControls={isReal ? undefined : (busy => <PreviewControls disabled={busy} />)}
    />
  );
}
