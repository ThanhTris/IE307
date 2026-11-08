import { useRouter } from 'expo-router';
import { CreateRoomScreen } from '../../features/rooms/screens/CreateRoomScreen';
import { CreateRoomEntryScreen } from '../../features/rooms/screens/CreateRoomEntryScreen';
import { RoomEntryReceiptScreen } from '../../features/rooms/screens/RoomEntryReceiptScreen';
import { PreviewControls, rememberPreviewRoom, useRoomPreview } from '../../bootstrap/roomPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function CreateRoomRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;

  if (isReal) {
    const entry = (
      <CreateRoomEntryScreen
        displayName={live.user?.displayName}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        isMock={false}
        onOpenSetup={async () => {
          router.push('/room/setup');
          return true;
        }}
      />
    );
    return <RequireActiveSession onHome={() => router.replace('/')}>{entry}</RequireActiveSession>;
  }

  const content = preview.active ? (
    <RoomEntryReceiptScreen
      repository={preview.client}
      receipt={preview.active}
      onBack={() => router.replace('/')}
      onPreferences={r => router.push({ pathname: '/room/preferences', params: { roomId: r.roomId } })}
      onLobby={r => router.push({ pathname: '/room/lobby', params: { roomId: r.roomId } })}
      previewControls={busy => <PreviewControls disabled={busy} />}
    />
  ) : (
    <CreateRoomScreen
      key={preview.revision}
      repository={repository}
      isLive={false}
      initialDisplayName={preview.guestName ?? undefined}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onEntered={room => {
        rememberPreviewRoom(room);
        router.replace({ pathname: '/room/preview', params: { roomId: room.roomId, code: room.code, role: room.role, version: String(room.version) } });
      }}
      previewControls={busy => <PreviewControls disabled={busy} />}
    />
  );
  return content;
}
