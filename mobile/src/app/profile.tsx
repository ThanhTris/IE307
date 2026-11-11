import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { ProfileScreen } from '../features/account/screens/ProfileScreen';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';

export default function ProfileRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const home = () => router.replace('/');
  return <RequireActiveSession onHome={home}>
    <ProfileScreen
      key={live.user?.id ?? 'unknown'}
      displayName={live.user?.displayName ?? ''}
      onNavigate={path => router.push(path as Href)}
      onHome={home}
    />
  </RequireActiveSession>;
}
