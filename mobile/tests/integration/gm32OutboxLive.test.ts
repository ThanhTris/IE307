/// <reference types="node" />
/** Opt-in GM-32 test. Run only through the manifest-verified regression runner. */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { isCanonicalRoomSnapshot } from '../../src/data/api/responseGuards';
import { DurableOutbox, type SqlitePrivateDatabase } from '../../src/data/local/outbox';
import { acknowledgedRequestIds } from '../../src/features/voting/services/durableVoteRepository';
import { CANONICAL_VOTE_CONTRACT_VERSION as contractVersion } from '../../src/features/voting/services/voteRepository';

const liveTest = process.env.GM32_OUTBOX_LIVE === '1' ? test : test.skip;

liveTest('live ACK replay reconciles a restarted GM-31 outbox and drops terminal stale intent', async () => {
  const workdir = process.env.GM03_QA_WORKDIR ?? '';
  const path = process.env.GM03_QA_MANIFEST ?? '';
  if (!workdir || path !== resolve(workdir, 'manifest.json')) throw new Error('GM03 QA manifest required');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const credentials = JSON.parse(readFileSync(resolve(workdir, 'credentials.private.json'), 'utf8'));
  const origin = new URL(manifest.endpoint.baseUrl);
  if (manifest.format !== 'gm03-qa-manifest-v1' || manifest.workdir !== workdir
      || !manifest.projectId.startsWith('gm03qa-') || origin.protocol !== 'http:'
      || origin.hostname !== '127.0.0.1' || ['54321', '54322'].includes(origin.port)
      || credentials.apiUrl !== origin.origin) throw new Error('Unexpected QA origin');

  function post(pathname: string, body: object, token?: string): Promise<{ status: number; body: ReturnType<typeof JSON.parse> }> {
    return new Promise((resolveResponse, reject) => {
      const payload = JSON.stringify(body);
      const req = httpRequest(origin.origin + pathname, {
        method: 'POST', timeout: 15000,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
          apikey: credentials.anonKey, ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      }, response => {
        response.setEncoding('utf8');
        let raw = '';
        response.on('data', chunk => { raw += chunk; });
        response.on('error', reject);
        response.on('end', () => {
          try {
            resolveResponse({ status: response.statusCode ?? 0, body: JSON.parse(raw) });
          } catch {
            reject(new Error('Owned QA returned a non-JSON response'));
          }
        });
      });
      req.on('timeout', () => req.destroy(new Error('Owned QA request timed out')));
      req.on('error', reject);
      req.end(payload);
    });
  }
  async function guest(name: string): Promise<{ id: string; token: string }> {
    const result = await post('/auth/v1/signup', { data: { display_name: name } });
    if (result.status !== 200 || result.body.user?.is_anonymous !== true || !result.body.access_token) {
      throw new Error('Owned GoTrue guest signup failed');
    }
    return { id: result.body.user.id, token: result.body.access_token };
  }
  async function call(token: string, command: string, fields: object) {
    const response = await post('/rest/v1/rpc/dish_session', {
      command, payload: { contractVersion, ...fields },
    }, token);
    if (response.status !== 200 || response.body.ok !== true) {
      throw new Error(`${command}: ${response.status} ${response.body.error?.messageKey ?? ''}`);
    }
    return response.body.data;
  }
  async function snapshot(token: string, roomId: string) {
    const raw: unknown = await call(token, 'snapshot', { roomId });
    if (!isCanonicalRoomSnapshot(raw)) throw new Error('Invalid canonical snapshot');
    return raw;
  }

  const host = await guest('GM32 outbox host');
  const peer = await guest('GM32 outbox peer');
  const made = await call(host.token, 'create', {
    requestId: randomUUID(), displayName: 'GM32 outbox host',
    settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null },
    preferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false },
  });
  const roomId: string = made.roomId;
  await call(peer.token, 'join', { requestId: randomUUID(), code: made.code, displayName: 'GM32 outbox peer' });
  const lobby = await snapshot(host.token, roomId);
  await call(host.token, 'start', { requestId: randomUUID(), roomId, expectedVersion: lobby.version });
  const roundOne = await snapshot(host.token, roomId);
  const ballot = (snap: typeof roundOne) => ({
    roomId, expectedVersion: snap.version, round: snap.round, poolVersion: snap.poolVersion,
    requestId: randomUUID(), votes: snap.pool.map(dish => ({ roundDishId: dish.roundDishId, choice: 'WANT' })),
  });

  const sqlite = new DatabaseSync(':memory:');
  const database: SqlitePrivateDatabase = {
    async execAsync(sql) { sqlite.exec(sql); },
    async runAsync(sql, ...params) { return { changes: Number(sqlite.prepare(sql).run(...params).changes) }; },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) {
      return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
  };
  const values = new Map<string, string>();
  const secureStore = {
    async getItemAsync(key: string) { return values.get(key) ?? null; },
    async setItemAsync(key: string, value: string) { values.set(key, value); },
    async deleteItemAsync(key: string) { values.delete(key); },
  };
  try {
    const outbox = new DurableOutbox(database, secureStore);
    await outbox.retryPendingPrivateDeletions();
    const request = ballot(roundOne);
    await outbox.enqueue({ ...request, identityId: host.id, contractVersion, payload: request });
    const ack = await call(host.token, 'submit', request);
    // Model a response lost after the server persisted the request.
    await outbox.markUnknown(host.id, request.requestId);
    const restarted = new DurableOutbox(database, secureStore);
    const reconcile = () => restarted.reconcileBeforeReplay(host.id, async () => {
      const snap = await snapshot(host.token, roomId);
      const caller = snap.members.find(member => member.userId === host.id) as
        (typeof snap.members[number] & { submissionStatus?: string }) | undefined;
      return { roomId, round: snap.round, poolVersion: snap.poolVersion, version: snap.version, contractVersion,
        active: ['ROUND_1', 'WAITING_1', 'ROUND_2', 'WAITING_2'].includes(snap.state),
        acknowledgedRequestIds: acknowledgedRequestIds(snap),
        hasCanonicalBallot: Array.isArray(snap.ownBallot) && snap.ownBallot.length > 0
          && caller?.submissionStatus === 'ACCEPTED' };
    });
    expect(await reconcile()).toHaveLength(0);
    const saved = await restarted.list(host.id);
    expect(saved.map(entry => [entry.state, entry.payload === undefined])).toEqual([['acked', true]]);
    expect(await restarted.list(peer.id)).toHaveLength(0);
    const replay = await call(host.token, 'submit', request);
    expect(JSON.stringify(replay) === JSON.stringify(ack)).toBe(true);
    const afterReplay = await snapshot(host.token, roomId);
    expect(afterReplay.submittedCount).toBe(1);
    expect((await snapshot(peer.token, roomId)).ownBallot).toEqual([]);

    const stale = { ...ballot(afterReplay), poolVersion: afterReplay.poolVersion + 1 };
    // A queued intent for the next pool cannot be sent against the terminal room.
    await restarted.enqueue({ ...stale, identityId: host.id,
      contractVersion, payload: stale });
    await call(peer.token, 'submit', ballot(await snapshot(peer.token, roomId)));
    for (const player of [host, peer]) {
      const snap = await snapshot(player.token, roomId);
      await call(player.token, 'waiting', {
        roomId, requestId: randomUUID(), round: snap.round, poolVersion: snap.poolVersion, expectedVersion: snap.version,
      });
    }
    const terminal = await snapshot(host.token, roomId);
    expect(terminal.state).toBe('DECIDED');
    expect(await reconcile()).toHaveLength(0);
    expect((await restarted.list(host.id)).some(entry => entry.requestId === stale.requestId)).toBe(false);
    expect((await snapshot(host.token, roomId)).result?.resultId).toBe(terminal.result?.resultId);
  } finally {
    sqlite.close();
  }
}, 60000);
