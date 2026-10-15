import { useRouter } from 'expo-router';
import { AppShellScreen } from '../features/home/screens/AppShellScreen';

export default function ShellRoute() {
  const router = useRouter();
  return <AppShellScreen onOpenFoundation={() => router.push('/foundation')} />;
}
