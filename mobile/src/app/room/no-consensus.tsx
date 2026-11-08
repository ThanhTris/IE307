import { useLocalSearchParams, useRouter } from 'expo-router';
import { DishResultEntry } from '../../bootstrap/DishResultEntry';

export default function NoConsensusRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ legacy?: string; roomId?: string; resultId?: string }>();
  const legacy = params.legacy === '1';
  const roomId = typeof params.roomId === 'string' && params.roomId.trim() ? params.roomId.trim() : undefined;
  const resultId = typeof params.resultId === 'string' && params.resultId.trim() ? params.resultId.trim() : undefined;

  const buildResultUrl = () => {
    const q = new URLSearchParams();
    if (legacy) q.set('legacy', '1');
    if (roomId) q.set('roomId', roomId);
    if (resultId) q.set('resultId', resultId);
    const qs = q.toString();
    return qs ? `/room/result?${qs}` : '/room/result';
  };

  return (
    <DishResultEntry
      legacy={legacy}
      noConsensus
      roomId={roomId}
      resultId={resultId}
      onHome={() => router.dismissTo('/')}
      onNewSession={() => router.replace('/room/create-entry')}
      onLegacyNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace(buildResultUrl())}
    />
  );
}
