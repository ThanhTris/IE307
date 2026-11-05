import { useLocalSearchParams, useRouter } from 'expo-router';
import { JoinRoomScreen } from '../../features/rooms/screens/JoinRoomScreen';
import { JoinRoomEntryScreen } from '../../features/rooms/screens/JoinRoomEntryScreen';
import { RoomEntryReceiptScreen } from '../../features/rooms/screens/RoomEntryReceiptScreen';
import { PreviewControls, previewRoomCode, rememberPreviewRoom, useRoomPreview } from '../../bootstrap/roomPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function JoinRoomRoute() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;
  const initialCodeStr = typeof code === 'string' ? code : Array.isArray(code) ? code[0] ?? '' : '';

  if (isReal) {
    const entry = (
      <JoinRoomEntryScreen
        repository={live.repository}
        preview={(c: string) => live.repository.previewJoin(c)}
        initialDisplayName={live.user?.displayName}
        initialCode={initialCodeStr}
        isMock={false}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        onEntered={room => {
          router.replace({ pathname: '/room/preview', params: { roomId: room.roomId, code: room.code, role: room.role, version: String(room.version) } });
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
    <JoinRoomScreen
      key={preview.revision}
      repository={repository}
      isLive={false}
      initialDisplayName={preview.guestName ?? undefined}
      initialCode={initialCodeStr}
      sampleCode={previewRoomCode}
      onScan={async () => ({ status: 'denied' })}
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
