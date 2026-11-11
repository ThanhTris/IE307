import { Redirect, useRouter } from 'expo-router';
import { PushSettingsScreen } from '../features/inbox/screens/PushSettingsScreen';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function PushSettingsRoute() {
  const router = useRouter();
  const session = useRoomRepository();
  if (session.isInitializing) return null;
  if (!session.user || session.status !== 'active') return <Redirect href="/welcome" />;
  return <PushSettingsScreen
    repository={session.repository}
    onHome={() => router.replace('/')}
    onInbox={() => router.replace('/inbox')}
  />;
}
