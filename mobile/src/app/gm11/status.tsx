import { useRouter } from 'expo-router';
import { RoomStatusScreen } from '../../features/rooms/screens/RoomStatusScreen';
import { pathForDemoDestination } from '../../features/shared/navigation';

export default function RoomStatusRoute() {
  const router = useRouter();
  return <RoomStatusScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={() => router.replace('/')} />;
}
