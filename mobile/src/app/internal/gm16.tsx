import { useRouter } from 'expo-router';
import { Gm16InternalScreen } from '../../features/auth/screens/Gm16InternalScreen';

export default function Gm16InternalRoute() {
  const router = useRouter();
  return <Gm16InternalScreen onBack={() => router.replace('/')} />;
}
