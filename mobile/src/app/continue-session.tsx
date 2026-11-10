import { useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { ContinueSessionScreen } from '../features/home/screens/ContinueSessionScreen';

export default function ContinueSessionRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  return <ContinueSessionScreen
    repository={live.repository}
    userId={live.user?.id}
    enabled={!live.isInitializing && live.status === 'active' && live.issue === 'none'}
    isInitializing={live.isInitializing}
    onHome={() => router.replace('/')}
    onContinue={() => router.replace('/room/entered')}
  />;
}
