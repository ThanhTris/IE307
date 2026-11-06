import {
  DurableOutbox,
  type SecurePrivateStore,
  type SqlitePrivateDatabase,
} from '../../src/data/local/outbox';

type Row = { record_id: string; kind: 'outbox' | 'cache'; state: 'pending' | 'unknown' | 'acked' | 'cached'; created_at: number; expires_at: number };

class MemoryDatabase implements SqlitePrivateDatabase {
  rows = new Map<string, Row>();
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
    throw new Error(`Unexpected SQL: ${sql}`);
  }
  async getFirstAsync<T>(sql: string): Promise<T | null> {
    if (sql === 'PRAGMA user_version') return { user_version: this.version } as T;
    return null;
  }
  async getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]> {
    const kind = sql.includes('WHERE kind = ?') ? params[0] : undefined;
    return [...this.rows.values()].filter(row => !kind || row.kind === kind) as T[];
  }
}

class MemorySecureStore implements SecurePrivateStore {
  values = new Map<string, string>();
  failNextDelete = false;
  async getItemAsync(key: string) { return this.values.get(key) ?? null; }
  async setItemAsync(key: string, value: string) { this.values.set(key, value); }
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

function intent(identityId: string, requestId: string, votes = [{ roundDishId: 'dish-1', choice: 'WANT' }]) {
  return {
    identityId,
    roomId: 'room-1',
    round: 1 as const,
    poolVersion: 4,
    contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
    requestId,
    expectedVersion: 12,
    payload: { intentId: `intent_${requestId}`, votes },
  };
}

describe('GM-31 durable private outbox', () => {
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

  test('retains cleanup metadata when SecureStore deletion fails, then retries successfully', async () => {
    const { database, secureStore, outbox } = setup();
    await outbox.enqueue(intent('user-A', 'cleanup'));
    secureStore.failNextDelete = true;
    await expect(outbox.clearIdentity('user-A')).rejects.toThrow('SECURE_DELETE_FAILED');
    expect(database.rows.size).toBe(1);
    expect(secureStore.values.size).toBe(1);
    await outbox.clearIdentity('user-A');
    expect(database.rows.size).toBe(0);
    expect(secureStore.values.size).toBe(0);
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
