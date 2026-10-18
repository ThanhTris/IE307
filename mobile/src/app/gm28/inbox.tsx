import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { createInboxRepository } from '../../features/inbox/services/inboxRepository';
import { LiveInboxScreen } from '../../features/inbox/screens/LiveInboxScreen';
import { IntegrationUnavailable } from '../../features/shared/components/IntegrationUnavailable';

export default function Gm28InboxRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const repository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  if (live.mode !== 'real') return <IntegrationUnavailable title="Hộp thư" onHome={home} />;
  return <RequireActiveSession onHome={home}>
    <LiveInboxScreen key={live.user?.id ?? 'unknown'} repository={repository} displayName={live.user?.displayName ?? ''} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
}
