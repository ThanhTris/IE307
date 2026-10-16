import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gm25JoinRoomScreen } from '../features/rooms/screens/Gm25JoinRoomScreen';
import { RoomEntryReceiptScreen } from '../features/rooms/screens/RoomEntryReceiptScreen';
import { PreviewControls, previewRoomCode, rememberPreviewRoom, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';

export default function JoinRoomRoute() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;

  const content = !isReal && preview.active ? (
      <RoomEntryReceiptScreen
        repository={preview.client}
        receipt={preview.active}
        onBack={() => router.replace('/')}
        onPreferences={r => router.push({ pathname: '/gm10/preferences', params: { roomId: r.roomId } })}
        onLobby={r => router.push({ pathname: '/gm11/lobby', params: { roomId: r.roomId } })}
        previewControls={busy => <PreviewControls disabled={busy} />}
      />
    ) : (
    <Gm25JoinRoomScreen
      key={isReal ? `real-${live.user?.id ?? 'anonymous'}` : preview.revision}
      repository={repository}
      isLive={isReal}
      initialDisplayName={isReal ? live.user?.displayName : undefined}
      initialCode={typeof code === 'string' ? code : ''}
      sampleCode={isReal ? undefined : previewRoomCode}
      onScan={async () => ({ status: 'denied' })}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onEntered={room => {
        if (!isReal) rememberPreviewRoom(room);
        router.replace({ pathname: '/room-preview', params: { roomId: room.roomId, code: room.code, role: room.role, version: String(room.version) } });
      }}
      previewControls={isReal ? undefined : (busy => <PreviewControls disabled={busy} />)}
    />
  );
  return isReal ? <RequireActiveSession onHome={() => router.replace('/')}>{content}</RequireActiveSession> : content;
}
