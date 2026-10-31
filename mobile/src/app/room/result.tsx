import { useRouter } from 'expo-router';
import { ResultPreview } from '../../bootstrap/resultPreview';

export default function ResultRoute() {
  const router = useRouter();
  return (
    <ResultPreview
      onHome={() => router.replace('/')}
      onNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace('/room/no-consensus')}
    />
  );
}
