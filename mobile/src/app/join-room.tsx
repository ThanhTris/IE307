import { useLocalSearchParams, useRouter } from 'expo-router';
import { JoinRoomScreen } from '../features/rooms/screens/JoinRoomScreen';
import { RoomEntryReceiptScreen } from '../features/rooms/screens/RoomEntryReceiptScreen';
import { PreviewControls, previewRoomCode, rememberPreviewRoom, useRoomPreview } from '../bootstrap/roomPreview';

export default function JoinRoomRoute() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  const preview = useRoomPreview();
  if (preview.active) return <RoomEntryReceiptScreen repository={preview.client} receipt={preview.active} onBack={() => router.replace('/')} previewControls={busy => <PreviewControls disabled={busy} />} />;
  return <JoinRoomScreen key={preview.revision} repository={preview.client} initialCode={typeof code === 'string' ? code : ''} sampleCode={previewRoomCode}
    onScan={async () => ({ status: 'denied' })} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    onEntered={room => { rememberPreviewRoom(room); router.replace('/room-preview'); }} previewControls={busy => <PreviewControls disabled={busy} />} />;
}
