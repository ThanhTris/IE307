import { useRouter } from 'expo-router';
import { AppShellScreen } from '../../features/home/screens/AppShellScreen';

export default function ShellRoute() {
  const router = useRouter();
  return (
    <AppShellScreen
      onOpenFoundation={() => router.push('/dev/foundation')}
      onOpenVoting={() => router.push('/room/vote')}
      onOpenRoomSetup={() => router.push({ pathname: '/room/context', params: { legacy: '1' } })}
      onOpenDiscoveryContext={() => router.push('/dev/discovery-context')}
      onOpenRoomFlowSandbox={() => router.push('/dev/room-flow-sandbox')}
      onOpenAuthSandbox={
        typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_GM16_INTERNAL === 'true'
          ? () => router.push('/dev/auth-sandbox')
          : undefined
      }
    />
  );
}
