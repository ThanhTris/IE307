import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { FriendsScreen } from '../features/friends/screens/FriendsScreen';
import { LiveFriendsScreen } from '../features/friends/screens/LiveFriendsScreen';
import { createSocialRepository } from '../features/friends/services/socialRepository';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { pathForDemoDestination } from '../features/shared/navigation';

export default function FriendsRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const repository = useMemo(() => createSocialRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  if (live.mode === 'real') return <RequireActiveSession onHome={home}>
    <LiveFriendsScreen key={live.user?.id ?? 'unknown'} repository={repository} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
  return <FriendsScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={home} />;
}
