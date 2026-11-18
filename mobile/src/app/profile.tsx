import { useState } from 'react';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { ProfileScreen } from '../features/account';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';

export default function ProfileRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const [loggingOut, setLoggingOut] = useState(false);
  const home = () => router.replace('/');

  // After local logout, / resolves to the signed-out welcome screen.
  if (!live.isInitializing && live.status === 'empty' && live.issue === 'no-session') return <Redirect href="/welcome" />;
  if (loggingOut && !live.user) return null;

  return <RequireActiveSession onHome={home}>
    {live.user ? <ProfileScreen
      key={live.user.id + ':' + live.user.isGuest}
      user={live.user}
      account={live.account}
      onNavigate={path => { if (path !== '/profile') router.push(path as Href); }}
      onHome={home}
      onLogout={async () => {
        setLoggingOut(true);
        try { return await live.logout(); }
        finally { setLoggingOut(false); }
      }}
    /> : null}
  </RequireActiveSession>;
}
