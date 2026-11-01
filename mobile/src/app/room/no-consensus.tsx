import { useRouter } from 'expo-router';
import { ResultPreview } from '../../bootstrap/resultPreview';

export default function NoConsensusRoute() {
  const router = useRouter();
  return (
    <ResultPreview
      noConsensus
      onHome={() => router.replace('/')}
      onNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace('/room/result')}
    />
  );
}
