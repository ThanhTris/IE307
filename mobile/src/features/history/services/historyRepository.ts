import type { ErrorCode, ReadResult, UpdateHistoryConsentRequest, WriteResult } from '../../../data/api/contracts';
import { settleWithin } from '../../../data/local/bestEffort';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import { callSessionApi } from '../../rooms/services/sessionApi';
import { parseCanonicalHistoryPage } from './historyWireGuard';
import type { CanonicalHistoryItem, HistoryRow } from './historyTypes';

const HISTORY_CACHE_ROOM = 'private-history';
const HISTORY_CACHE_CONTRACT = 'gm28-history-v1';

interface IdentityEpoch {
  userId: string;
  sessionSnapshot: ReturnType<RoomRepository['getSessionSnapshot']> | undefined;
  authGeneration: number;
  sharedInvalidation: number;
}
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
const sharedInvalidation = new Map<string, number>();
const sharedCacheQueues = new Map<string, Promise<void>>();
const cacheEntryGenerations = new WeakMap<HistoryCache, Map<string, number>>();
const HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function queueSharedCacheMutation(identityId: string, operation: () => Promise<void>): Promise<void> {
  const previous = sharedCacheQueues.get(identityId) ?? Promise.resolve();
  const next = previous.then(operation, operation);
  sharedCacheQueues.set(identityId, next.catch(() => undefined));
  return next;
}

function markCacheGeneration(cache: HistoryCache, identityId: string): void {
  if (!sharedInvalidation.has(identityId)) sharedInvalidation.set(identityId, 0);
  let generations = cacheEntryGenerations.get(cache);
  if (!generations) { generations = new Map(); cacheEntryGenerations.set(cache, generations); }
  generations.set(identityId, sharedInvalidation.get(identityId) ?? 0);
}

function cacheGenerationIsCurrent(cache: HistoryCache, identityId: string): boolean {
  const generation = cacheEntryGenerations.get(cache)?.get(identityId);
  return generation === undefined || generation === (sharedInvalidation.get(identityId) ?? 0);
}

const noDurableHistoryStore: DurableHistoryStore = {
  async cacheSnapshot() {},
  async readSnapshotCache() { return undefined; },
  async clearSnapshotCache() {},
};



/**
 * The device cache is best effort. If local storage stalls, history must still finish loading from the
 * server instead of waiting forever in the per-identity cache queue.
 */
function withDurableTimeouts(store: DurableHistoryStore): DurableHistoryStore {
  return {
    cacheSnapshot<T>(snapshot: { identityId: string; roomId: string; contractVersion: string; value: T }) {
      return settleWithin(store.cacheSnapshot<T>(snapshot), undefined);
    },
    readSnapshotCache<T>(identityId: string, roomId: string, contractVersion: string) {
      return settleWithin<{ value: T } | undefined>(store.readSnapshotCache<T>(identityId, roomId, contractVersion), undefined);
    },
    clearSnapshotCache(identityId: string, roomId: string, contractVersion: string) {
      return settleWithin(store.clearSnapshotCache(identityId, roomId, contractVersion), undefined);
    },
  };
}

/** Clears memory state and advances shared epochs so in-flight reads cannot restore logged-out data. */
export function clearPrivateHistoryCache(): void {
  for (const [userId, epoch] of sharedInvalidation) sharedInvalidation.set(userId, epoch + 1);
  privateHistoryCache.clear();
}

export function createHistoryRepository(
  roomRepository: RoomRepository,
  cache: HistoryCache = privateHistoryCache,
  durableCacheOverride?: DurableHistoryStore,
): HistoryRepository {
  const durableCache = withDurableTimeouts(durableCacheOverride ?? noDurableHistoryStore);
  let generation = 0;
  const cacheQueueByIdentity = (identityId: string, operation: () => Promise<void>) =>
    queueSharedCacheMutation(identityId, operation);

  const currentIdentity = (): IdentityEpoch | undefined => {
    const session = roomRepository.getSessionApi();
    if (session && roomRepository.getSessionStatus() !== 'active') return undefined;
    const userId = roomRepository.getCurrentUser()?.id;
    if (!userId) return undefined;
    if (!sharedInvalidation.has(userId)) sharedInvalidation.set(userId, 0);
    return {
      userId,
      sessionSnapshot: roomRepository.getSessionSnapshot?.(),
      authGeneration: session?.getGeneration?.() ?? 0,
      sharedInvalidation: sharedInvalidation.get(userId) ?? 0,
    };
  };
  const sameAuthenticatedSession = (identity: IdentityEpoch) => {
    const current = currentIdentity();
    return current?.userId === identity.userId
      && current.authGeneration === identity.authGeneration
      && current.sessionSnapshot === identity.sessionSnapshot;
  };
  const sameIdentityEpoch = (identity: IdentityEpoch) => sameAuthenticatedSession(identity)
    && (sharedInvalidation.get(identity.userId) ?? 0) === identity.sharedInvalidation;
  const isCurrent = (identity: IdentityEpoch, requestGeneration: number) =>
    sameIdentityEpoch(identity) && generation === requestGeneration;
  const invalidateUser = (userId: string, clearAll: boolean, deletedHistoryId?: string) => {
    generation++;
    sharedInvalidation.set(userId, (sharedInvalidation.get(userId) ?? 0) + 1);
    if (clearAll) cache.delete(userId);
    else {
      const current = cache.get(userId);
      if (current) cache.set(userId, { ...current, items: current.items.filter(item => !isExpired(item) && historyIdOf(item) !== deletedHistoryId) });
    }
    markCacheGeneration(cache, userId);
    return cacheQueueByIdentity(userId, async () => {
      if (clearAll) {
        await durableCache.clearSnapshotCache(userId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT);
        return;
      }
      const durable = await durableCache.readSnapshotCache<HistorySnapshot>(userId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT).catch(() => undefined);
      if (!durable) return;
      const retained = durable.value.items.filter(item => !isExpired(item) && historyIdOf(item) !== deletedHistoryId);
      await durableCache.cacheSnapshot({
        identityId: userId,
        roomId: HISTORY_CACHE_ROOM,
        contractVersion: HISTORY_CACHE_CONTRACT,
        value: { ...durable.value, items: retained },
      });
    });
  };
  const snapshotIsFresh = (snapshot: HistorySnapshot | undefined): snapshot is HistorySnapshot => {
    if (!snapshot) return false;
    const fetchedAt = Date.parse(snapshot.fetchedAt);
    if (!Number.isFinite(fetchedAt) || fetchedAt > Date.now() || Date.now() - fetchedAt > HISTORY_MAX_AGE_MS) return false;
    return true;
  };
  const authError = <T>(): ReadResult<T> => ({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });

  return {
    cached: () => {
      const identity = currentIdentity();
      if (!identity) return undefined;
      if (!cacheGenerationIsCurrent(cache, identity.userId)) { cache.delete(identity.userId); return undefined; }
      const snapshot = cache.get(identity.userId);
      if (!snapshotIsFresh(snapshot)) { cache.delete(identity.userId); return undefined; }
      return { ...snapshot, items: snapshot.items.filter(item => !isExpired(item)) };
    },
    async cachedDurable() {
      const identity = currentIdentity();
      if (!identity) return undefined;
      const requestGeneration = generation;
      await (sharedCacheQueues.get(identity.userId) ?? Promise.resolve()).catch(() => undefined);
      if (!isCurrent(identity, requestGeneration)) return undefined;
      const entry = await durableCache.readSnapshotCache<HistorySnapshot>(identity.userId, HISTORY_CACHE_ROOM, HISTORY_CACHE_CONTRACT);
      if (!isCurrent(identity, requestGeneration) || !snapshotIsFresh(entry?.value)) return undefined;
      return { ...entry!.value, items: entry!.value.items.filter(item => !isExpired(item)) };
    },
    async fetch() {
      const identity = currentIdentity();
      if (!identity) return authError<HistorySnapshot>();
      const requestGeneration = generation;
      const result = await callSessionApi(roomRepository, async client => {
        if (!client.callRpc) return { ok: false as const, error: { messageKey: 'NETWORK_ERROR' as ErrorCode } };
        const raw = await client.callRpc<unknown>('dish_session', {
          command: 'history',
          payload: { contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement' },
        });
        if (!raw || typeof raw !== 'object' || Array.isArray(raw) || typeof (raw as { ok?: unknown }).ok !== 'boolean') {
          return { ok: false as const, error: { messageKey: 'MALFORMED_RESPONSE' as ErrorCode } };
        }
        const envelope = raw as { ok: boolean; data?: unknown; error?: { messageKey?: unknown; code?: unknown } };
        if (!envelope.ok) {
          const key = typeof envelope.error?.messageKey === 'string' ? envelope.error.messageKey : envelope.error?.code;
          const allowed: ErrorCode[] = ['AUTH_REQUIRED', 'NOT_MEMBER', 'CONSENT_REQUIRED', 'INVALID_INPUT', 'ROOM_EXPIRED', 'ROOM_NOT_FOUND', 'RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT', 'UNKNOWN_ERROR', 'CONTRACT_MISMATCH', 'UNSUPPORTED_FIELD', 'MALFORMED_RESPONSE'];
          return { ok: false as const, error: { messageKey: allowed.includes(key as ErrorCode) ? key as ErrorCode : 'UNKNOWN_ERROR' } };
        }
        const page = parseCanonicalHistoryPage(envelope.data);
        return page
          ? { ok: true as const, data: page }
          : { ok: false as const, error: { messageKey: 'MALFORMED_RESPONSE' as ErrorCode } };
      });
      if (!result.ok) {
        if (['AUTH_REQUIRED', 'NOT_MEMBER', 'CONSENT_REQUIRED'].includes(result.error.messageKey)) {
          await invalidateUser(identity.userId, true);
        }
        return result;
      }
      if (!isCurrent(identity, requestGeneration)) return authError<HistorySnapshot>();

      const snapshot: HistorySnapshot = {
        items: result.data.items.filter(item => !isExpired(item)),
        fetchedAt: new Date().toISOString(),
      };
      await cacheQueueByIdentity(identity.userId, async () => {
        if (!isCurrent(identity, requestGeneration)) return;
        cache.set(identity.userId, snapshot);
        markCacheGeneration(cache, identity.userId);
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
      if (result.ok || (!result.ok && ['AUTH_REQUIRED', 'NOT_MEMBER', 'CONSENT_REQUIRED'].includes(result.error.messageKey))) {
        await invalidateUser(identity.userId, true);
      }
      return result;
    },
    async delete(historyId) {
      const identity = currentIdentity();
      if (!identity) return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      const result = await callSessionApi(roomRepository, client => client.deleteHistory(historyId, createDurableRequestId('history_delete')));
      if (result.ok) {
        // Do not resurrect a late snapshot from a sibling adapter after deleting one item.
        await invalidateUser(identity.userId, false, historyId);
      } else if (['AUTH_REQUIRED', 'NOT_MEMBER', 'CONSENT_REQUIRED'].includes(result.error.messageKey)) {
        await invalidateUser(identity.userId, true);
      }
      return result;
    },
    invalidate() {
      const identity = currentIdentity();
      if (!identity) return;
      void invalidateUser(identity.userId, true);
    },
  };
}

function isExpired(item: HistoryRow): boolean {
  if (!('expiresAt' in item)) return false;
  const expiry = Date.parse(item.expiresAt);
  return !Number.isFinite(expiry) || expiry <= Date.now();
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
