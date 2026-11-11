import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { getDurableOutbox } from '../data/local/outbox';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { HistoryScreen } from '../features/history/screens/HistoryScreen';
import { createHistoryRepository } from '../features/history/services/historyRepository';

export default function HistoryRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const repository = useMemo(
    () => createHistoryRepository(live.repository, undefined, getDurableOutbox()),
    [live.repository],
  );
  const home = () => router.replace('/');
  return <RequireActiveSession onHome={home}>
    <HistoryScreen key={live.user?.id ?? 'unknown'} repository={repository} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
}
