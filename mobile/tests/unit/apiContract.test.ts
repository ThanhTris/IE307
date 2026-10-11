/**
 * GM-07 — Unit tests for ApiClient, contracts, and MockApiClient adapter.
 * Verifies request/response serialization, error mapping, timeout behavior,
 * idempotency with requestId, consensus rules (NO cannot be winner),
 * and mock state transitions across all modes and scenarios.
 */

import {
  ApiClientImpl,
  MockApiClient,
  createApiClient,
  ApiTransport,
  TransportOptions,
  FetchTransport,
  MOCK_ANCHORS,
  MOCK_DISHES,
  toStoragePermission,
} from '../../src/data/api';

describe('GM-07 API Contract & Client Suite', () => {
  describe('ApiClientImpl with Transport Mocking', () => {
    class MockTransport implements ApiTransport {
      public lastRpc: string | null = null;
      public lastParams: Record<string, unknown> | null = null;
      public lastOptions: TransportOptions | undefined = undefined;
      public responseData: unknown = null;
      public shouldThrow: unknown = null;

      async invoke<T>(rpcName: string, params: Record<string, unknown>, options?: TransportOptions): Promise<T> {
        this.lastRpc = rpcName;
        this.lastParams = params;
        this.lastOptions = options;

        if (this.shouldThrow) {
          throw this.shouldThrow;
        }
        return this.responseData as T;
      }
    }

    it('injects requestId and Authorization token into RPC calls', async () => {
      const transport = new MockTransport();
      transport.responseData = {
        ok: true,
        roomId: 'room_123',
        code: 'GCD9',
        version: 1,
        expiresAt: '2026-10-11T12:00:00Z',
      };

      const client = new ApiClientImpl({ transport });
      client.setAuthToken('mock_secret_token');

      const result = await client.createRoom({
        displayName: 'Trang',
        context: {
          anchorId: 'anc_ho_con_rua',
          radiusM: 1000,
          desiredAt: '2026-10-11T12:00:00Z',
          serviceMode: 'dine_in',
          mealSlot: 'lunch',
          avoidRecent: false,
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.code).toBe('GCD9');
        expect(result.requestId).toBeDefined();
        expect(result.requestId).toMatch(/^req_/);
      }

      expect(transport.lastRpc).toBe('create_room');
      expect(transport.lastOptions?.token).toBe('mock_secret_token');
      expect(transport.lastParams?.display_name).toBe('Trang');
    });

    it('caller can provide custom requestId and it is preserved across write attempts', async () => {
      const transport = new MockTransport();
      transport.responseData = {
        ok: true,
        accepted: true,
        round: 1,
        allMembersSubmitted: true,
        roomVersion: 2,
      };

      const client = new ApiClientImpl({ transport });
      const customRequestId = 'req_client_retry_uuid_999';

      const res = await client.submitBallot({
        roomId: 'room_123',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_fixed_1',
        expectedVersion: 1,
        votes: [],
        requestId: customRequestId,
      });

      expect(transport.lastParams?.requestId).toBe(customRequestId);
      expect(res.requestId).toBe(customRequestId);
    });

    it('does NOT convert HTTP 200 business error envelope into success (P1 defect guard)', async () => {
      const transport = new MockTransport();
      // Server returns HTTP 200 with JSON payload containing ok: false or error object
      transport.responseData = {
        ok: false,
        error: {
          messageKey: 'VERSION_CONFLICT',
          message: 'Room version is out of sync',
        },
      };

      const client = new ApiClientImpl({ transport });

      // 1. Test setReady
      const resReady = await client.setReady({
        roomId: 'room_123',
        expectedVersion: 1,
        ready: true,
      });
      expect(resReady.ok).toBe(false);
      if (!resReady.ok) {
        expect(resReady.error.messageKey).toBe('VERSION_CONFLICT');
      }

      // 2. Test submitBallot
      const resBallot = await client.submitBallot({
        roomId: 'room_123',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_1',
        expectedVersion: 1,
        votes: [],
      });
      expect(resBallot.ok).toBe(false);
      if (!resBallot.ok) {
        expect(resBallot.error.messageKey).toBe('VERSION_CONFLICT');
      }
    });

    it('unwraps success envelope and preserves version, state, and data without nesting errors', async () => {
      const transport = new MockTransport();
      transport.responseData = {
        ok: true,
        requestId: 'req_server_ack_1',
        version: 3,
        state: 'ROUND_1',
        data: {
          accepted: true,
          round: 1,
          allMembersSubmitted: false,
          roomVersion: 3,
        },
      };

      const client = new ApiClientImpl({ transport });
      const res = await client.submitBallot({
        roomId: 'room_123',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_1',
        expectedVersion: 2,
        votes: [],
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.requestId).toBe('req_server_ack_1');
        expect(res.version).toBe(3);
        expect(res.state).toBe('ROUND_1');
        expect(res.data.accepted).toBe(true);
      }
    });

    it('handles malformed or empty response gracefully with MALFORMED_RESPONSE', async () => {
      const transport = new MockTransport();
      const client = new ApiClientImpl({ transport });

      const malformedPayloads = [
        null,
        undefined,
        42,
        'some string',
        { foo: 'bar' },
        { ok: 'true' }, // ok is string, not boolean
        { ok: 1 },      // ok is number, not boolean
      ];

      for (const payload of malformedPayloads) {
        transport.responseData = payload;
        const res = await client.createRoom({
          displayName: 'Trang',
          context: {
            anchorId: 'anc_ho_con_rua',
            radiusM: 1000,
            desiredAt: '2026-10-11T12:00:00Z',
            serviceMode: 'dine_in',
            mealSlot: 'lunch',
            avoidRecent: false,
          },
        });

        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error.messageKey).toBe('MALFORMED_RESPONSE');
        }
      }
    });

    it('maps server error bodies and HTTP status codes correctly', async () => {
      const transport = new MockTransport();
      const client = new ApiClientImpl({ transport });

      // Structured server error body
      transport.shouldThrow = {
        status: 400,
        body: { messageKey: 'INCOMPLETE_BALLOT', message: 'Missing votes' },
      };

      const res1 = await client.submitBallot({
        roomId: 'room_1',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_1',
        expectedVersion: 1,
        votes: [],
      });

      expect(res1.ok).toBe(false);
      if (!res1.ok) {
        expect(res1.error.messageKey).toBe('INCOMPLETE_BALLOT');
        expect(res1.error.message).toBe('Missing votes');
      }

      // 404 status mapping
      transport.shouldThrow = { status: 404, body: 'Not found' };
      const res2 = await client.getRoomSnapshot('room_missing');
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.error.messageKey).toBe('ROOM_NOT_FOUND');
      }

      // 409 version conflict mapping
      transport.shouldThrow = { status: 409, body: 'Conflict' };
      const res3 = await client.setReady({ roomId: 'room_1', expectedVersion: 1, ready: true });
      expect(res3.ok).toBe(false);
      if (!res3.ok) {
        expect(res3.error.messageKey).toBe('VERSION_CONFLICT');
      }

      // Timeout mapping
      transport.shouldThrow = { name: 'AbortError', message: 'Timeout' };
      const res4 = await client.listFriends();
      expect(res4.ok).toBe(false);
      if (!res4.ok) {
        expect(res4.error.messageKey).toBe('TIMEOUT');
      }
    });

    it('configures FetchTransport with explicit baseUrl and injects fetchFn', () => {
      const customFetch = jest.fn() as any;
      const client = new ApiClientImpl({
        baseUrl: 'https://backend.gicungduoc.vn',
        fetchFn: customFetch,
      });

      const transport = client.getTransport() as FetchTransport;
      expect(transport).toBeInstanceOf(FetchTransport);
      expect(transport.getBaseUrl()).toBe('https://backend.gicungduoc.vn');
    });

    it('FetchTransport consumes response body strictly once and retains HTTP status for non-JSON errors', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Forbidden: Access Denied'),
      });

      const transport = new FetchTransport('https://example.com', mockFetch as any);
      const client = new ApiClientImpl({ transport });

      const res = await client.listFriends();
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('AUTH_REQUIRED');
      }
    });

    it('FetchTransport combined abort controller triggers timeout even with external signal provided', async () => {
      const slowFetch = jest.fn().mockImplementation((_url, opts) => {
        return new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const transport = new FetchTransport('https://example.com', slowFetch as any);
      const externalController = new AbortController();

      await expect(
        transport.invoke('slow_rpc', {}, { timeoutMs: 30, signal: externalController.signal })
      ).rejects.toMatchObject({ name: 'AbortError', message: 'TIMEOUT' });
    });
  });

  describe('Contract Parity & Converters', () => {
    it('maps client push permission to dictionary storage permission', () => {
      expect(toStoragePermission('granted')).toBe('granted');
      expect(toStoragePermission('denied')).toBe('denied');
      expect(toStoragePermission('provisional')).toBe('unknown');
      expect(toStoragePermission('unknown')).toBe('unknown');
    });

    it('ensures MOCK_DISHES contain currency, unit, and portion sizing metadata', () => {
      for (const dish of MOCK_DISHES) {
        expect(dish.currency).toBe('VND');
        expect(dish.unit).toBe('menu_item_unspecified');
        expect(dish.servingSize).toBe('1 phần');
        expect(dish.price).toBeDefined();
        expect(dish.price?.currency).toBe('VND');
        expect(dish.price?.unit).toBe('menu_item_unspecified');
        expect(dish.price?.servingSize).toBe('1 phần');
      }
    });
  });

  describe('MockApiClient State Transitions, Consensus & Scenarios', () => {
    it('executes the core room lifecycle in default mode with unanimous consensus', async () => {
      const mock = new MockApiClient({ delayMs: 0 });

      // 1. Discovery
      const discovery = await mock.getDiscoveryContext();
      expect(discovery.ok).toBe(true);
      if (discovery.ok) {
        expect(discovery.data.anchors.length).toBeGreaterThan(0);
        expect(discovery.data.anchors[0]?.id).toBe(MOCK_ANCHORS[0]?.id);
      }

      // 2. Preview Food Pool
      const poolRes = await mock.previewFoodPool({
        anchorId: 'anc_ho_con_rua',
        radiusM: 1000,
        desiredAt: '2026-10-11T12:00:00Z',
        serviceMode: 'dine_in',
        mealSlot: 'lunch',
      });
      expect(poolRes.ok).toBe(true);
      if (poolRes.ok) {
        expect(poolRes.data.pool.length).toBe(MOCK_DISHES.length);
      }

      // 3. Create Room
      const createRes = await mock.createRoom({
        displayName: 'Trang',
        context: {
          anchorId: 'anc_ho_con_rua',
          radiusM: 1500,
          desiredAt: '2026-10-11T12:00:00Z',
          serviceMode: 'dine_in',
          mealSlot: 'lunch',
          avoidRecent: true,
        },
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;

      const { roomId, code } = createRes.data;
      expect(code.length).toBe(4);

      // 4. Verify Snapshot metadata (datasetVersion, eligibilityVersion, ownSubmission)
      const snap1 = await mock.getRoomSnapshot(roomId);
      expect(snap1.ok).toBe(true);
      if (snap1.ok) {
        expect(snap1.data.state).toBe('LOBBY');
        expect(snap1.data.members.length).toBe(1);
        expect(snap1.data.datasetVersion).toBe('2026-10-11-core-01');
        expect(snap1.data.ownSubmission).toBeNull();
      }

      // 5. Update Preferences
      const prefRes = await mock.updatePreferences({
        roomId,
        expectedVersion: 1,
        preferences: {
          cuisineIds: ['cui_vietnam'],
          categoryIds: ['cat_mon_nuoc'],
          historyConsent: true,
        },
      });
      expect(prefRes.ok).toBe(true);

      // 6. Set Ready and Start Round
      const readyRes = await mock.setReady({ roomId, expectedVersion: 2, ready: true });
      expect(readyRes.ok).toBe(true);

      const startRes = await mock.startRound({ roomId, expectedVersion: 3 });
      expect(startRes.ok).toBe(true);

      const snapRound = await mock.getRoomSnapshot(roomId);
      expect(snapRound.ok).toBe(true);
      if (snapRound.ok) {
        expect(snapRound.data.state).toBe('ROUND_1');
      }

      // 7. Submit Ballot
      const allVotes = MOCK_DISHES.map((d) => ({
        roundDishId: d.roundDishId,
        vote: 'WANT' as const,
      }));
      const goodBallot = await mock.submitBallot({
        roomId,
        round: 1,
        poolVersion: 1,
        intentId: 'intent_unanimous',
        expectedVersion: 4,
        votes: allVotes,
      });
      expect(goodBallot.ok).toBe(true);
      if (goodBallot.ok) {
        expect(goodBallot.data.accepted).toBe(true);
        expect(goodBallot.data.receipt).toBeDefined();
        expect(goodBallot.data.receipt?.round).toBe(1);
      }

      // 8. Result Decided
      const finalSnap = await mock.getRoomSnapshot(roomId);
      expect(finalSnap.ok).toBe(true);
      if (finalSnap.ok) {
        expect(finalSnap.data.state).toBe('DECIDED');
        expect(finalSnap.data.result?.winnerRoundDishId).toBe(MOCK_DISHES[0]?.roundDishId);
        expect(finalSnap.data.result?.reasonCode).toBe('UNANIMOUS_WANT');
        expect(finalSnap.data.ownSubmission?.intentId).toBe('intent_unanimous');
      }
    });

    it('rejects ballot submission in LOBBY state with INVALID_ROOM_STATE (state validation)', async () => {
      const mock = new MockApiClient({ delayMs: 0 });
      const snap = await mock.getRoomSnapshot('room_mock_001');
      expect(snap.ok).toBe(true);
      if (snap.ok) {
        expect(snap.data.state).toBe('LOBBY');
      }

      const res = await mock.submitBallot({
        roomId: 'room_mock_001',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_illegal',
        expectedVersion: 1,
        votes: MOCK_DISHES.map((d) => ({ roundDishId: d.roundDishId, vote: 'WANT' })),
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('INVALID_ROOM_STATE');
      }
    });

    it('strictly enforces NO cannot become winner (all-NO votes produces NO_CONSENSUS)', async () => {
      const mock = new MockApiClient({ delayMs: 0 });

      // Advance default room to ROUND_1
      await mock.setReady({ roomId: 'room_mock_001', expectedVersion: 1, ready: true });
      await mock.startRound({ roomId: 'room_mock_001', expectedVersion: 2 });

      // Submit ALL-NO ballot
      const allNoVotes = MOCK_DISHES.map((d) => ({
        roundDishId: d.roundDishId,
        vote: 'NO' as const,
      }));

      const res = await mock.submitBallot({
        roomId: 'room_mock_001',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_all_no',
        expectedVersion: 3,
        votes: allNoVotes,
      });

      expect(res.ok).toBe(true);

      const snap = await mock.getRoomSnapshot('room_mock_001');
      expect(snap.ok).toBe(true);
      if (snap.ok) {
        expect(snap.data.state).toBe('NO_CONSENSUS');
        expect(snap.data.result?.winnerDish).toBeNull();
        expect(snap.data.result?.winnerRoundDishId).toBeNull();
        expect(snap.data.result?.reasonCode).toBe('NO_CONSENSUS');
      }
    });

    it('caches idempotent requests by requestId and rejects reused requestId with different payload', async () => {
      const mock = new MockApiClient({ delayMs: 0 });

      // 1. createRoom idempotency
      const createReqId = 'req_create_room_idempotent_01';
      const createRes1 = await mock.createRoom({
        displayName: 'Trang',
        context: {
          anchorId: 'anc_ho_con_rua',
          radiusM: 1000,
          desiredAt: '2026-10-11T12:00:00Z',
          serviceMode: 'dine_in',
          mealSlot: 'lunch',
          avoidRecent: false,
        },
        requestId: createReqId,
      });
      expect(createRes1.ok).toBe(true);
      if (!createRes1.ok) return;

      const createdRoomId = createRes1.data.roomId;

      // Retry createRoom with same requestId -> returns identical roomId
      const createRes2 = await mock.createRoom({
        displayName: 'Trang',
        context: {
          anchorId: 'anc_ho_con_rua',
          radiusM: 1000,
          desiredAt: '2026-10-11T12:00:00Z',
          serviceMode: 'dine_in',
          mealSlot: 'lunch',
          avoidRecent: false,
        },
        requestId: createReqId,
      });
      expect(createRes2.ok).toBe(true);
      if (createRes2.ok) {
        expect(createRes2.data.roomId).toBe(createdRoomId);
      }

      // 2. setReady idempotency: retry with same requestId returns previous ACK without VERSION_CONFLICT
      const readyReqId = 'req_ready_idempotent_01';
      const readyRes1 = await mock.setReady({ roomId: 'room_mock_001', expectedVersion: 1, ready: true, requestId: readyReqId });
      expect(readyRes1.ok).toBe(true);

      const readyResRetry = await mock.setReady({ roomId: 'room_mock_001', expectedVersion: 1, ready: true, requestId: readyReqId });
      expect(readyResRetry.ok).toBe(true);

      // Advance room to ROUND_1
      await mock.startRound({ roomId: 'room_mock_001', expectedVersion: 2 });

      // 3. submitBallot idempotency
      const fixedRequestId = 'req_idempotent_test_001';
      const votes = MOCK_DISHES.map((d) => ({ roundDishId: d.roundDishId, vote: 'WANT' as const }));

      // First submit
      const res1 = await mock.submitBallot({
        roomId: 'room_mock_001',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_first',
        expectedVersion: 3,
        votes,
        requestId: fixedRequestId,
      });
      expect(res1.ok).toBe(true);

      // Retry with same requestId and same body (idempotent ACK)
      const resRetry = await mock.submitBallot({
        roomId: 'room_mock_001',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_first',
        expectedVersion: 3,
        votes,
        requestId: fixedRequestId,
      });
      expect(resRetry.ok).toBe(true);
      if (resRetry.ok && res1.ok) {
        expect(resRetry.data.accepted).toBe(res1.data.accepted);
        expect(resRetry.data.roomVersion).toBe(res1.data.roomVersion);
      }

      // Reused requestId with DIFFERENT body (different intentId) -> rejected with REQUEST_ID_REUSED
      const differentVotes = MOCK_DISHES.map((d) => ({ roundDishId: d.roundDishId, vote: 'OK' as const }));
      const resConflict = await mock.submitBallot({
        roomId: 'room_mock_001',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_different',
        expectedVersion: 3,
        votes: differentVotes,
        requestId: fixedRequestId,
      });
      expect(resConflict.ok).toBe(false);
      if (!resConflict.ok) {
        expect(resConflict.error.messageKey).toBe('REQUEST_ID_REUSED');
      }

      // Reused requestId with DIFFERENT expectedVersion -> rejected with REQUEST_ID_REUSED
      const resConflictVer = await mock.submitBallot({
        roomId: 'room_mock_001',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_first',
        expectedVersion: 99,
        votes,
        requestId: fixedRequestId,
      });
      expect(resConflictVer.ok).toBe(false);
      if (!resConflictVer.ok) {
        expect(resConflictVer.error.messageKey).toBe('REQUEST_ID_REUSED');
      }
    });

    it('supports scenario round_two: transitions to ROUND_2 when round 1 lacks consensus', async () => {
      const mock = new MockApiClient({ delayMs: 0 });
      mock.setScenario('round_two');

      await mock.setReady({ roomId: 'room_mock_001', expectedVersion: 1, ready: true });
      await mock.startRound({ roomId: 'room_mock_001', expectedVersion: 2 });

      const votes = MOCK_DISHES.map((d) => ({ roundDishId: d.roundDishId, vote: 'WANT' as const }));
      const res = await mock.submitBallot({
        roomId: 'room_mock_001',
        round: 1,
        poolVersion: 1,
        intentId: 'intent_round_1',
        expectedVersion: 3,
        votes,
      });

      expect(res.ok).toBe(true);

      const snap = await mock.getRoomSnapshot('room_mock_001');
      expect(snap.ok).toBe(true);
      if (snap.ok) {
        expect(snap.data.round).toBe(2);
        expect(snap.data.state).toBe('ROUND_2');
        expect(snap.data.pool.length).toBeLessThan(MOCK_DISHES.length);
      }
    });

    it('respects configured mock modes (empty, error, expired, stale)', async () => {
      const mock = new MockApiClient({ delayMs: 0 });

      // 1. Empty mode across discovery, friends, inbox, history, offerings
      mock.setMode('empty');
      const emptyAnchors = await mock.getDiscoveryContext();
      expect(emptyAnchors.ok).toBe(true);
      if (emptyAnchors.ok) {
        expect(emptyAnchors.data.anchors).toEqual([]);
      }
      const emptyFriends = await mock.listFriends();
      expect(emptyFriends.ok).toBe(true);
      if (emptyFriends.ok) {
        expect(emptyFriends.data).toEqual([]);
      }
      const emptyInbox = await mock.listPartnerInbox();
      expect(emptyInbox.ok).toBe(true);
      if (emptyInbox.ok) {
        expect(emptyInbox.data).toEqual([]);
      }
      const emptyHistory = await mock.getHistory('personal');
      expect(emptyHistory.ok).toBe(true);
      if (emptyHistory.ok) {
        expect(emptyHistory.data).toEqual([]);
      }
      const emptyOfferings = await mock.getResultOfferings('room_mock_001', 'res_dummy');
      expect(emptyOfferings.ok).toBe(true);
      if (emptyOfferings.ok) {
        expect(emptyOfferings.data).toEqual([]);
      }

      // 2. Error mode across discovery, social, and write operations (no state mutation on failure)
      mock.setMode('error', 'AUTH_REQUIRED');
      const errFriends = await mock.listFriends();
      expect(errFriends.ok).toBe(false);
      if (!errFriends.ok) {
        expect(errFriends.error.messageKey).toBe('AUTH_REQUIRED');
      }

      const errInbox = await mock.listPartnerInbox();
      expect(errInbox.ok).toBe(false);
      if (!errInbox.ok) {
        expect(errInbox.error.messageKey).toBe('AUTH_REQUIRED');
      }

      const errHistory = await mock.getHistory('personal');
      expect(errHistory.ok).toBe(false);
      if (!errHistory.ok) {
        expect(errHistory.error.messageKey).toBe('AUTH_REQUIRED');
      }

      // Write error should not mutate state
      const errLeave = await mock.leaveRoom({ roomId: 'room_mock_001', expectedVersion: 1 });
      expect(errLeave.ok).toBe(false);
      if (!errLeave.ok) {
        expect(errLeave.error.messageKey).toBe('AUTH_REQUIRED');
      }

      // Reset mode to default and verify room state was not mutated by failed leaveRoom
      mock.setMode('default');
      const snapAfterFailedLeave = await mock.getRoomSnapshot('room_mock_001');
      expect(snapAfterFailedLeave.ok).toBe(true);
      if (snapAfterFailedLeave.ok) {
        expect(snapAfterFailedLeave.data.members.some((m) => m.userId === 'usr_me_001')).toBe(true);
      }

      // 3. Expired mode
      mock.setMode('expired');
      const expRes = await mock.getRoomSnapshot('room_mock_001');
      expect(expRes.ok).toBe(false);
      if (!expRes.ok) {
        expect(expRes.error.messageKey).toBe('ROOM_EXPIRED');
      }

      // 4. Stale mode
      mock.setMode('stale');
      const staleRes = await mock.setReady({ roomId: 'room_mock_001', expectedVersion: 1, ready: true });
      expect(staleRes.ok).toBe(false);
      if (!staleRes.ok) {
        expect(staleRes.error.messageKey).toBe('VERSION_CONFLICT');
      }
    });
  });

  describe('Factory createApiClient', () => {
    it('creates appropriate client instances based on mode', () => {
      const realClient = createApiClient('real');
      expect(realClient).toBeInstanceOf(ApiClientImpl);

      const mockClient = createApiClient('mock');
      expect(mockClient).toBeInstanceOf(MockApiClient);
    });
  });
});
