import { useRouter } from 'expo-router';
import { ResultPreview } from '../../bootstrap/resultPreview';

export default function Gm13NoConsensusRoute() {
  const router = useRouter();
  return <ResultPreview noConsensus onHome={() => router.replace('/')} onNewSession={() => router.replace('/create-room')}
    onOtherScreen={() => router.replace('/gm13/result')} />;
}
