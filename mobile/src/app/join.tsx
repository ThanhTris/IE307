import { useLocalSearchParams } from 'expo-router';
import { JoinSpikeScreen } from '../features/bootstrap';

export default function JoinRoute() {
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  return <JoinSpikeScreen code={code} />;
}
