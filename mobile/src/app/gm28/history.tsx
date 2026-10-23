import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { LiveHistoryScreen } from '../../features/history/screens/LiveHistoryScreen';
import { createHistoryRepository } from '../../features/history/services/historyRepository';
import { IntegrationUnavailable } from '../../features/shared/components/IntegrationUnavailable';

export default function Gm28HistoryRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const repository = useMemo(() => createHistoryRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  if (live.mode !== 'real') return <IntegrationUnavailable title="Lịch sử" onHome={home} />;
  return <RequireActiveSession onHome={home}>
    <LiveHistoryScreen key={live.user?.id ?? 'unknown'} repository={repository} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
}
