import { useRouter } from 'expo-router';
import { FriendsScreen } from '../../features/friends/screens/FriendsScreen';
import { pathForDemoDestination } from '../../features/shared/navigation';

export default function FriendsRoute() {
  const router = useRouter();
  return <FriendsScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={() => router.replace('/')} />;
}
