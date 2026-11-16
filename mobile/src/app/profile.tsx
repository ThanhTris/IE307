import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { ProfileScreen } from '../features/account';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';

export default function ProfileRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const home = () => router.replace('/');
  return <RequireActiveSession onHome={home}>
    {live.user ? <ProfileScreen
      key={live.user.id + ':' + live.user.isGuest}
      user={live.user}
      account={live.account}
      onNavigate={path => { if (path !== '/profile') router.push(path as Href); }}
      onHome={home}
      onLogout={async () => {
        const ok = await live.logout();
        router.dismissTo(ok ? '/welcome' : '/');
        return ok;
      }}
    /> : null}
  </RequireActiveSession>;
}
