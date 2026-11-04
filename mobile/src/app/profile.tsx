import { useRouter } from 'expo-router';
import { GuestProfileScreen } from '../features/account/screens/GuestProfileScreen';
import { pathForDemoDestination } from '../features/shared/navigation';

export default function ProfileRoute() {
  const router = useRouter();
  return <GuestProfileScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={() => router.replace('/')} onTutorial={() => router.push('/tutorial')} />;
}
