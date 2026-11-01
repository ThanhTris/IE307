import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { previewSessionToken, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { ContinueSessionScreen } from '../features/home/screens/ContinueSessionScreen';
import { useRead } from '../features/rooms/hooks/useRoomEntry';

export default function ContinueSessionRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const preview = useRoomPreview();
  const isReal = live.mode === 'real';
  const load = useCallback(() => preview.client.restoreSession(previewSessionToken), [preview.client]);
  const session = useRead(load, !isReal);
  return <ContinueSessionScreen repository={isReal ? live.repository : preview.client}
    receipt={isReal ? undefined : preview.active} userId={isReal ? live.user?.id : session.data?.id}
    enabled={isReal ? !live.isInitializing && live.status === 'active' && live.issue === 'none' : !!session.data && !session.error}
    isInitializing={isReal ? live.isInitializing : session.loading}
    isMock={!isReal} onHome={() => router.replace('/')} onContinue={() => router.replace('/room/preview')} />;
}
