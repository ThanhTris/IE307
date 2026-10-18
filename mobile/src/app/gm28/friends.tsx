import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { LiveFriendsScreen } from '../../features/friends/screens/LiveFriendsScreen';
import { createSocialRepository } from '../../features/friends/services/socialRepository';
import { IntegrationUnavailable } from '../../features/shared/components/IntegrationUnavailable';

export default function Gm28FriendsRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const repository = useMemo(() => createSocialRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  if (live.mode !== 'real') return <IntegrationUnavailable title="Bạn bè" onHome={home} />;
  return <RequireActiveSession onHome={home}>
    <LiveFriendsScreen key={live.user?.id ?? 'unknown'} repository={repository} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
}
