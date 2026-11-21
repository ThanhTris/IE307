import { useMemo } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { getDurableOutbox } from '../data/local/outbox';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { GuestFeatureNotice } from '../features/auth/components/GuestFeatureNotice';
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
  if (live.status === 'active' && live.user?.isGuest) {
    return <GuestFeatureNotice feature="history" onHome={home} onNavigate={path => router.push(path as Href)} />;
  }
  return <RequireActiveSession onHome={home}>
    <HistoryScreen key={live.user?.id ?? 'unknown'} repository={repository} onNavigate={path => router.push(path as Href)} onHome={home} />
  </RequireActiveSession>;
}
