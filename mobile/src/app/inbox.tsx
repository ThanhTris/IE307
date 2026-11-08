import { useMemo } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { LiveInboxScreen } from '../features/inbox/screens/LiveInboxScreen';
import { InboxScreen } from '../features/inbox/screens/InboxScreen';
import { pathForDemoDestination } from '../features/shared/navigation';

export default function InboxRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const live = useRoomRepository();
  const repository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  const validReturnTo = returnTo === 'friends' ? '/friends' : returnTo === 'history' ? '/history' : undefined;
  const back = () => validReturnTo ? router.replace(validReturnTo as Href) : router.canGoBack() ? router.back() : home();
  if (live.mode === 'real') return <RequireActiveSession onHome={home}>
    <LiveInboxScreen key={live.user?.id ?? 'unknown'} repository={repository} displayName={live.user?.displayName ?? ''} onNavigate={path => router.push(path as Href)} onHome={back} />
  </RequireActiveSession>;
  return <InboxScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={home} />;
}
