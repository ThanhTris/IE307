/**
 * GM-07 — Unit tests for ApiClient, contracts, and MockApiClient adapter.
 * Verifies request/response serialization, error mapping, timeout behavior,
 * and mock state transitions across all 6 modes.
 */

import {
  ApiClientImpl,
  MockApiClient,
  createApiClient,
  ApiTransport,
  TransportOptions,
  MOCK_ANCHORS,
  MOCK_DISHES,
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
  });

  describe('MockApiClient State Transitions and Modes', () => {
    it('executes the core room lifecycle in default mode', async () => {
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

      // 4. Verify Snapshot
      const snap1 = await mock.getRoomSnapshot(roomId);
      expect(snap1.ok).toBe(true);
      if (snap1.ok) {
        expect(snap1.data.state).toBe('LOBBY');
        expect(snap1.data.members.length).toBe(1);
        expect(snap1.data.members[0]?.displayName).toBe('Trang');
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

      // 7. Submit Ballot (Incomplete vs Complete)
      const badBallot = await mock.submitBallot({
        roomId,
        round: 1,
        poolVersion: 1,
        intentId: 'intent_1',
        expectedVersion: 4,
        votes: [{ roundDishId: 'rd_01', vote: 'WANT' }], // Missing other dishes
      });
      expect(badBallot.ok).toBe(false);
      if (!badBallot.ok) {
        expect(badBallot.error.messageKey).toBe('INCOMPLETE_BALLOT');
      }

      const allVotes = MOCK_DISHES.map((d) => ({
        roundDishId: d.roundDishId,
        vote: 'WANT' as const,
      }));
      const goodBallot = await mock.submitBallot({
        roomId,
        round: 1,
        poolVersion: 1,
        intentId: 'intent_2',
        expectedVersion: 4,
        votes: allVotes,
      });
      expect(goodBallot.ok).toBe(true);
      if (goodBallot.ok) {
        expect(goodBallot.data.accepted).toBe(true);
        expect(goodBallot.data.allMembersSubmitted).toBe(true);
      }

      // 8. Result Finalized
      const finalSnap = await mock.getRoomSnapshot(roomId);
      expect(finalSnap.ok).toBe(true);
      if (finalSnap.ok) {
        expect(finalSnap.data.state).toBe('FINALIZED');
        expect(finalSnap.data.result?.winnerRoundDishId).toBe(MOCK_DISHES[0]?.roundDishId);
      }
    });

    it('respects configured mock modes (empty, error, expired, stale)', async () => {
      const mock = new MockApiClient({ delayMs: 0 });

      // Empty mode
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

      // Error mode
      mock.setMode('error', 'OUT_OF_COVERAGE');
      const errRes = await mock.previewFoodPool({
        anchorId: 'anc_outside',
        radiusM: 500,
        desiredAt: '2026-10-11T12:00:00Z',
        serviceMode: 'dine_in',
        mealSlot: 'lunch',
      });
      expect(errRes.ok).toBe(false);
      if (!errRes.ok) {
        expect(errRes.error.messageKey).toBe('OUT_OF_COVERAGE');
      }

      // Expired mode
      mock.setMode('expired');
      const expRes = await mock.getRoomSnapshot('room_mock_001');
      expect(expRes.ok).toBe(false);
      if (!expRes.ok) {
        expect(expRes.error.messageKey).toBe('ROOM_EXPIRED');
      }

      // Stale mode
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
