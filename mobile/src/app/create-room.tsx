import { useRouter } from 'expo-router';
import { CreateRoomScreen } from '../features/rooms/screens/CreateRoomScreen';
import { RoomEntryReceiptScreen } from '../features/rooms/screens/RoomEntryReceiptScreen';
import { PreviewControls, rememberPreviewRoom, useRoomPreview } from '../bootstrap/roomPreview';

export default function CreateRoomRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  if (preview.active) return <RoomEntryReceiptScreen repository={preview.client} receipt={preview.active} onBack={() => router.replace('/')} previewControls={busy => <PreviewControls disabled={busy} />} />;
  return <CreateRoomScreen key={preview.revision} repository={preview.client} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    onEntered={room => { rememberPreviewRoom(room); router.replace('/room-preview'); }} previewControls={busy => <PreviewControls disabled={busy} />} />;
}
