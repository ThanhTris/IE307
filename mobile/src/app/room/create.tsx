import { useRouter } from 'expo-router';
import { CreateRoomScreen } from '../../features/rooms/screens/CreateRoomScreen';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function CreateRoomRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  return <RequireActiveSession onHome={() => router.replace('/')}>
    <CreateRoomScreen
      displayName={live.user?.displayName}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenSetup={async () => {
        router.push('/room/setup');
        return true;
      }}
    />
  </RequireActiveSession>;
}
