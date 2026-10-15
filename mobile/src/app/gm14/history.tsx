import { useRouter } from 'expo-router';
import { HistoryScreen } from '../../features/history/screens/HistoryScreen';
import { pathForDemoDestination } from '../../features/shared/navigation';

export default function HistoryRoute() {
  const router = useRouter();
  return <HistoryScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={() => router.replace('/')} />;
}
