import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { getDurableOutbox } from '../data/local/outbox';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { createHistoryRepository } from '../features/history/services/historyRepository';
import { PermissionsWelcomeScreen } from '../features/permissions/screens/PermissionsWelcomeScreen';
import { createPermissionService } from '../features/permissions/services/appPermissions';
import { markPermissionsOnboarded } from '../features/permissions/services/permissionsOnboarding';

/** First run on this phone: ask for notifications, camera and location, and offer to keep the meal history. */
export default function WelcomePermissionsRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const service = useMemo(() => createPermissionService(), []);
  const history = useMemo(() => {
    const repository = createHistoryRepository(live.repository, undefined, getDurableOutbox());
    return { save: async (enabled: boolean) => (await repository.updateConsent({ scope: 'personal', consent: enabled })).ok };
  }, [live.repository]);
  const done = useCallback(() => { void markPermissionsOnboarded(live.user?.id).then(() => router.replace('/')); }, [router, live.user?.id]);
  return <RequireActiveSession onHome={() => router.replace('/')}>
    <PermissionsWelcomeScreen service={service} history={history} onDone={done} />
  </RequireActiveSession>;
}
