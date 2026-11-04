import { useRouter } from 'expo-router';
import { GuestSettingsScreen } from '../features/account/screens/GuestSettingsScreen';
import { pathForDemoDestination } from '../features/shared/navigation';

export default function SettingsRoute() {
  const router = useRouter();
  return <GuestSettingsScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={() => router.replace('/')} />;
}
