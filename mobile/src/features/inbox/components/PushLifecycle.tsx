import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { createNativePushService } from '../services/nativePush';
import { expoPushDriver } from '../services/expoPushDriver';

/** Refetches the authenticated inbox before routing; notification payloads are ignored. */
export function PushLifecycle() {
  const router = useRouter();
  const session = useRoomRepository();

  useEffect(() => {
    if (session.mode !== 'real') return;
    const repository = session.repository;
    const userId = repository.getCurrentUser()?.id;
    const identityRevision = repository.getIdentityRevision?.() ?? 0;
    if (!userId || repository.getSessionStatus() !== 'active') return;
    const isIdentityCurrent = () => repository.getSessionStatus() === 'active'
      && repository.getCurrentUser()?.id === userId
      && (repository.getIdentityRevision?.() ?? 0) === identityRevision;
    const service = createNativePushService({
      driver: expoPushDriver,
      client: repository.getApiClient(),
      isIdentityCurrent,
      refreshInbox: async () => {
        const restored = await repository.restoreSession();
        if (!restored.ok || repository.getSessionStatus() !== 'active') return;
        const inbox = await repository.getApiClient().listPartnerInbox();
        if (inbox.ok) router.replace('/inbox');
      },
    });
    return service.subscribe();
  }, [router, session.mode, session.repository, session.user?.id, session.status]);

  return null;
}
