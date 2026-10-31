import { useRouter } from 'expo-router';
import { VoteScreen } from '../../features/voting';

export default function VoteRoute() {
  const router = useRouter();

  return (
    <VoteScreen
      onGoToFinalRound={() => router.push('/room/final-round')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
