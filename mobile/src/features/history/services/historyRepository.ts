import type { CanonicalHistoryItem, HistoryItem, ReadResult, UpdateHistoryConsentRequest, WriteResult } from '../../../data/api/contracts';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../shared/services/sessionApi';
import { getDurableOutbox } from '../../../data/local/outbox';

const HISTORY_CACHE_ROOM = 'private-history';
const HISTORY_CACHE_CONTRACT = 'gm28-history-v1';

type HistoryRow = CanonicalHistoryItem | HistoryItem;
interface IdentityEpoch { userId: string; repositoryRevision: number; authGeneration: number }
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

  const currentIdentity = (): IdentityEpoch | undefined => {
    const session = roomRepository.getSessionApi();
    if (session && roomRepository.getSessionStatus() !== 'active') return undefined;
    const userId = roomRepository.getCurrentUser()?.id;
    if (!userId) return undefined;
    return {
      userId,
      repositoryRevision: roomRepository.getIdentityRevision?.() ?? 0,
      authGeneration: session?.getGeneration?.() ?? 0,
    };
  };
  const sameIdentityEpoch = (identity: IdentityEpoch) => {
    const current = currentIdentity();
    return current?.userId === identity.userId
      && current.repositoryRevision === identity.repositoryRevision
      && current.authGeneration === identity.authGeneration;
  };
  const isCurrent = (identity: IdentityEpoch, requestGeneration: number) =>
    sameIdentityEpoch(identity) && generation === requestGeneration;
  const enqueueCacheMutation = (operation: () => Promise<void>): Promise<void> => {
    const next = cacheQueue.then(operation, operation);
    cacheQueue = next.catch(() => undefined);
    return next;
  };
  const authError = <T>(): ReadResult<T> => ({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });

  return {
    cached: () => {
      const identity = currentIdentity();
      return identity ? cache.get(identity.userId) : undefined;
    },
    async cachedDurable() {
      const identity = currentIdentity();
      if (!identity) return undefined;
      const requestGeneration = generation;
      const entry = await durableCache.readSnapshotCache<HistorySnapshot>(identity.userId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT);
      return isCurrent(identity, requestGeneration) ? entry?.value : undefined;
    },
    async fetch() {
      const identity = currentIdentity();
      if (!identity) return authError<HistorySnapshot>();
      const requestGeneration = generation;
      const result = await callSessionApi(roomRepository, client => client.getCanonicalHistory
        ? client.getCanonicalHistory()
        : Promise.resolve({ ok: false as const, error: { messageKey: 'MALFORMED_RESPONSE' as const } }));
      if (!isCurrent(identity, requestGeneration)) return authError<HistorySnapshot>();
      if (!result.ok) return result;

      const snapshot: HistorySnapshot = {
        items: result.data.items,
        fetchedAt: new Date().toISOString(),
      };
      await enqueueCacheMutation(async () => {
        if (!isCurrent(identity, requestGeneration)) return;
        cache.set(identity.userId, snapshot);
        await durableCache.cacheSnapshot({
          identityId: identity.userId,
          roomId: HISTORY_CACHE_ROOM,
          contractVersion: HISTORY_CACHE_CONTRACT,
          value: snapshot,
        }).catch(() => undefined);
      });
      if (!isCurrent(identity, requestGeneration)) return authError<HistorySnapshot>();
      return { ok: true, data: snapshot };
    },
    async updateConsent(request) {
      const identity = currentIdentity();
      if (!identity) return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      const result = await callSessionApi(roomRepository, client => client.updateHistoryConsent({
        ...request,
        requestId: createDurableRequestId('history_consent'),
      }));
      if (result.ok && sameIdentityEpoch(identity)) {
        generation++;
        cache.delete(identity.userId);
        await enqueueCacheMutation(() => durableCache.clearSnapshotCache(identity.userId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT));
      }
      return result;
    },
    async delete(historyId) {
      const identity = currentIdentity();
      if (!identity) return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      const result = await callSessionApi(roomRepository, client => client.deleteHistory(historyId, createDurableRequestId('history_delete')));
      if (result.ok && sameIdentityEpoch(identity)) {
        generation++;
        const current = cache.get(identity.userId);
        if (current) {
          const next = { ...current, items: current.items.filter(item => historyIdOf(item) !== historyId) };
          cache.set(identity.userId, next);
        }
        await enqueueCacheMutation(async () => {
          const durable = await durableCache.readSnapshotCache<HistorySnapshot>(identity.userId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT).catch(() => undefined);
          if (!durable) return;
          await durableCache.cacheSnapshot({
            identityId: identity.userId,
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
      const identity = currentIdentity();
      if (!identity) return;
      cache.delete(identity.userId);
      void enqueueCacheMutation(() => durableCache.clearSnapshotCache(identity.userId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT));
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
