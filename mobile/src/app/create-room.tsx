import { useRouter } from 'expo-router';
import { CreateRoomScreen } from '../features/rooms/screens/CreateRoomScreen';
import { RoomEntryReceiptScreen } from '../features/rooms/screens/RoomEntryReceiptScreen';
import { PreviewControls, rememberPreviewRoom, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function CreateRoomRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;

  if (!isReal && preview.active) {
    return (
      <RoomEntryReceiptScreen
        repository={preview.client}
        receipt={preview.active}
        onBack={() => router.replace('/')}
        onPreferences={r => router.push({ pathname: '/gm10/preferences', params: { roomId: r.roomId } })}
        onLobby={r => router.push({ pathname: '/gm11/lobby', params: { roomId: r.roomId } })}
        previewControls={busy => <PreviewControls disabled={busy} />}
      />
    );
  }

  return (
    <CreateRoomScreen
      key={isReal ? 'real' : preview.revision}
      repository={repository}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onEntered={room => {
        if (!isReal) rememberPreviewRoom(room);
        router.replace({ pathname: '/room-preview', params: { roomId: room.roomId, code: room.code, role: room.role, version: String(room.version) } });
      }}
      previewControls={isReal ? undefined : (busy => <PreviewControls disabled={busy} />)}
    />
  );
}
