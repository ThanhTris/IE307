import { useRouter } from 'expo-router';
import { NotFoundScreen } from '../features/home/screens/NotFoundScreen';

export default function NotFoundRoute() {
  const router = useRouter();
  return <NotFoundScreen onHome={() => router.replace('/')} />;
}
