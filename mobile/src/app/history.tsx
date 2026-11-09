import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { getDurableOutbox } from '../data/local/outbox';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { LiveHistoryScreen } from '../features/history/screens/LiveHistoryScreen';
import { createHistoryRepository } from '../features/history/services/historyRepository';
import { HistoryScreen } from '../features/history/screens/HistoryScreen';
import { pathForDemoDestination } from '../features/shared/navigation';

export default function HistoryRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const repository = useMemo(
    () => createHistoryRepository(live.repository, undefined, getDurableOutbox()),
    [live.repository],
  );
  const home = () => router.replace('/');
  if (live.mode === 'real') return <RequireActiveSession onHome={home}>
    <LiveHistoryScreen key={live.user?.id ?? 'unknown'} repository={repository} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
  return <HistoryScreen onNavigate={destination => router.push(pathForDemoDestination(destination))} onHome={home} />;
}
