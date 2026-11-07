import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { LiveInboxScreen } from '../features/inbox/screens/LiveInboxScreen';
import { InboxScreen } from '../features/inbox/screens/InboxScreen';
import { pathForDemoDestination } from '../features/shared/navigation';

export default function InboxRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const repository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  if (live.mode === 'real') return <RequireActiveSession onHome={home}>
    <LiveInboxScreen key={live.user?.id ?? 'unknown'} repository={repository} displayName={live.user?.displayName ?? ''} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
  return <InboxScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={home} />;
}
