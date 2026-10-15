import { useRouter } from 'expo-router';
import { AppShellScreen } from '../features/home/screens/AppShellScreen';

export default function IndexRoute() {
  const router = useRouter();
  return (
    <AppShellScreen
      onOpenFoundation={() => router.push('/foundation')}
      onOpenVoting={() => router.push('/gm12/vote')}
      onOpenContext={() => router.push('/gm24/context')}
      onOpenGm16={
        typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_GM16_INTERNAL === 'true'
          ? () => router.push('/internal/gm16')
          : undefined
      }
    />
  );
}
