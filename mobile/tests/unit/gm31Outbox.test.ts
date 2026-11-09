import {
  DurableOutbox,
  type SecurePrivateStore,
  type SqlitePrivateDatabase,
} from '../../src/data/local/outbox';
import { acknowledgedRequestIds } from '../../src/features/voting/services/voteRepository';

type Row = { record_id: string; kind: 'outbox' | 'cache'; state: 'pending' | 'unknown' | 'acked' | 'cached'; created_at: number; expires_at: number };

class MemoryDatabase implements SqlitePrivateDatabase {
  rows = new Map<string, Row>();
  pendingCleanup = new Set<string>();
  pendingIdentities = new Set<string>();
  version = 0;

  async execAsync(sql: string) {
    const match = /PRAGMA user_version\s*=\s*(\d+)/i.exec(sql);
    if (match) this.version = Number(match[1]);
  }
  async runAsync(sql: string, ...params: (string | number | null)[]) {
    if (sql.startsWith('INSERT INTO gm31_private_entries')) {
      const [recordId, kind, state, createdAt, expiresAt] = params as [string, Row['kind'], Row['state'], number, number];
      this.rows.set(recordId, { record_id: recordId, kind, state, created_at: createdAt, expires_at: expiresAt });
      return { changes: 1 };
    }
    if (sql.startsWith('UPDATE gm31_private_entries')) {
      const [state, recordId] = params as [Row['state'], string];
      const row = this.rows.get(recordId);
      if (row) row.state = state;
      return { changes: row ? 1 : 0 };
    }
    if (sql.startsWith('DELETE FROM gm31_private_entries')) {
      const [recordId] = params as [string];
      const changed = this.rows.delete(recordId);
      return { changes: Number(changed) };
    }
    if (sql.startsWith('INSERT OR IGNORE INTO gm31_pending_private_deletion')) {
      this.pendingCleanup.add(params[0] as string);
      return { changes: 1 };
    }
    if (sql.startsWith('INSERT OR IGNORE INTO gm31_pending_identity_cleanup')) {
      this.pendingIdentities.add(params[0] as string);
      return { changes: 1 };
    }
    if (sql.startsWith('DELETE FROM gm31_pending_identity_cleanup WHERE identity_hash')) {
      const changed = this.pendingIdentities.delete(params[0] as string);
      return { changes: Number(changed) };
    }
    if (sql.startsWith('DELETE FROM gm31_pending_identity_cleanup_legacy')) return { changes: 0 };
    if (sql.startsWith('DELETE FROM gm31_pending_private_deletion')) {
      const changed = this.pendingCleanup.delete(params[0] as string);
      return { changes: Number(changed) };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }
  async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null> {
    if (sql === 'PRAGMA user_version') return { user_version: this.version } as T;
    if (sql.startsWith('SELECT') && sql.includes('gm31_pending_') && this.version !== 4) {
      throw new Error('no such table: gm31_pending_identity_cleanup');
    }
    if (sql.startsWith('SELECT record_id FROM gm31_pending_private_deletion')) {
      const recordId = params[0] as string;
      return this.pendingCleanup.has(recordId) ? { record_id: recordId } as T : null;
    }
    if (sql.startsWith('SELECT identity_hash FROM gm31_pending_identity_cleanup')) {
      const identityHash = params[0] as string;
      return this.pendingIdentities.has(identityHash) ? { identity_hash: identityHash } as T : null;
    }
    return null;
  }
  async getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]> {
    if (sql.startsWith('SELECT') && sql.includes('gm31_pending_') && this.version !== 4) {
      throw new Error('no such table: gm31_pending_identity_cleanup');
    }
    if (sql.startsWith('SELECT record_id FROM gm31_pending_private_deletion')) {
      return [...this.pendingCleanup].map(record_id => ({ record_id })) as T[];
    }
    if (sql.startsWith('SELECT identity_hash FROM gm31_pending_identity_cleanup')) {
      return [...this.pendingIdentities].map(identity_hash => ({ identity_hash })) as T[];
    }
    if (sql.startsWith('SELECT identity_id FROM gm31_pending_identity_cleanup_legacy')) return [];
    if (sql.startsWith('PRAGMA table_info(gm31_pending_identity_cleanup)')) return [];
    const kind = sql.includes('WHERE kind = ?') ? params[0] : undefined;
    return [...this.rows.values()].filter(row => !kind || row.kind === kind) as T[];
  }
}

class MemorySecureStore implements SecurePrivateStore {
  values = new Map<string, string>();
  failNextDelete = false;
  failNextRead = false;
  async getItemAsync(key: string) {
    if (this.failNextRead) { this.failNextRead = false; throw new Error('SECURE_READ_FAILED'); }
    return this.values.get(key) ?? null;
  }
  async setItemAsync(key: string, value: string, _options?: { keychainAccessible?: number }) { this.values.set(key, value); }
  async deleteItemAsync(key: string) {
    if (this.failNextDelete) { this.failNextDelete = false; throw new Error('SECURE_DELETE_FAILED'); }
    this.values.delete(key);
  }
}

function setup() {
  const database = new MemoryDatabase();
  const secureStore = new MemorySecureStore();
  let now = 1_800_000_000_000;
  const outbox = new DurableOutbox(database, secureStore, () => now, 3);
  return { database, secureStore, outbox, advance: (ms: number) => { now += ms; } };
}

function intent(identityId: string, requestId: string, votes = [{ roundDishId: 'dish-1', choice: 'WANT' }], roomId = 'room-1', expectedVersion = 12) {
  return {
    identityId,
    roomId,
    round: 1 as const,
    poolVersion: 4,
    contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
    requestId,
    expectedVersion,
    payload: { intentId: `intent_${requestId}`, votes },
  };
}

describe('GM-31 durable private outbox', () => {
  test('first cache and outbox operations wait for migration on a fresh database', async () => {
    const { database, outbox } = setup();
    await Promise.all([
      outbox.enqueue(intent('user-A', 'first-operation')),
      outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'room-1', contractVersion: 'v4', value: { private: true } }),
    ]);
    expect(database.version).toBe(4);
    expect(await outbox.list('user-A')).toHaveLength(1);
    expect(await outbox.readSnapshotCache('user-A', 'room-1', 'v4')).toMatchObject({ value: { private: true } });
  });

  test('logout waits for an in-flight secure outbox write before deleting identity A', async () => {
    const database = new MemoryDatabase();
    const secureStore = new MemorySecureStore();
    let releaseWrite: (() => void) | undefined;
    const originalSet = secureStore.setItemAsync.bind(secureStore);
    secureStore.setItemAsync = async (key, value, options) => {
      await new Promise<void>(resolve => { releaseWrite = resolve; });
      await originalSet(key, value, options);
    };
    const outbox = new DurableOutbox(database, secureStore);

    const writing = outbox.enqueue(intent('user-A', 'late-write'));
    await new Promise(resolve => setTimeout(resolve, 0));
    const logout = outbox.clearIdentity('user-A');
    releaseWrite?.();
    await writing;
    await logout;

    const restarted = new DurableOutbox(database, secureStore);
    expect(await restarted.list('user-A')).toEqual([]);
    expect(database.rows.size).toBe(0);
    expect(secureStore.values.size).toBe(0);
  });

  test('logout also waits for an in-flight private cache write', async () => {
    const database = new MemoryDatabase();
    const secureStore = new MemorySecureStore();
    let releaseWrite: (() => void) | undefined;
    const originalSet = secureStore.setItemAsync.bind(secureStore);
    secureStore.setItemAsync = async (key, value, options) => {
      await new Promise<void>(resolve => { releaseWrite = resolve; });
      await originalSet(key, value, options);
    };
    const outbox = new DurableOutbox(database, secureStore);

    const writing = outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'room-1', contractVersion: 'v4', value: { private: true } });
    await new Promise(resolve => setTimeout(resolve, 0));
    const logout = outbox.clearIdentity('user-A');
    releaseWrite?.();
    await Promise.all([writing, logout]);

    const restarted = new DurableOutbox(database, secureStore);
    expect(await restarted.readSnapshotCache('user-A', 'room-1', 'v4')).toBeUndefined();
    expect(database.rows.size).toBe(0);
    expect(secureStore.values.size).toBe(0);
  });

  test('recognizes canonical ballot ACKs and legacy submission receipts', () => {
    expect(acknowledgedRequestIds({ ownBallot: { requestId: 'canonical-req' }, ownSubmission: null }))
      .toEqual(['canonical-req']);
    expect(acknowledgedRequestIds({ ownBallot: [{ roundDishId: 'dish-1', choice: 'WANT' }], ownSubmission: null }))
      .toEqual([]); // Canonical arrays are ACKed only with the member's ACCEPTED status.
    expect(acknowledgedRequestIds({ ownBallot: null, ownSubmission: {
      round: 1, intentId: 'intent-1', requestId: 'legacy-req', submittedAt: '2026-11-07T00:00:00Z', voteCount: 1,
    } })).toEqual(['legacy-req']);
  });

  test('stores private scope and ballot only in SecureStore and rejects request ID reuse', async () => {
    const { database, secureStore, outbox } = setup();
    const saved = await outbox.enqueue(intent('user-A', 'req-1'));
    expect(saved.state).toBe('pending');
    expect([...database.rows.values()]).toHaveLength(1);
    expect(JSON.stringify([...database.rows.values()])).not.toContain('user-A');
    expect(JSON.stringify([...database.rows.values()])).not.toContain('room-1');
    expect([...secureStore.values.values()].join(' ')).toContain('user-A');
    expect(await outbox.enqueue(intent('user-A', 'req-1'))).toEqual(saved);
    await expect(outbox.enqueue(intent('user-A', 'req-1', [{ roundDishId: 'dish-2', choice: 'NO' }]))).rejects.toThrow('OUTBOX_REQUEST_ID_CONFLICT');
  });

  test('identity isolation, ACK scrub, and logout deletion apply to outbox and cache', async () => {
    const { secureStore, outbox } = setup();
    await outbox.enqueue(intent('user-A', 'req-A'));
    await outbox.enqueue(intent('user-B', 'req-B'));
    expect((await outbox.list('user-A')).map(item => item.requestId)).toEqual(['req-A']);
    await outbox.acknowledge('user-A', 'req-A');
    const acked = (await outbox.list('user-A'))[0];
    expect(acked?.state).toBe('acked');
    expect(acked?.payload).toBeUndefined();
    await outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'room-1', contractVersion: 'contract-1', value: { result: 'winner' } });
    await outbox.clearIdentity('user-A');
    expect(await outbox.list('user-A')).toEqual([]);
    expect(await outbox.readSnapshotCache('user-A', 'room-1', 'contract-1')).toBeUndefined();
    expect((await outbox.list('user-B')).map(item => item.requestId)).toEqual(['req-B']);
    expect([...secureStore.values.values()].join(' ')).not.toContain('winner');
  });

  test('refetches canonical snapshot before returning replay candidates and never auto-replays unknown or stale intents', async () => {
    const { outbox } = setup();
    await outbox.enqueue(intent('user-A', 'pending'));
    await outbox.enqueue(intent('user-A', 'unknown'));
    await outbox.markUnknown('user-A', 'unknown');
    let fetched = false;
    const candidates = await outbox.reconcileBeforeReplay('user-A', async () => {
      fetched = true;
      return { roomId: 'room-1', round: 1, poolVersion: 4, contractVersion: intent('user-A', 'x').contractVersion, version: 12, active: true, acknowledgedRequestIds: [] };
    });
    expect(fetched).toBe(true);
    expect(candidates.map(candidate => candidate.requestId)).toEqual(['pending']);
    const stale = await outbox.reconcileBeforeReplay('user-A', async () => ({
      roomId: 'room-1', round: 2, poolVersion: 5, contractVersion: intent('user-A', 'x').contractVersion, version: 20, active: true, acknowledgedRequestIds: [],
    }));
    expect(stale).toEqual([]);
    expect(await outbox.list('user-A')).toEqual([]);
  });

  test('keeps same-scope pending intent when only the room version increased', async () => {
    const { outbox } = setup();
    await outbox.enqueue(intent('user-A', 'pending'));
    await outbox.enqueue(intent('user-A', 'unknown'));
    await outbox.markUnknown('user-A', 'unknown');
    const candidates = await outbox.reconcileBeforeReplay('user-A', async () => ({
      roomId: 'room-1', round: 1, poolVersion: 4,
      contractVersion: intent('user-A', 'x').contractVersion,
      version: 13, active: true, acknowledgedRequestIds: [],
    }));
    expect(candidates.map(item => item.requestId)).toEqual(['pending']);
    expect((await outbox.list('user-A')).map(item => [item.requestId, item.state])).toEqual([
      ['pending', 'pending'], ['unknown', 'unknown'],
    ]);
  });

  test('reconciling room B leaves room A intents intact', async () => {
    const { outbox } = setup();
    await outbox.enqueue(intent('user-A', 'room-a', undefined, 'room-A'));
    await outbox.enqueue(intent('user-A', 'room-b', undefined, 'room-B'));
    const candidates = await outbox.reconcileBeforeReplay('user-A', async () => ({
      roomId: 'room-B', round: 1, poolVersion: 4,
      contractVersion: intent('user-A', 'fixture').contractVersion,
      version: 12, active: true, acknowledgedRequestIds: [],
    }));
    expect(candidates.map(item => item.requestId)).toEqual(['room-b']);
    expect((await outbox.list('user-A')).map(item => item.requestId)).toEqual(['room-a', 'room-b']);
  });

  test('does not replay a future expectedVersion for an otherwise matching room snapshot', async () => {
    const { outbox } = setup();
    await outbox.enqueue(intent('user-A', 'future', undefined, 'room-1', 14));
    const candidates = await outbox.reconcileBeforeReplay('user-A', async () => ({
      roomId: 'room-1', round: 1, poolVersion: 4,
      contractVersion: intent('user-A', 'fixture').contractVersion,
      version: 13, active: true, acknowledgedRequestIds: [],
    }));
    expect(candidates).toEqual([]);
    expect(await outbox.list('user-A')).toEqual([]);
  });

  test('canonical ballot reconciles only when the server marks the member ACCEPTED', async () => {
    const { outbox } = setup();
    await outbox.enqueue(intent('user-A', 'canonical-ack'));
    const snapshot = {
      roomId: 'room-1', round: 1 as const, poolVersion: 4,
      contractVersion: intent('user-A', 'fixture').contractVersion,
      version: 12, active: true, acknowledgedRequestIds: [],
    };
    const notAccepted = await outbox.reconcileBeforeReplay('user-A', async () => ({ ...snapshot, hasCanonicalBallot: false }));
    expect(notAccepted.map(item => item.requestId)).toEqual(['canonical-ack']);
    const accepted = await outbox.reconcileBeforeReplay('user-A', async () => ({ ...snapshot, hasCanonicalBallot: true }));
    expect(accepted).toEqual([]);
    const acked = (await outbox.list('user-A'))[0];
    expect(acked).toMatchObject({ requestId: 'canonical-ack', state: 'acked' });
    expect(acked).not.toHaveProperty('payload');
  });

  test('retains cleanup metadata when SecureStore deletion fails, then retries successfully', async () => {
    const { database, secureStore, outbox } = setup();
    await outbox.enqueue(intent('user-A', 'cleanup'));
    secureStore.failNextDelete = true;
    await expect(outbox.clearIdentity('user-A')).rejects.toThrow('PRIVATE_IDENTITY_CLEANUP_PENDING');
    expect(database.rows.size).toBe(1);
    expect(secureStore.values.size).toBe(1);
    await outbox.clearIdentity('user-A');
    expect(database.rows.size).toBe(0);
    expect(secureStore.values.size).toBe(0);
  });

  test('retries pending SecureStore deletion through a new outbox after restart', async () => {
    const { database, secureStore, outbox } = setup();
    await outbox.enqueue(intent('user-A', 'restart-cleanup'));
    secureStore.failNextDelete = true;
    await expect(outbox.clearIdentity('user-A')).rejects.toThrow('PRIVATE_IDENTITY_CLEANUP_PENDING');
    expect(database.pendingCleanup.size).toBe(1);

    const restartedOutbox = new DurableOutbox(database, secureStore, () => 1_800_000_000_000, 3);
    await restartedOutbox.retryPendingPrivateDeletions();
    expect(database.rows.size).toBe(0);
    expect(database.pendingCleanup.size).toBe(0);
    expect(secureStore.values.size).toBe(0);
  });

  test('marks all identity rows before deletion and hides failed rows until restart cleanup', async () => {
    const { database, secureStore, outbox } = setup();
    await outbox.enqueue(intent('user-A', 'first'));
    await outbox.enqueue(intent('user-A', 'second'));
    await outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'room-1', contractVersion: 'contract-1', value: { private: true } });
    secureStore.failNextDelete = true;

    await expect(outbox.clearIdentity('user-A')).rejects.toThrow('PRIVATE_IDENTITY_CLEANUP_PENDING');
    expect(database.pendingCleanup.size).toBe(1);
    expect(await outbox.list('user-A')).toEqual([]);
    expect(await outbox.readSnapshotCache('user-A', 'room-1', 'contract-1')).toBeUndefined();

    const restarted = new DurableOutbox(database, secureStore, () => 1_800_000_000_000, 3);
    await restarted.retryPendingPrivateDeletions();
    expect(database.rows.size).toBe(0);
    expect(database.pendingCleanup.size).toBe(0);
    expect(secureStore.values.size).toBe(0);
  });

  test('SecureStore read failure keeps that identity hidden across restart while preserving another identity', async () => {
    const { database, secureStore, outbox } = setup();
    await outbox.enqueue(intent('user-A', 'private-A'));
    await outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'room-A', contractVersion: 'contract-1', value: { secret: 'A' } });
    await outbox.enqueue(intent('user-B', 'private-B'));
    secureStore.failNextRead = true;

    await expect(outbox.clearIdentity('user-A')).rejects.toThrow('PRIVATE_IDENTITY_CLEANUP_PENDING');
    expect(await outbox.list('user-A')).toEqual([]);
    expect(await outbox.readSnapshotCache('user-A', 'room-A', 'contract-1')).toBeUndefined();
    expect((await outbox.list('user-B')).map(entry => entry.requestId)).toEqual(['private-B']);

    const restarted = new DurableOutbox(database, secureStore, () => 1_800_000_000_000, 3);
    await restarted.retryPendingPrivateDeletions();
    expect(await restarted.list('user-A')).toEqual([]);
    expect(await restarted.readSnapshotCache('user-A', 'room-A', 'contract-1')).toBeUndefined();
    expect((await restarted.list('user-B')).map(entry => entry.requestId)).toEqual(['private-B']);
    expect(database.pendingIdentities.size).toBe(0);
  });

  test('TTL expiry removes the secure payload and identity-scoped rows', async () => {
    const { database, secureStore, outbox, advance } = setup();
    await outbox.enqueue(intent('user-A', 'old'));
    advance(25 * 60 * 60 * 1000);
    expect(await outbox.list('user-A')).toEqual([]);
    expect(database.rows.size).toBe(0);
    expect(secureStore.values.size).toBe(0);
  });

  test('applies the per-identity cap across cache and outbox while preserving pending intents', async () => {
    const { database, outbox } = setup();
    await outbox.enqueue(intent('user-A', 'pending-1'));
    await outbox.enqueue(intent('user-A', 'pending-2'));
    await outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'history', contractVersion: 'history-v1', value: { entries: [1] } });
    await outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'room-1', contractVersion: 'room-v1', value: { state: 'ROUND_1' } });
    expect(database.rows.size).toBe(3);
    expect((await outbox.list('user-A')).map(entry => entry.requestId)).toEqual(['pending-1', 'pending-2']);
    expect(await outbox.readSnapshotCache('user-A', 'history', 'history-v1')).toBeUndefined();
    expect(await outbox.readSnapshotCache('user-A', 'room-1', 'room-v1')).toBeDefined();
    expect(database.rows.size).toBe(3);
    const full = setup();
    await full.outbox.enqueue(intent('user-A', 'pending-1'));
    await full.outbox.enqueue(intent('user-A', 'pending-2'));
    await full.outbox.enqueue(intent('user-A', 'pending-3'));
    await expect(full.outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'another', contractVersion: 'v1', value: {} })).rejects.toThrow('PRIVATE_STORE_CAPACITY_REACHED');
    expect(full.database.rows.size).toBe(3);
  });

  test('can invalidate one durable snapshot without deleting another room cache', async () => {
    const { outbox } = setup();
    await outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'history', contractVersion: 'history-v1', value: { entries: [1] } });
    await outbox.cacheSnapshot({ identityId: 'user-A', roomId: 'room-1', contractVersion: 'room-v1', value: { state: 'ROUND_1' } });
    await outbox.clearSnapshotCache('user-A', 'history', 'history-v1');
    expect(await outbox.readSnapshotCache('user-A', 'history', 'history-v1')).toBeUndefined();
    expect(await outbox.readSnapshotCache('user-A', 'room-1', 'room-v1')).toBeDefined();
  });
});
