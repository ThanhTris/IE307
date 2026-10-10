import { useRouter } from 'expo-router';
import { FoundationScreen } from '../features/home/screens/FoundationScreen';

export default function FoundationRoute() {
  const router = useRouter();
  return <FoundationScreen onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
