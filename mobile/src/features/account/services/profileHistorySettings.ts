import type { WriteResult } from '../../../data/api/contracts';
import { historyIdOf, type HistoryRepository } from '../../history/services/historyRepository';
import type { RoomRepository } from '../../rooms/services/roomRepository';

export interface PersonalHistorySettings extends Pick<HistoryRepository, 'readConsent' | 'updateConsent'> {
  deletePersonal(): Promise<WriteResult<void>>;
}

export function createProfileHistorySettings(
  rooms: RoomRepository,
  history: HistoryRepository,
): PersonalHistorySettings {
  return {
    readConsent: () => history.readConsent(),
    updateConsent: request => history.updateConsent(request),
    async deletePersonal() {
      const denied = { ok: false, error: { messageKey: 'AUTH_REQUIRED' } } as const;
      const user = rooms.getCurrentUser();
      if (!user || user.isGuest || rooms.getSessionStatus() !== 'active') return denied;
      const snapshot = rooms.getSessionSnapshot?.();
      const generation = rooms.getSessionApi()?.getGeneration?.();
      const isCurrent = () => rooms.getSessionStatus() === 'active'
        && rooms.getCurrentUser()?.id === user.id
        && rooms.getSessionSnapshot?.() === snapshot
        && rooms.getSessionApi()?.getGeneration?.() === generation;

      const response = await history.fetch();
      if (!isCurrent()) return denied;
      if (!response.ok) return response;

      for (const item of response.data.items) {
        if (item.scope !== 'personal') continue;
        const result = await history.delete(historyIdOf(item));
        if (!isCurrent()) return denied;
        if (!result.ok) return result;
      }
      return { ok: true, data: undefined };
    },
  };
}
