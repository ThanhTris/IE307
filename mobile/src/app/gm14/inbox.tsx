import { useRouter } from 'expo-router';
import { InboxScreen } from '../../features/inbox/screens/InboxScreen';
import { pathForDemoDestination } from '../../features/shared/navigation';

export default function InboxRoute() {
  const router = useRouter();
  return <InboxScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={() => router.replace('/')} />;
}
