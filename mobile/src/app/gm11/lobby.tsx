import { useRouter } from 'expo-router';
import { LobbyScreen } from '../../features/rooms/screens/LobbyScreen';
import { pathForDemoDestination } from '../../features/shared/navigation';

export default function LobbyRoute() {
  const router = useRouter();
  return <LobbyScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={() => router.replace('/')} />;
}
