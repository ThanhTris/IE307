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
    const service = createNativePushService({
      driver: expoPushDriver,
      client: repository.getApiClient(),
      refreshInbox: async () => {
        const restored = await repository.restoreSession();
        if (!restored.ok || repository.getSessionStatus() !== 'active') return;
        const inbox = await repository.getApiClient().listPartnerInbox();
        if (inbox.ok) router.replace('/inbox');
      },
    });
    return service.subscribe();
  }, [router, session.mode, session.repository]);

  return null;
}
