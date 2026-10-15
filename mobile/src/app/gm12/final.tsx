import { useRouter } from 'expo-router';
import { FinalRoundScreen } from '../../features/voting';

export default function Gm12FinalRoute() {
  const router = useRouter();

  return (
    <FinalRoundScreen
      onFinish={() => router.replace('/')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/gm12/vote'))}
    />
  );
}
