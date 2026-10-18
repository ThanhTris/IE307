import type { HistoryItem, ReadResult, UpdateHistoryConsentRequest, WriteResult } from '../../../data/api/contracts';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../shared/services/sessionApi';

export interface HistorySnapshot {
  items: HistoryItem[];
  fetchedAt: string;
}

export interface HistoryCache {
  get(userId: string): HistorySnapshot | undefined;
  set(userId: string, snapshot: HistorySnapshot): void;
  delete(userId: string): void;
  clear(): void;
}

export interface HistoryRepository {
  cached(): HistorySnapshot | undefined;
  fetch(): Promise<ReadResult<HistorySnapshot>>;
  updateConsent(request: Omit<UpdateHistoryConsentRequest, 'requestId'>): Promise<WriteResult<void>>;
  delete(historyId: string): Promise<WriteResult<void>>;
  invalidate(): void;
}

class MemoryHistoryCache implements HistoryCache {
  private readonly entries = new Map<string, HistorySnapshot>();
  get(userId: string) { return this.entries.get(userId); }
  set(userId: string, snapshot: HistorySnapshot) { this.entries.set(userId, snapshot); }
  delete(userId: string) { this.entries.delete(userId); }
  clear() { this.entries.clear(); }
}

const privateHistoryCache = new MemoryHistoryCache();

/** Called by session logout cleanup; no persistent store is added in this task. */
export function clearPrivateHistoryCache(): void {
  privateHistoryCache.clear();
}

export function createHistoryRepository(
  roomRepository: RoomRepository,
  cache: HistoryCache = privateHistoryCache,
): HistoryRepository {
  const userId = roomRepository.getCurrentUser()?.id;
  return {
    cached: () => userId ? cache.get(userId) : undefined,
    async fetch() {
      if (!userId) return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      const [personal, group] = await Promise.all([
        callSessionApi(roomRepository, client => client.getHistory('personal')),
        callSessionApi(roomRepository, client => client.getHistory('group')),
      ]);
      if (!personal.ok) return personal;
      if (!group.ok) return group;
      const snapshot: HistorySnapshot = {
        items: [...personal.data, ...group.data].sort((a, b) => b.mealDate.localeCompare(a.mealDate)),
        fetchedAt: new Date().toISOString(),
      };
      cache.set(userId, snapshot);
      return { ok: true, data: snapshot };
    },
    async updateConsent(request) {
      const result = await callSessionApi(roomRepository, client => client.updateHistoryConsent({ ...request, requestId: createDurableRequestId('history_consent') }));
      if (result.ok && userId) cache.delete(userId);
      return result;
    },
    async delete(historyId) {
      const result = await callSessionApi(roomRepository, client => client.deleteHistory(historyId, createDurableRequestId('history_delete')));
      if (result.ok && userId) {
        const current = cache.get(userId);
        if (current) cache.set(userId, { ...current, items: current.items.filter(item => item.id !== historyId) });
      }
      return result;
    },
    invalidate: () => {
      if (userId) cache.delete(userId);
    },
  };
}
