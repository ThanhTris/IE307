import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migratePrivateDatabase, PRIVATE_DATABASE_NAME } from './migrations';

export const OUTBOX_TTL_MS = 24 * 60 * 60 * 1000;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PRIVATE_ENTRIES_PER_IDENTITY = 50;

export type OutboxState = 'pending' | 'unknown' | 'acked';
export interface OutboxIntent<T = unknown> {
  identityId: string;
  roomId: string;
  round: 1 | 2;
  poolVersion: number;
  contractVersion: string;
  requestId: string;
  expectedVersion: number;
  createdAt: number;
  expiresAt: number;
  state: OutboxState;
  payload?: T;
}

export type OutboxInput<T = unknown> = Omit<OutboxIntent<T>, 'createdAt' | 'expiresAt' | 'state'>;
export interface OutboxSnapshot {
  roomId: string;
  round: 1 | 2;
  poolVersion: number;
  contractVersion: string;
  version: number;
  active: boolean;
  acknowledgedRequestIds: readonly string[];
}
export interface PrivateSnapshot<T = unknown> {
  identityId: string;
  roomId: string;
  contractVersion: string;
  fetchedAt: number;
  expiresAt: number;
  value: T;
}

export interface SecurePrivateStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: { keychainAccessible?: number }): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface SqlitePrivateDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: (string | number | null)[]): Promise<{ changes: number }>;
  getFirstAsync<T>(source: string, ...params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: (string | number | null)[]): Promise<T[]>;
}

interface EntryRow {
  record_id: string;
  kind: 'outbox' | 'cache';
  state: OutboxState | 'cached';
  created_at: number;
  expires_at: number;
}

const PAYLOAD_PREFIX = 'gcd.gm31.private.';

function createRecordId(): string {
  const part = () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  return `${Date.now().toString(16)}-${part()}-${part()}`;
}

function payloadKey(recordId: string): string { return `${PAYLOAD_PREFIX}${recordId}`; }

function parsePrivate<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as T; } catch { return undefined; }
}

function ballotPayload(payload: unknown): unknown {
  if (typeof payload === 'object' && payload !== null && 'votes' in payload) {
    return (payload as { votes: unknown }).votes;
  }
  return payload;
}

function validScope(identityId: string, roomId: string, contractVersion: string): boolean {
  return identityId.length > 0 && identityId.length <= 128
    && roomId.length > 0 && roomId.length <= 128
    && contractVersion.length > 0 && contractVersion.length <= 128;
}

export class DurableOutbox {
  private ready?: Promise<void>;

  constructor(
    private readonly database: SqlitePrivateDatabase,
    private readonly secureStore: SecurePrivateStore = SecureStore,
    private readonly clock: () => number = Date.now,
    private readonly maxEntriesPerIdentity = MAX_PRIVATE_ENTRIES_PER_IDENTITY,
  ) {}

  private async initialize(): Promise<void> {
    this.ready ??= migratePrivateDatabase(this.database as SQLiteDatabase);
    await this.ready;
  }

  private async rows(kind?: EntryRow['kind']): Promise<EntryRow[]> {
    await this.initialize();
    return kind
      ? this.database.getAllAsync<EntryRow>('SELECT * FROM gm31_private_entries WHERE kind = ? ORDER BY created_at ASC', kind)
      : this.database.getAllAsync<EntryRow>('SELECT * FROM gm31_private_entries ORDER BY created_at ASC');
  }

  private async deleteRow(row: EntryRow): Promise<void> {
    // Keep the SQLite handle when SecureStore refuses deletion so a later cleanup can retry.
    await this.secureStore.deleteItemAsync(payloadKey(row.record_id));
    await this.database.runAsync('DELETE FROM gm31_private_entries WHERE record_id = ?', row.record_id);
  }

  async enqueue<T>(input: OutboxInput<T>): Promise<OutboxIntent<T>> {
    if (!validScope(input.identityId, input.roomId, input.contractVersion)
      || !input.requestId || input.requestId.length > 128
      || !Number.isInteger(input.poolVersion) || input.poolVersion < 1
      || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0
      || (input.round !== 1 && input.round !== 2)) {
      throw new Error('OUTBOX_INVALID_INTENT');
    }
    const serializedPayload = JSON.stringify(input.payload);
    if (serializedPayload === undefined || serializedPayload.length > 64_000) throw new Error('OUTBOX_INVALID_PAYLOAD');
    await this.pruneExpired(input.identityId);

    const existing = await this.findByRequestId<T>(input.identityId, input.requestId);
    if (existing) {
      const sameIntent = existing.roomId === input.roomId
        && existing.round === input.round
        && existing.poolVersion === input.poolVersion
        && existing.contractVersion === input.contractVersion
        && existing.expectedVersion === input.expectedVersion
        && JSON.stringify(existing.payload) === serializedPayload;
      if (!sameIntent) throw new Error('OUTBOX_REQUEST_ID_CONFLICT');
      return existing;
    }

    const count = (await this.identityRows(input.identityId)).length;
    if (count >= this.maxEntriesPerIdentity) throw new Error('OUTBOX_CAPACITY_REACHED');

    const createdAt = this.clock();
    const intent: OutboxIntent<T> = { ...input, createdAt, expiresAt: createdAt + OUTBOX_TTL_MS, state: 'pending' };
    const recordId = createRecordId();
    await this.secureStore.setItemAsync(payloadKey(recordId), JSON.stringify(intent), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    try {
      await this.database.runAsync(
        'INSERT INTO gm31_private_entries(record_id, kind, state, created_at, expires_at) VALUES(?, ?, ?, ?, ?)',
        recordId, 'outbox', 'pending', createdAt, intent.expiresAt,
      );
    } catch (error) {
      await this.secureStore.deleteItemAsync(payloadKey(recordId)).catch(() => undefined);
      throw error;
    }
    return intent;
  }

  async list<T = unknown>(identityId: string): Promise<OutboxIntent<T>[]> {
    const rows = await this.rows('outbox');
    const intents: OutboxIntent<T>[] = [];
    for (const row of rows) {
      if (row.expires_at <= this.clock()) { await this.deleteRow(row); continue; }
      const intent = parsePrivate<OutboxIntent<T>>(await this.secureStore.getItemAsync(payloadKey(row.record_id)));
      if (!intent) { await this.deleteRow(row); continue; }
      if (intent.identityId === identityId) intents.push({ ...intent, state: row.state as OutboxState });
    }
    return intents;
  }

  async findEquivalent<T>(candidate: Omit<OutboxInput<T>, 'requestId'>): Promise<OutboxIntent<T> | undefined> {
    const serializedPayload = JSON.stringify(candidate.payload);
    return (await this.list<T>(candidate.identityId)).find(intent => intent.state !== 'acked'
      && intent.roomId === candidate.roomId
      && intent.round === candidate.round
      && intent.poolVersion === candidate.poolVersion
      && intent.contractVersion === candidate.contractVersion
      && JSON.stringify(ballotPayload(intent.payload)) === JSON.stringify(ballotPayload(JSON.parse(serializedPayload))));
  }

  async markUnknown(identityId: string, requestId: string): Promise<void> {
    await this.updateState(identityId, requestId, 'unknown');
  }

  async acknowledge(identityId: string, requestId: string): Promise<void> {
    const found = await this.findRow(identityId, requestId);
    if (!found) return;
    const scrubbed = { ...found.intent, state: 'acked' as const, payload: undefined };
    await this.secureStore.setItemAsync(payloadKey(found.row.record_id), JSON.stringify(scrubbed), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await this.database.runAsync('UPDATE gm31_private_entries SET state = ? WHERE record_id = ?', 'acked', found.row.record_id);
  }

  async remove(identityId: string, requestId: string): Promise<void> {
    const found = await this.findRow(identityId, requestId);
    if (found) await this.deleteRow(found.row);
  }

  /** Fetch a canonical server snapshot before returning any retry candidate. */
  async reconcileBeforeReplay<T>(identityId: string, fetchSnapshot: () => Promise<OutboxSnapshot | null>): Promise<OutboxIntent<T>[]> {
    const snapshot = await fetchSnapshot();
    if (!snapshot) return [];
    const intents = await this.list<T>(identityId);
    const replay: OutboxIntent<T>[] = [];
    for (const intent of intents) {
      if (snapshot.acknowledgedRequestIds.includes(intent.requestId)) {
        await this.acknowledge(identityId, intent.requestId);
        continue;
      }
      const scopeMatches = snapshot.active
        && intent.roomId === snapshot.roomId
        && intent.round === snapshot.round
        && intent.poolVersion === snapshot.poolVersion
        && intent.contractVersion === snapshot.contractVersion;
      if (!scopeMatches) {
        await this.remove(identityId, intent.requestId);
        continue;
      }
      if (intent.state === 'pending') replay.push(intent);
      // Unknown ACKs remain for explicit user action; never auto-replay.
    }
    return replay;
  }

  async cacheSnapshot<T>(snapshot: Omit<PrivateSnapshot<T>, 'fetchedAt' | 'expiresAt'> & { fetchedAt?: number }): Promise<void> {
    if (!validScope(snapshot.identityId, snapshot.roomId, snapshot.contractVersion)) throw new Error('CACHE_INVALID_SCOPE');
    const createdAt = snapshot.fetchedAt ?? this.clock();
    const value: PrivateSnapshot<T> = { ...snapshot, fetchedAt: createdAt, expiresAt: createdAt + CACHE_TTL_MS };
    const rowId = createRecordId();
    await this.pruneExpired(snapshot.identityId);
    const existing = await this.readCacheRows(snapshot.identityId);
    for (const row of existing.filter(entry => entry.roomId === snapshot.roomId && entry.contractVersion === snapshot.contractVersion)) {
      await this.deleteRow(row.row);
    }
    while ((await this.identityRows(snapshot.identityId)).length >= this.maxEntriesPerIdentity) {
      const oldestCache = (await this.readCacheRows(snapshot.identityId))[0];
      if (!oldestCache) throw new Error('PRIVATE_STORE_CAPACITY_REACHED');
      await this.deleteRow(oldestCache.row);
    }
    await this.secureStore.setItemAsync(payloadKey(rowId), JSON.stringify(value), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    try {
      await this.database.runAsync('INSERT INTO gm31_private_entries(record_id, kind, state, created_at, expires_at) VALUES(?, ?, ?, ?, ?)', rowId, 'cache', 'cached', createdAt, value.expiresAt);
    } catch (error) {
      await this.secureStore.deleteItemAsync(payloadKey(rowId)).catch(() => undefined);
      throw error;
    }
  }

  async readSnapshotCache<T>(identityId: string, roomId: string, contractVersion: string): Promise<PrivateSnapshot<T> | undefined> {
    if (!validScope(identityId, roomId, contractVersion)) return undefined;
    const rows = await this.rows('cache');
    let latest: PrivateSnapshot<T> | undefined;
    for (const row of rows) {
      if (row.expires_at <= this.clock()) { await this.deleteRow(row); continue; }
      const value = parsePrivate<PrivateSnapshot<T>>(await this.secureStore.getItemAsync(payloadKey(row.record_id)));
      if (!value) { await this.deleteRow(row); continue; }
      if (value.identityId === identityId && value.roomId === roomId && value.contractVersion === contractVersion
        && (!latest || value.fetchedAt > latest.fetchedAt)) latest = value;
    }
    return latest;
  }

  async clearSnapshotCache(identityId: string, roomId: string, contractVersion: string): Promise<void> {
    for (const row of await this.rows('cache')) {
      const value = parsePrivate<PrivateSnapshot<unknown>>(await this.secureStore.getItemAsync(payloadKey(row.record_id)));
      if (value?.identityId === identityId && value.roomId === roomId && value.contractVersion === contractVersion) {
        await this.deleteRow(row);
      }
    }
  }

  async clearIdentity(identityId: string): Promise<void> {
    for (const row of [...await this.rows('outbox'), ...await this.rows('cache')]) {
      const raw = await this.secureStore.getItemAsync(payloadKey(row.record_id));
      const value = parsePrivate<{ identityId?: string }>(raw);
      if (value?.identityId === identityId) await this.deleteRow(row);
    }
  }

  async pruneExpired(identityId?: string): Promise<void> {
    for (const row of await this.rows()) {
      if (row.expires_at > this.clock()) continue;
      if (!identityId) { await this.deleteRow(row); continue; }
      const value = parsePrivate<{ identityId?: string }>(await this.secureStore.getItemAsync(payloadKey(row.record_id)));
      if (!value || value.identityId === identityId) await this.deleteRow(row);
    }
  }

  private async updateState(identityId: string, requestId: string, state: 'pending' | 'unknown'): Promise<void> {
    const found = await this.findRow(identityId, requestId);
    if (!found || found.row.state === 'acked') return;
    await this.secureStore.setItemAsync(payloadKey(found.row.record_id), JSON.stringify({ ...found.intent, state }), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await this.database.runAsync('UPDATE gm31_private_entries SET state = ? WHERE record_id = ?', state, found.row.record_id);
  }

  private async findByRequestId<T>(identityId: string, requestId: string): Promise<OutboxIntent<T> | undefined> {
    return (await this.list<T>(identityId)).find(intent => intent.requestId === requestId);
  }

  private async findRow(identityId: string, requestId: string): Promise<{ row: EntryRow; intent: OutboxIntent } | undefined> {
    for (const row of await this.rows('outbox')) {
      const intent = parsePrivate<OutboxIntent>(await this.secureStore.getItemAsync(payloadKey(row.record_id)));
      if (intent?.identityId === identityId && intent.requestId === requestId) return { row, intent: { ...intent, state: row.state as OutboxState } };
    }
    return undefined;
  }

  private async readCacheRows(identityId: string): Promise<{ row: EntryRow; roomId: string; contractVersion: string }[]> {
    const rows: { row: EntryRow; roomId: string; contractVersion: string }[] = [];
    for (const row of await this.rows('cache')) {
      const value = parsePrivate<{ identityId?: string; roomId?: string; contractVersion?: string }>(await this.secureStore.getItemAsync(payloadKey(row.record_id)));
      if (value?.identityId === identityId && value.roomId && value.contractVersion) rows.push({ row, roomId: value.roomId, contractVersion: value.contractVersion });
    }
    return rows;
  }

  private async identityRows(identityId: string): Promise<EntryRow[]> {
    const matches: EntryRow[] = [];
    for (const row of await this.rows()) {
      const value = parsePrivate<{ identityId?: string }>(await this.secureStore.getItemAsync(payloadKey(row.record_id)));
      if (value?.identityId === identityId) matches.push(row);
    }
    return matches;
  }
}

let defaultOutbox: DurableOutbox | undefined;
export function getDurableOutbox(): DurableOutbox {
  if (!defaultOutbox) {
    const db = import('expo-sqlite').then(SQLite => SQLite.openDatabaseAsync(PRIVATE_DATABASE_NAME));
    const lazyDatabase = new LazySqliteDatabase(db);
    defaultOutbox = new DurableOutbox(lazyDatabase);
  }
  return defaultOutbox;
}

class LazySqliteDatabase implements SqlitePrivateDatabase {
  constructor(private readonly database: Promise<SQLiteDatabase>) {}
  async execAsync(sql: string) { return (await this.database).execAsync(sql); }
  async runAsync(sql: string, ...params: (string | number | null)[]) { return (await this.database).runAsync(sql, ...params); }
  async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) { return (await this.database).getFirstAsync<T>(sql, ...params); }
  async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) { return (await this.database).getAllAsync<T>(sql, ...params); }
}
