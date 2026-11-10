import { useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { InboxScreen } from '../features/inbox/screens/InboxScreen';

export default function InboxRoute() {
  const router = useRouter();
  const { returnTo, openEventId, notificationStatus } = useLocalSearchParams<{
    returnTo?: string;
    openEventId?: string;
    notificationStatus?: string;
  }>();
  const live = useRoomRepository();
  const repository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const identityId = live.user?.id;
  const sessionGeneration = live.repository.getSessionApi()?.getGeneration();
  const home = () => router.replace('/');
  const navigate = useCallback((path: string) => router.push(path as Href), [router]);
  const isSessionCurrent = useCallback(() => Boolean(identityId)
    && live.repository.getSessionStatus() === 'active'
    && live.repository.getCurrentUser()?.id === identityId
    && (sessionGeneration === undefined || live.repository.getSessionApi()?.getGeneration() === sessionGeneration),
  [identityId, live.repository, sessionGeneration]);
  const validReturnTo = returnTo === 'friends' ? '/friends' : returnTo === 'history' ? '/history' : undefined;
  const back = () => validReturnTo ? router.replace(validReturnTo as Href) : router.canGoBack() ? router.back() : home();
  return <RequireActiveSession onHome={home}>
    <InboxScreen
      key={live.user?.id ?? 'unknown'}
      repository={repository}
      displayName={live.user?.displayName ?? ''}
      onNavigate={navigate}
      onHome={back}
      isSessionCurrent={isSessionCurrent}
      onPushSettings={() => router.push('/push-settings')}
      openEventId={typeof openEventId === 'string' ? openEventId : undefined}
      notificationStatus={typeof notificationStatus === 'string' ? notificationStatus : undefined}
    />
  </RequireActiveSession>;
}
