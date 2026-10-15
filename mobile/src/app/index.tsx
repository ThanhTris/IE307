import { useRouter } from 'expo-router';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { PreviewControls, previewSessionToken, useRoomPreview } from '../bootstrap/roomPreview';

export default function IndexRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  return <HomeScreen key={preview.revision} repository={preview.client} sessionToken={previewSessionToken} activeRoom={preview.active}
    onCreate={() => router.push('/create-room')} onJoin={() => router.push('/join-room')} onResume={() => router.push('/room-preview')}
    onOpenFoundation={() => router.push('/foundation')} onOpenRoomSetup={() => router.push('/gm10/context')}
    onOpenGm24={() => router.push('/gm24/context')}
    previewControls={busy => <PreviewControls disabled={busy} />} />;
}
