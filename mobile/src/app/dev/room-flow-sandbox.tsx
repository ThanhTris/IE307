import { useRouter } from 'expo-router';
import { RoomFlowSandboxScreen } from '../../features/rooms/screens/RoomFlowSandboxScreen';

export default function RoomFlowSandboxRoute() {
  const router = useRouter();
  return (
    <RoomFlowSandboxScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNavigateTo={(pathname, params) => router.push({ pathname, params } as any)}
    />
  );
}
