import { useRouter } from 'expo-router';
import { ResultPreview } from '../../bootstrap/resultPreview';

export default function Gm13ResultRoute() {
  const router = useRouter();
  return <ResultPreview onHome={() => router.replace('/')} onNewSession={() => router.replace('/create-room')}
    onOtherScreen={() => router.replace('/gm13/no-consensus')} />;
}
