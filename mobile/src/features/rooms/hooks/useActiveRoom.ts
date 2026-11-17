import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import type { ActiveRoomReader } from '../services/activeRoom';
import { useRead } from './useRoomEntry';

export const activeRoomBackendCopy = 'Máy chủ cần được cập nhật để tìm phòng đang tham gia.';

export function useActiveRoom(repository: Partial<ActiveRoomReader>, userId?: string, enabled = true, revision = 0) {
  const load = useCallback(() => {
    if (!enabled || !userId) return Promise.resolve({ ok: false as const, error: { messageKey: 'AUTH_REQUIRED' as const } });
    return repository.getActiveRoom?.()
      ?? Promise.resolve({ ok: false as const, error: { messageKey: 'CONTRACT_MISMATCH' as const } });
  }, [repository, userId, enabled]);
  const { retry, ...state } = useRead(load, enabled && !!userId, revision);
  useEffect(() => {
    if (!enabled || !userId) return;
    const subscription = AppState.addEventListener('change', status => {
      if (status === 'active') retry();
    });
    return () => subscription.remove();
  }, [enabled, userId, retry]);
  return { ...state, retry };
}
