import { useMemo } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { FriendsScreen } from '../features/friends/screens/FriendsScreen';
import { createSocialRepository } from '../features/friends/services/socialRepository';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function FriendsRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const live = useRoomRepository();
  const repository = useMemo(() => createSocialRepository(live.repository), [live.repository]);
  const inboxRepository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  return <RequireActiveSession onHome={home}>
    <FriendsScreen key={live.user?.id ?? 'unknown'} repository={repository} inboxRepository={inboxRepository} onNavigate={path => router.push(path as Href)} onHome={home} onBack={from === 'lobby' ? () => router.back() : undefined} />
  </RequireActiveSession>;
}
