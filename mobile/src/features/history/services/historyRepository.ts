import type { CanonicalHistoryItem, HistoryItem, ReadResult, UpdateHistoryConsentRequest, WriteResult } from '../../../data/api/contracts';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../shared/services/sessionApi';
import { getDurableOutbox } from '../../../data/local/outbox';

const HISTORY_CACHE_ROOM = 'private-history';
const HISTORY_CACHE_CONTRACT = 'gm28-history-v1';

type HistoryRow = CanonicalHistoryItem | HistoryItem;
export interface HistorySnapshot { items: HistoryRow[]; fetchedAt: string }
export interface HistoryCache {
  get(userId: string): HistorySnapshot | undefined;
  set(userId: string, snapshot: HistorySnapshot): void;
  delete(userId: string): void;
  clear(): void;
}
export interface HistoryRepository {
  cached(): HistorySnapshot | undefined;
  cachedDurable(): Promise<HistorySnapshot | undefined>;
  fetch(): Promise<ReadResult<HistorySnapshot>>;
  updateConsent(request: Omit<UpdateHistoryConsentRequest, 'requestId'>): Promise<WriteResult<void>>;
  delete(historyId: string): Promise<WriteResult<void>>;
  invalidate(): void;
}
export interface DurableHistoryStore {
  cacheSnapshot<T>(snapshot: { identityId: string; roomId: string; contractVersion: string; value: T }): Promise<void>;
  readSnapshotCache<T>(identityId: string, roomId: string, contractVersion: string): Promise<{ value: T } | undefined>;
  clearSnapshotCache(identityId: string, roomId: string, contractVersion: string): Promise<void>;
}

class MemoryHistoryCache implements HistoryCache {
  private readonly entries = new Map<string, HistorySnapshot>();
  get(userId: string) { return this.entries.get(userId); }
  set(userId: string, snapshot: HistorySnapshot) { this.entries.set(userId, snapshot); }
  delete(userId: string) { this.entries.delete(userId); }
  clear() { this.entries.clear(); }
}

const privateHistoryCache = new MemoryHistoryCache();

const mockDurableHistoryStore: DurableHistoryStore = {
  async cacheSnapshot() {},
  async readSnapshotCache() { return undefined; },
  async clearSnapshotCache() {},
};

/** Clears only the in-memory projection; durable records are cleared by identity on logout. */
export function clearPrivateHistoryCache(): void { privateHistoryCache.clear(); }

export function createHistoryRepository(
  roomRepository: RoomRepository,
  cache: HistoryCache = privateHistoryCache,
  durableCacheOverride?: DurableHistoryStore,
): HistoryRepository {
  const durableCache = durableCacheOverride
    ?? (roomRepository.getSessionApi() ? getDurableOutbox() : mockDurableHistoryStore);
  let generation = 0;
  let cacheQueue: Promise<void> = Promise.resolve();

  const currentIdentity = (): string | undefined => {
    if (roomRepository.getSessionApi() && roomRepository.getSessionStatus() !== 'active') return undefined;
    return roomRepository.getCurrentUser()?.id || undefined;
  };
  const isCurrent = (identityId: string, requestGeneration: number) =>
    currentIdentity() === identityId && generation === requestGeneration;
  const enqueueCacheMutation = (operation: () => Promise<void>): Promise<void> => {
    const next = cacheQueue.then(operation, operation);
    cacheQueue = next.catch(() => undefined);
    return next;
  };
  const authError = <T>(): ReadResult<T> => ({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });

  return {
    cached: () => {
      const identityId = currentIdentity();
      return identityId ? cache.get(identityId) : undefined;
    },
    async cachedDurable() {
      const identityId = currentIdentity();
      if (!identityId) return undefined;
      const requestGeneration = generation;
      const entry = await durableCache.readSnapshotCache<HistorySnapshot>(identityId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT);
      return isCurrent(identityId, requestGeneration) ? entry?.value : undefined;
    },
    async fetch() {
      const identityId = currentIdentity();
      if (!identityId) return authError<HistorySnapshot>();
      const requestGeneration = generation;
      const result = await callSessionApi(roomRepository, client => client.getCanonicalHistory
        ? client.getCanonicalHistory()
        : Promise.resolve({ ok: false as const, error: { messageKey: 'MALFORMED_RESPONSE' as const } }));
      if (!isCurrent(identityId, requestGeneration)) return authError<HistorySnapshot>();
      if (!result.ok) return result;

      const snapshot: HistorySnapshot = {
        items: result.data.items,
        fetchedAt: new Date().toISOString(),
      };
      await enqueueCacheMutation(async () => {
        if (!isCurrent(identityId, requestGeneration)) return;
        cache.set(identityId, snapshot);
        await durableCache.cacheSnapshot({
          identityId,
          roomId: HISTORY_CACHE_ROOM,
          contractVersion: HISTORY_CACHE_CONTRACT,
          value: snapshot,
        }).catch(() => undefined);
      });
      if (!isCurrent(identityId, requestGeneration)) return authError<HistorySnapshot>();
      return { ok: true, data: snapshot };
    },
    async updateConsent(request) {
      const identityId = currentIdentity();
      if (!identityId) return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      const result = await callSessionApi(roomRepository, client => client.updateHistoryConsent({
        ...request,
        requestId: createDurableRequestId('history_consent'),
      }));
      if (result.ok && currentIdentity() === identityId) {
        generation++;
        cache.delete(identityId);
        await enqueueCacheMutation(() => durableCache.clearSnapshotCache(identityId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT));
      }
      return result;
    },
    async delete(historyId) {
      const identityId = currentIdentity();
      if (!identityId) return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      const result = await callSessionApi(roomRepository, client => client.deleteHistory(historyId, createDurableRequestId('history_delete')));
      if (result.ok && currentIdentity() === identityId) {
        generation++;
        const current = cache.get(identityId);
        if (current) {
          const next = { ...current, items: current.items.filter(item => historyIdOf(item) !== historyId) };
          cache.set(identityId, next);
        }
        await enqueueCacheMutation(async () => {
          const durable = await durableCache.readSnapshotCache<HistorySnapshot>(identityId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT).catch(() => undefined);
          if (!durable) return;
          await durableCache.cacheSnapshot({
            identityId,
            roomId: HISTORY_CACHE_ROOM,
            contractVersion: HISTORY_CACHE_CONTRACT,
            value: { ...durable.value, items: durable.value.items.filter(item => historyIdOf(item) !== historyId) },
          }).catch(() => undefined);
        });
      }
      return result;
    },
    invalidate() {
      generation++;
      const identityId = currentIdentity();
      if (!identityId) return;
      cache.delete(identityId);
      void enqueueCacheMutation(() => durableCache.clearSnapshotCache(identityId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT));
    },
  };
}

export function historyIdOf(item: HistoryRow): string {
  return 'historyId' in item ? item.historyId : item.id;
}

export function historyTitle(item: HistoryRow): string {
  if ('historyId' in item) {
    if (item.result.status === 'NO_CONSENSUS') return 'Chưa có món được chọn';
    return item.result.winner?.name ?? 'Bữa ăn đã chốt';
  }
  return item.winnerName ?? 'Bữa ăn đã chốt';
}

export function isCanonicalHistoryRow(item: HistoryRow): item is CanonicalHistoryItem {
  return 'historyId' in item;
}
