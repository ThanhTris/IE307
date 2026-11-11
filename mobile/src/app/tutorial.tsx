import { useRouter } from 'expo-router';
import { TutorialScreen } from '../features/home/screens/TutorialScreen';

export default function TutorialRoute() {
  const router = useRouter();
  return <TutorialScreen onExit={() => router.replace('/')} />;
}
