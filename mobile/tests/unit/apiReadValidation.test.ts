import {
  ApiClient, ApiClientImpl, ApiTransport, ReadResult, createApiClient, MockApiClient,
  MOCK_ANCHORS, MOCK_COVERAGE_AREAS, MOCK_DISHES, MOCK_FRIENDS, MOCK_INBOX_ITEMS, MOCK_HISTORY_ITEMS,
} from '../../src/data/api';

const time = '2026-10-11T12:00:00Z';
const user = { id: 'user_fixture', displayName: 'Review', isGuest: true, createdAt: time };
const context = { anchorId: 'anchor_fixture', radiusM: 1000, desiredAt: time,
  serviceMode: 'dine_in' as const, mealSlot: 'lunch' as const, avoidRecent: false };
const snapshot = { roomId: 'room_fixture', code: 'GCD1', state: 'LOBBY', version: 1,
  hostUserId: user.id, context, members: [{ userId: user.id, displayName: user.displayName,
    isHost: true, ready: false, joinedAt: time }], round: 1, poolVersion: 1,
  pool: MOCK_DISHES, expiresAt: time };

type ReadCall = (client: ApiClient) => Promise<ReadResult<unknown>>;
const reads: { name: string; call: ReadCall; data: unknown; invalid: unknown[]; list?: boolean }[] = [
  { name: 'restoreSession', call: c => c.restoreSession('fixture_token'), data: user,
    invalid: [{ ...user, isGuest: 'true' }, { ...user, createdAt: 'tomorrow' }, { ...user, displayName: undefined }] },
  { name: 'getDiscoveryContext', call: c => c.getDiscoveryContext(),
    data: { anchors: MOCK_ANCHORS, coverageAreas: MOCK_COVERAGE_AREAS, serverTime: time },
    invalid: [{ anchors: [{ ...MOCK_ANCHORS[0], lat: '10' }], coverageAreas: [], serverTime: time },
      { anchors: [], coverageAreas: [{}], serverTime: time }] },
  { name: 'previewFoodPool', call: c => c.previewFoodPool(context),
    data: { pool: MOCK_DISHES, datasetVersion: 'fixture', eligibilityVersion: '1.0', evaluatedAt: time, totalCandidateCount: 6 },
    invalid: [{ pool: [{}], datasetVersion: 'fixture', eligibilityVersion: '1.0', evaluatedAt: time, totalCandidateCount: 1 },
      { pool: [], datasetVersion: 'fixture', eligibilityVersion: '1.0', evaluatedAt: time, totalCandidateCount: -1 }] },
  { name: 'getRoomSnapshot', call: c => c.getRoomSnapshot('room_fixture'), data: snapshot,
    invalid: [{ ...snapshot, context: {} }, { ...snapshot, members: [{}] },
      { ...snapshot, state: 'UNKNOWN' }, { ...snapshot, version: 1.5 }, { ...snapshot, pool: [{}] },
      { ...snapshot, ownVotes: { dish: 'MAYBE' } }, { ...snapshot, ownSubmission: {} },
      { ...snapshot, ownPreferences: {} }, { ...snapshot, result: {} }, { ...snapshot, evaluatedAt: 42 }] },
  { name: 'getResultOfferings', call: c => c.getResultOfferings('room_fixture', 'result_fixture'), data: MOCK_DISHES, list: true,
    invalid: [[{}], [{ ...MOCK_DISHES[0], artwork: { url: 'fixture' } }],
      [{ ...MOCK_DISHES[0], price: { priceMin: 100, priceMax: 200, currency: 'BAD', unit: 'item', servingSize: null } }],
      [{ ...MOCK_DISHES[0], flavor: { spicy: { present: true, intensity: 'high' } } }],
      [{ ...MOCK_DISHES[0], temperature: 'boiling' }]] },
  { name: 'listFriends', call: c => c.listFriends(), data: MOCK_FRIENDS, list: true,
    invalid: [[{}], [{ ...MOCK_FRIENDS[0], status: 'pending' }], [{ ...MOCK_FRIENDS[0], since: 'yesterday' }]] },
  { name: 'listPartnerInbox', call: c => c.listPartnerInbox(), data: MOCK_INBOX_ITEMS, list: true,
    invalid: [[{}], [{ ...MOCK_INBOX_ITEMS[0], read: 0 }], [{ ...MOCK_INBOX_ITEMS[0], metadata: [] }]] },
  { name: 'getHistory', call: c => c.getHistory('group'), data: MOCK_HISTORY_ITEMS, list: true,
    invalid: [[{}], [{ ...MOCK_HISTORY_ITEMS[0], scope: 'public' }], [{ ...MOCK_HISTORY_ITEMS[0], memberCount: NaN }]] },
];

function clientFor(response: unknown): ApiClient {
  const transport: ApiTransport = { async invoke<T>() { return response as T; } };
  return createApiClient('real', { transport });
}

describe('GM-07 read response validation through public client', () => {
  describe.each(reads)('$name', ({ call, data, invalid, list }) => {
    it.each(['bare', 'envelope'])('accepts a complete %s DTO', async shape => {
      expect(await call(clientFor(shape === 'bare' ? data : { ok: true, data })))
        .toEqual({ ok: true, data });
    });

    it.each([null, undefined, 42, 'invalid', {}, { ok: true }, { ok: true, data: null },
      { ok: true, data: 42 }, { ok: true, data: {} }, { ok: 'true', data: [] }])
      ('rejects malformed success: %j', async response => {
        expect(await call(clientFor(response))).toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
      });

    it('checks nested fields and every array item', async () => {
      for (const payload of invalid) {
        for (const raw of [payload, { ok: true, data: payload }]) {
          expect(await call(clientFor(raw))).toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
        }
      }
    });

    it('preserves business errors and maps unknown error codes', async () => {
      expect(await call(clientFor({ ok: false, error: { messageKey: 'AUTH_REQUIRED', message: 'Expired' } })))
        .toEqual({ ok: false, error: { messageKey: 'AUTH_REQUIRED', message: 'Expired' } });
      expect(await call(clientFor({ ok: false, error: { messageKey: 'not_a_code' } })))
        .toMatchObject({ ok: false, error: { messageKey: 'UNKNOWN_ERROR' } });
    });

    if (list) {
      it('accepts valid empty arrays in both supported shapes', async () => {
        expect(await call(clientFor([]))).toEqual({ ok: true, data: [] });
        expect(await call(clientFor({ ok: true, data: [] }))).toEqual({ ok: true, data: [] });
      });
    }
  });

  it('does not install a token for incomplete restored users, including an existing session', async () => {
    for (const initialToken of [null, 'existing_fixture_token']) {
      const client = new ApiClientImpl({ initialToken, transport: { async invoke<T>() { return { ok: true, data: {} } as T; } } });
      expect(await client.restoreSession('invalid_fixture_token'))
        .toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
      expect(client.getAuthToken()).toBe(initialToken);
    }
  });

  it('installs the supplied restore token only after a valid user is read', async () => {
    const client = clientFor({ ok: true, data: user }) as ApiClientImpl;
    expect(await client.restoreSession('valid_fixture_token')).toEqual({ ok: true, data: user });
    expect(client.getAuthToken()).toBe('valid_fixture_token');
  });

  it.each(['default', 'empty'] as const)('accepts actual %s mock DTOs', async mode => {
    const mock = new MockApiClient({ delayMs: 0, mode });
    for (const { name, call } of reads.filter(r => r.name !== 'getResultOfferings')) {
      const result = name === 'getRoomSnapshot' ? await mock.getRoomSnapshot('room_mock_001') : await call(mock);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(`Mock ${name} failed`);
      expect(await call(clientFor(result.data))).toMatchObject({ ok: true });
    }
  });

  it('accepts a mock snapshot with preferences, votes, receipt and finalized result', async () => {
    const mock = new MockApiClient({ delayMs: 0 });
    const roomId = 'room_mock_001';
    expect((await mock.updatePreferences({ roomId, expectedVersion: 1,
      preferences: { cuisineIds: [], categoryIds: [], historyConsent: false } })).ok).toBe(true);
    expect((await mock.setReady({ roomId, expectedVersion: 2, ready: true })).ok).toBe(true);
    expect((await mock.startRound({ roomId, expectedVersion: 3 })).ok).toBe(true);
    expect((await mock.submitBallot({ roomId, round: 1, poolVersion: 1, expectedVersion: 4,
      intentId: 'fixture_intent', votes: MOCK_DISHES.map(d => ({ roundDishId: d.roundDishId, vote: 'WANT' })) })).ok).toBe(true);
    const result = await mock.getRoomSnapshot(roomId);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Fixture snapshot failed');
    expect(await clientFor(result.data).getRoomSnapshot(roomId)).toEqual(result);
    const offerings = await mock.getResultOfferings(roomId, result.data.result!.resultId);
    expect(offerings.ok).toBe(true);
    if (!offerings.ok) throw new Error('Fixture offerings failed');
    expect(await clientFor(offerings.data).getResultOfferings(roomId, result.data.result!.resultId)).toEqual(offerings);
  });
});
