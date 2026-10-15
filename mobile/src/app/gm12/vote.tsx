import { useRouter } from 'expo-router';
import { VoteScreen } from '../../features/voting';

export default function Gm12VoteRoute() {
  const router = useRouter();

  return (
    <VoteScreen
      onGoToFinalRound={() => router.push('/gm12/final')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
