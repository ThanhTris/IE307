import { useRouter } from 'expo-router';
import { AppShellScreen } from '../features/home/screens/AppShellScreen';

export default function ShellRoute() {
  const router = useRouter();
  return (
    <AppShellScreen
      onOpenFoundation={() => router.push('/foundation')}
      onOpenVoting={() => router.push('/gm12/vote')}
      onOpenRoomSetup={() => router.push('/gm10/context')}
      onOpenGm24={() => router.push('/gm24/context')}
      onOpenGm25={() => router.push('/internal/gm25')}
      onOpenGm16={
        typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_GM16_INTERNAL === 'true'
          ? () => router.push('/internal/gm16')
          : undefined
      }
    />
  );
}
