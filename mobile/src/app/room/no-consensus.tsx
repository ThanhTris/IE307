import { useLocalSearchParams, useRouter } from 'expo-router';
import { DishResultEntry } from '../../features/result/screens/DishResultEntry';

export default function NoConsensusRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string; resultId?: string }>();
  const roomId = typeof params.roomId === 'string' && params.roomId.trim() ? params.roomId.trim() : undefined;
  const resultId = typeof params.resultId === 'string' && params.resultId.trim() ? params.resultId.trim() : undefined;

  const buildResultUrl = () => {
    const q = new URLSearchParams();
    if (roomId) q.set('roomId', roomId);
    if (resultId) q.set('resultId', resultId);
    const qs = q.toString();
    return qs ? `/room/result?${qs}` : '/room/result';
  };

  return (
    <DishResultEntry
      noConsensus
      roomId={roomId}
      resultId={resultId}
      onHome={() => router.dismissTo('/')}
      onNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace(buildResultUrl())}
    />
  );
}
