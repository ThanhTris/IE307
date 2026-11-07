import { useLocalSearchParams, useRouter } from 'expo-router';
import { DishResultEntry } from '../../bootstrap/DishResultEntry';

export default function ResultRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ legacy?: string; roomId?: string; resultId?: string }>();
  const legacy = params.legacy === '1';
  const roomId = typeof params.roomId === 'string' && params.roomId.trim() ? params.roomId.trim() : undefined;
  const resultId = typeof params.resultId === 'string' && params.resultId.trim() ? params.resultId.trim() : undefined;

  const buildNoConsensusUrl = () => {
    const q = new URLSearchParams();
    if (legacy) q.set('legacy', '1');
    if (roomId) q.set('roomId', roomId);
    if (resultId) q.set('resultId', resultId);
    const qs = q.toString();
    return qs ? `/room/no-consensus?${qs}` : '/room/no-consensus';
  };

  return (
    <DishResultEntry
      legacy={legacy}
      roomId={roomId}
      resultId={resultId}
      onHome={() => router.dismissTo('/')}
      onNewSession={() => router.replace('/room/create-entry')}
      onLegacyNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace(buildNoConsensusUrl())}
    />
  );
}
