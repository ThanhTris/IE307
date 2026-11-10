import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { SettingsScreen } from '../features/account/screens/SettingsScreen';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';

export default function SettingsRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const home = () => router.replace('/');
  const back = () => (router.canGoBack() ? router.back() : home());
  return <RequireActiveSession onHome={home}>
    <SettingsScreen
      onNavigate={path => router.push(path as Href)}
      onBack={back}
      onLogout={async () => { await live.logout(); router.replace('/welcome'); }}
    />
  </RequireActiveSession>;
}
