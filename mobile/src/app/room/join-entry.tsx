import { useMemo, useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { rememberPreviewRoom, useRoomPreview } from '../../bootstrap/roomPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { JoinRoomEntryScreen } from '../../features/rooms/screens/JoinRoomEntryScreen';
import { createJoinPreviewFixture } from '../../features/rooms/services/joinPreview';

export default function JoinRoomEntryRoute() {
  const router = useRouter(), live = useRoomRepository(), preview = useRoomPreview();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const isReal = live.mode === 'real';
  const [hadActiveRoom] = useState(() => !!preview.active);
  const readPreview = useMemo(() => isReal ? ((c: string) => live.repository.previewJoin(c)) : createJoinPreviewFixture(preview.scenario), [isReal, live.repository, preview.scenario]);
  if (!isReal && hadActiveRoom) return <Redirect href="/continue-session" />;
  const entry = <JoinRoomEntryScreen repository={isReal ? live.repository : preview.client} preview={readPreview}
    initialDisplayName={isReal ? live.user?.displayName : preview.guestName ?? undefined} initialCode={typeof code === 'string' ? code : ''} isMock={!isReal}
    onBack={() => router.canGoBack() ? router.back() : router.replace('/')} onEntered={room => {
      if (!isReal) rememberPreviewRoom(room);
      router.replace({ pathname: '/room/preview', params: { roomId: room.roomId, code: room.code, role: room.role, version: String(room.version) } });
    }} />;
  return isReal ? <RequireActiveSession onHome={() => router.replace('/')}>{entry}</RequireActiveSession> : entry;
}
