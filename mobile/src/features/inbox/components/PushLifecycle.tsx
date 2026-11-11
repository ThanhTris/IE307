import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { createNativePushService } from '../services/nativePush';
import { getActivePushDriver } from '../services/expoPushDriver';

/**
 * Mounted once in the root layout. When the user taps a push notification, refresh the
 * session and inbox, then open the in-app Inbox. Notification payloads are never trusted.
 */
export function PushLifecycle() {
  const router = useRouter();
  const session = useRoomRepository();

  useEffect(() => {
    const repository = session.repository;
    const userId = repository.getCurrentUser()?.id;
    const identityRevision = (repository as typeof repository & { getIdentityRevision?: () => number }).getIdentityRevision?.() ?? 0;
    if (!userId || repository.getSessionStatus() !== 'active') return;
    let active = true;
    const isIdentityCurrent = () => repository.getSessionStatus() === 'active'
      && active
      && repository.getCurrentUser()?.id === userId
      && ((repository as typeof repository & { getIdentityRevision?: () => number }).getIdentityRevision?.() ?? 0) === identityRevision;
    const service = createNativePushService({
      driver: getActivePushDriver(),
      client: repository.getApiClient(),
      identityId: userId,
      isIdentityCurrent,
      refreshInbox: async () => {
        const restored = await repository.restoreSession();
        if (!restored.ok || !isIdentityCurrent()) return;
        const inbox = await repository.getApiClient().listPartnerInbox();
        if (inbox.ok && isIdentityCurrent()) router.replace('/inbox');
      },
    });
    const unsubscribe = service.subscribe();
    return () => { active = false; unsubscribe(); };
  }, [router, session.repository, session.user?.id, session.status]);

  return null;
}
