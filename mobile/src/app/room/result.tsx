import { useLocalSearchParams, useRouter } from 'expo-router';
import { DishResultEntry } from '../../bootstrap/DishResultEntry';

export default function ResultRoute() {
  const router = useRouter(), params = useLocalSearchParams<{ legacy?: string }>(), legacy = params.legacy === '1';
  return (
    <DishResultEntry legacy={legacy}
      onHome={() => router.dismissTo('/')}
      onNewSession={() => router.replace('/room/create-entry')}
      onLegacyNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace(legacy ? '/room/no-consensus?legacy=1' : '/room/no-consensus')}
    />
  );
}
