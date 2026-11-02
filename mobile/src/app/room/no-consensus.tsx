import { useLocalSearchParams, useRouter } from 'expo-router';
import { DishResultEntry } from '../../bootstrap/DishResultEntry';

export default function NoConsensusRoute() {
  const router = useRouter(), params = useLocalSearchParams<{ legacy?: string }>(), legacy = params.legacy === '1';
  return (
    <DishResultEntry legacy={legacy}
      noConsensus
      onHome={() => router.dismissTo('/')}
      onNewSession={() => router.replace('/room/create-entry')}
      onLegacyNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace(legacy ? '/room/result?legacy=1' : '/room/result')}
    />
  );
}
