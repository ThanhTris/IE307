import { useRouter } from 'expo-router';
import { AuthSandboxScreen } from '../../features/auth/screens/AuthSandboxScreen';

export default function AuthSandboxRoute() {
  const router = useRouter();
  return <AuthSandboxScreen onBack={() => router.replace('/')} />;
}
