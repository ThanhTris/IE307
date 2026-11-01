import { useRouter } from 'expo-router';
import { markTutorialSeen } from '../bootstrap/roomPreview';
import { TutorialScreen } from '../features/home/screens/TutorialScreen';

export default function TutorialRoute() {
  const router = useRouter();
  return <TutorialScreen onComplete={markTutorialSeen} onExit={() => { markTutorialSeen(); router.replace('/'); }} />;
}
