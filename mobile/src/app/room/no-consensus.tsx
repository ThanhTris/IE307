import { useLocalSearchParams, useRouter } from 'expo-router';
import { DishResultEntry } from '../../bootstrap/DishResultEntry';

export default function NoConsensusRoute() {
  const router = useRouter(), params = useLocalSearchParams<{ legacy?: string; roomId?: string; resultId?: string }>(), legacy = params.legacy === '1';
  return (
    <DishResultEntry legacy={legacy} roomId={typeof params.roomId === 'string' ? params.roomId : undefined} resultId={typeof params.resultId === 'string' ? params.resultId : undefined}
      noConsensus
      onHome={() => router.dismissTo('/')}
      onNewSession={() => router.replace('/room/create-entry')}
      onLegacyNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace(legacy ? '/room/result?legacy=1' : '/room/result')}
    />
  );
}
