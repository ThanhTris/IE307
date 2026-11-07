import {
  CANONICAL_RESULT_CONTRACT_VERSION,
  CANONICAL_RESULT_POLICY_VERSION,
  LiveResultRepository,
  createMockResultRepository,
  mapRawToResultDish,
  mapRawToScoredResult,
  mapSnapshotMembersToCompanions,
} from '../../src/features/result/services/resultRepository';
import type { ResultDish } from '../../src/features/result/services/resultPresentation';

describe('GM-27 ResultRepository', () => {
  const validWinner: ResultDish = {
    dishId: '00000000-0000-4000-8000-000000000010',
    roundDishId: '00000000-0000-4000-8000-000000000020',
    name: 'Phở bò tái nạm',
    description: 'Phở truyền thống',
    artwork: {
      uri: 'https://example.com/pho.jpg',
      altText: 'Phở bò tái nạm',
      attribution: null,
    },
    priceReference: {
      amount: 65000,
      currency: 'VND',
      unit: 'portion',
      servingSize: null,
      sourceRef: 'Menu',
      checkedAt: '2026-11-06T10:00:00Z',
    },
  };

  const validDish2: ResultDish = {
    dishId: '00000000-0000-4000-8000-000000000011',
    roundDishId: '00000000-0000-4000-8000-000000000021',
    name: 'Cơm tấm sườn bì',
    description: null,
    artwork: null,
    priceReference: {
      amount: 55000,
      currency: 'VND',
      unit: 'portion',
      servingSize: null,
      sourceRef: 'Menu',
      checkedAt: '2026-11-06T10:00:00Z',
    },
  };

  const validDish3: ResultDish = {
    dishId: '00000000-0000-4000-8000-000000000012',
    roundDishId: '00000000-0000-4000-8000-000000000022',
    name: 'Bún bò Huế',
    description: null,
    artwork: null,
    priceReference: null,
  };

  const canonicalDecidedPayload = {
    resultId: '00000000-0000-4000-8000-000000000100',
    contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
    policyVersion: CANONICAL_RESULT_POLICY_VERSION,
    status: 'DECIDED',
    round: 2,
    reasonCode: 'ACCEPTABLE_FINAL',
    finalizedAt: '2026-11-06T10:05:00Z',
    scoreVersion: 'want2-ok1-round1-v1',
    rankingVersion: 'score-desc-dense-rank-v1',
    round1BallotCount: 4,
    winner: validWinner,
    topDishes: [
      { dish: validWinner, score: 7, rank: 1, isWinner: true },
      { dish: validDish2, score: 6, rank: 2, isWinner: false },
      { dish: validDish3, score: 5, rank: 3, isWinner: false },
    ],
  };

  describe('mapRawToResultDish', () => {
    test('maps valid dish projection correctly', () => {
      const mapped = mapRawToResultDish(validWinner);
      expect(mapped).toEqual(validWinner);
    });

    test('rejects dish with missing roundDishId (does not fallback to dishId)', () => {
      const missingRoundDishId = {
        dishId: '00000000-0000-4000-8000-000000000010',
        name: 'Phở bò tái nạm',
      };
      expect(mapRawToResultDish(missingRoundDishId)).toBeNull();
    });

    test('priceReference is null when sourceRef and source are missing (does not fabricate Menu)', () => {
      const dishWithoutSource = {
        dishId: '00000000-0000-4000-8000-000000000010',
        roundDishId: '00000000-0000-4000-8000-000000000020',
        name: 'Phở bò tái nạm',
        priceReference: {
          amount: 65000,
          currency: 'VND',
          unit: 'portion',
          checkedAt: '2026-11-06T10:00:00Z',
        },
      };
      const mapped = mapRawToResultDish(dishWithoutSource);
      expect(mapped).not.toBeNull();
      expect(mapped!.priceReference).toBeNull();
    });

    test('priceReference is null when amount is null or non-positive', () => {
      const dishWithNullAmount = {
        dishId: '00000000-0000-4000-8000-000000000010',
        roundDishId: '00000000-0000-4000-8000-000000000020',
        name: 'Phở bò tái nạm',
        priceReference: {
          amount: null,
          currency: 'VND',
          unit: 'portion',
          sourceRef: 'Menu',
          checkedAt: '2026-11-06T10:00:00Z',
        },
      };
      const mapped = mapRawToResultDish(dishWithNullAmount);
      expect(mapped).not.toBeNull();
      expect(mapped!.priceReference).toBeNull();
    });

    test('priceReference is null when checkedAt timestamp is invalid', () => {
      const dishWithBadDate = {
        dishId: '00000000-0000-4000-8000-000000000010',
        roundDishId: '00000000-0000-4000-8000-000000000020',
        name: 'Phở bò tái nạm',
        priceReference: {
          amount: 65000,
          currency: 'VND',
          unit: 'portion',
          sourceRef: 'Menu',
          checkedAt: 'not-a-date',
        },
      };
      const mapped = mapRawToResultDish(dishWithBadDate);
      expect(mapped).not.toBeNull();
      expect(mapped!.priceReference).toBeNull();
    });

    test('rejects dish missing dishId, roundDishId, or name', () => {
      expect(mapRawToResultDish(null)).toBeNull();
      expect(mapRawToResultDish({})).toBeNull();
      expect(mapRawToResultDish({ dishId: 'd1', name: '' })).toBeNull();
      expect(mapRawToResultDish({ roundDishId: 'r1', name: 'Dish' })).toBeNull();
    });

    test('handles fallback artwork url and observedAt in priceReference', () => {
      const raw = {
        dishId: 'd1',
        roundDishId: 'r1',
        name: 'Món ăn',
        artwork: { url: 'https://example.com/art.png' },
        priceReference: {
          amount: 40000,
          currency: 'VND',
          unit: 'portion',
          sourceRef: 'Menu quán',
          observedAt: '2026-11-06T10:00:00Z',
        },
      };
      const mapped = mapRawToResultDish(raw);
      expect(mapped).not.toBeNull();
      expect(mapped?.artwork?.uri).toBe('https://example.com/art.png');
      expect(mapped?.priceReference?.checkedAt).toBe('2026-11-06T10:00:00Z');
      expect(mapped?.priceReference?.sourceRef).toBe('Menu quán');
    });
  });

  describe('mapRawToScoredResult', () => {
    test('maps valid DECIDED canonical result', () => {
      const result = mapRawToScoredResult(canonicalDecidedPayload);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('DECIDED');
      expect(result?.topDishes).toHaveLength(3);
      expect(result?.topDishes[0]?.isWinner).toBe(true);
      expect(result?.topDishes[0]?.rank).toBe(1);
    });

    test('maps valid tied podium (dense ranks 1, 1, 2)', () => {
      const tiedPayload = {
        ...canonicalDecidedPayload,
        topDishes: [
          { dish: validWinner, score: 7, rank: 1, isWinner: true },
          { dish: validDish2, score: 7, rank: 1, isWinner: false },
          { dish: validDish3, score: 5, rank: 2, isWinner: false },
        ],
      };
      const result = mapRawToScoredResult(tiedPayload);
      expect(result).not.toBeNull();
      expect(result?.topDishes[0]?.rank).toBe(1);
      expect(result?.topDishes[1]?.rank).toBe(1);
      expect(result?.topDishes[2]?.rank).toBe(2);
    });

    test('maps valid NO_CONSENSUS round 1 (EMPTY_INTERSECTION)', () => {
      const payload = {
        resultId: '00000000-0000-4000-8000-000000000101',
        contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
        policyVersion: CANONICAL_RESULT_POLICY_VERSION,
        status: 'NO_CONSENSUS',
        round: 1,
        reasonCode: 'EMPTY_INTERSECTION',
        finalizedAt: '2026-11-06T10:05:00Z',
        scoreVersion: null,
        rankingVersion: null,
        round1BallotCount: 3,
        winner: null,
        topDishes: [],
      };
      const result = mapRawToScoredResult(payload);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('NO_CONSENSUS');
      expect(result?.reasonCode).toBe('EMPTY_INTERSECTION');
      expect(result?.topDishes).toEqual([]);
    });

    test('maps valid NO_CONSENSUS round 2 (ALL_REMOVED)', () => {
      const payload = {
        resultId: '00000000-0000-4000-8000-000000000102',
        contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
        policyVersion: CANONICAL_RESULT_POLICY_VERSION,
        status: 'NO_CONSENSUS',
        round: 2,
        reasonCode: 'ALL_REMOVED',
        finalizedAt: '2026-11-06T10:05:00Z',
        scoreVersion: null,
        rankingVersion: null,
        round1BallotCount: 3,
        winner: null,
        topDishes: [],
      };
      const result = mapRawToScoredResult(payload);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('NO_CONSENSUS');
      expect(result?.reasonCode).toBe('ALL_REMOVED');
    });

    test('rejects score exceeding 2 * round1BallotCount', () => {
      const invalidScorePayload = {
        ...canonicalDecidedPayload,
        round1BallotCount: 2, // max score is 2 * 2 = 4
        topDishes: [
          { dish: validWinner, score: 5, rank: 1, isWinner: true }, // 5 > 4!
        ],
      };
      expect(mapRawToScoredResult(invalidScorePayload)).toBeNull();
    });

    test('rejects invalid dense ranking', () => {
      const invalidRankPayload = {
        ...canonicalDecidedPayload,
        topDishes: [
          { dish: validWinner, score: 7, rank: 1, isWinner: true },
          { dish: validDish2, score: 6, rank: 3, isWinner: false }, // skipped rank 2!
        ],
      };
      expect(mapRawToScoredResult(invalidRankPayload)).toBeNull();
    });

    test('rejects mismatched status and reasonCode', () => {
      const mismatch = {
        ...canonicalDecidedPayload,
        reasonCode: 'EMPTY_INTERSECTION', // DECIDED cannot have EMPTY_INTERSECTION
      };
      expect(mapRawToScoredResult(mismatch)).toBeNull();
    });

    test('rejects DECIDED with round 1 and ACCEPTABLE_FINAL', () => {
      const mismatchRound = {
        ...canonicalDecidedPayload,
        round: 1,
        reasonCode: 'ACCEPTABLE_FINAL', // round 1 must be UNANIMOUS_WANT
      };
      expect(mapRawToScoredResult(mismatchRound)).toBeNull();
    });

    test('rejects winner dish that does not match topDishes[0]', () => {
      const winnerMismatch = {
        ...canonicalDecidedPayload,
        topDishes: [
          { dish: validDish2, score: 7, rank: 1, isWinner: true }, // dish2 is winner, but top-level winner is validWinner!
        ],
      };
      expect(mapRawToScoredResult(winnerMismatch)).toBeNull();
    });

    // Reviewer audit cases (8 malformed contract rejection tests)
    test('rejects payload missing contractVersion', () => {
      const { contractVersion: _, ...rest } = canonicalDecidedPayload;
      expect(mapRawToScoredResult(rest)).toBeNull();
    });

    test('rejects payload missing policyVersion', () => {
      const { policyVersion: _, ...rest } = canonicalDecidedPayload;
      expect(mapRawToScoredResult(rest)).toBeNull();
    });

    test('rejects payload missing scoreVersion', () => {
      const { scoreVersion: _, ...rest } = canonicalDecidedPayload;
      expect(mapRawToScoredResult(rest)).toBeNull();
    });

    test('rejects payload missing rankingVersion', () => {
      const { rankingVersion: _, ...rest } = canonicalDecidedPayload;
      expect(mapRawToScoredResult(rest)).toBeNull();
    });

    test('rejects payload with unsupported scoreVersion', () => {
      const payload = { ...canonicalDecidedPayload, scoreVersion: 'unsupported-v99' };
      expect(mapRawToScoredResult(payload)).toBeNull();
    });

    test('rejects payload with unsupported rankingVersion', () => {
      const payload = { ...canonicalDecidedPayload, rankingVersion: 'unsupported-v99' };
      expect(mapRawToScoredResult(payload)).toBeNull();
    });

    test('rejects DECIDED payload where winner or podium dish lacks roundDishId', () => {
      const winnerWithoutRoundId = {
        ...validWinner,
        roundDishId: '',
      };
      const payload = {
        ...canonicalDecidedPayload,
        winner: winnerWithoutRoundId,
        topDishes: [
          { dish: winnerWithoutRoundId, score: 7, rank: 1, isWinner: true },
        ],
      };
      expect(mapRawToScoredResult(payload)).toBeNull();
    });

    test('rejects NO_CONSENSUS payload when winner or topDishes is non-empty', () => {
      const noConsensusWithWinner = {
        resultId: '00000000-0000-4000-8000-000000000101',
        contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
        policyVersion: CANONICAL_RESULT_POLICY_VERSION,
        status: 'NO_CONSENSUS',
        round: 1,
        reasonCode: 'EMPTY_INTERSECTION',
        finalizedAt: '2026-11-06T10:05:00Z',
        scoreVersion: null,
        rankingVersion: null,
        round1BallotCount: 3,
        winner: validWinner, // Should be null!
        topDishes: [],
      };
      expect(mapRawToScoredResult(noConsensusWithWinner)).toBeNull();

      const noConsensusWithTopDishes = {
        ...noConsensusWithWinner,
        winner: null,
        topDishes: [{ dish: validWinner, score: 0, rank: 1, isWinner: false }], // Should be empty!
      };
      expect(mapRawToScoredResult(noConsensusWithTopDishes)).toBeNull();
    });

    test('rejects payload missing any of the 4 required wire keys ($defs.terminalResult.required)', () => {
      const base = {
        resultId: '00000000-0000-4000-8000-000000000101',
        contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
        policyVersion: CANONICAL_RESULT_POLICY_VERSION,
        status: 'NO_CONSENSUS',
        round: 1,
        reasonCode: 'EMPTY_INTERSECTION',
        finalizedAt: '2026-11-06T10:05:00Z',
        scoreVersion: null,
        rankingVersion: null,
        round1BallotCount: 3,
        winner: null,
        topDishes: [],
      };

      const missingWinner = { ...base };
      delete (missingWinner as any).winner;
      expect(mapRawToScoredResult(missingWinner)).toBeNull();

      const missingTopDishes = { ...base };
      delete (missingTopDishes as any).topDishes;
      expect(mapRawToScoredResult(missingTopDishes)).toBeNull();

      const missingScoreVersion = { ...base };
      delete (missingScoreVersion as any).scoreVersion;
      expect(mapRawToScoredResult(missingScoreVersion)).toBeNull();

      const missingRankingVersion = { ...base };
      delete (missingRankingVersion as any).rankingVersion;
      expect(mapRawToScoredResult(missingRankingVersion)).toBeNull();
    });

    test('rejects NO_CONSENSUS payload when scoreVersion or rankingVersion is not null', () => {
      const base = {
        resultId: '00000000-0000-4000-8000-000000000101',
        contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
        policyVersion: CANONICAL_RESULT_POLICY_VERSION,
        status: 'NO_CONSENSUS',
        round: 1,
        reasonCode: 'EMPTY_INTERSECTION',
        finalizedAt: '2026-11-06T10:05:00Z',
        round1BallotCount: 3,
        winner: null,
        topDishes: [],
      };

      expect(mapRawToScoredResult({ ...base, scoreVersion: 'want2-ok1-round1-v1', rankingVersion: null })).toBeNull();
      expect(mapRawToScoredResult({ ...base, scoreVersion: null, rankingVersion: 'score-desc-dense-rank-v1' })).toBeNull();
    });
  });

  describe('mapSnapshotMembersToCompanions', () => {
    test('maps unique members with fallback labels', () => {
      const members = [
        { userId: 'u1', displayName: 'Tuấn' },
        { userId: 'u2', nickname: 'Trang' },
        { id: 'u3' },
        { userId: 'u1', displayName: 'Tuấn Duplicate' },
      ];
      const companions = mapSnapshotMembersToCompanions(members);
      expect(companions).toEqual([
        { id: 'u1', label: 'Tuấn' },
        { id: 'u2', label: 'Trang' },
        { id: 'u3', label: 'Thành viên' },
      ]);
    });
  });

  describe('LiveResultRepository', () => {
    test('rejects invalid roomId with INVALID_INPUT', async () => {
      const repo = new LiveResultRepository();
      const res = await repo.getResult('');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('INVALID_INPUT');
      }
    });

    test('fetches canonical scored-v4 result via RPC caller', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: canonicalDecidedPayload,
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });
      const res = await repo.getResult('room_123');

      expect(mockRpc).toHaveBeenCalledWith('dish_session', {
        command: 'result',
        payload: {
          contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
          roomId: 'room_123',
        },
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.capability).toBe('scored-v4');
        if (res.data.capability === 'scored-v4') {
          expect(res.data.result.resultId).toBe(canonicalDecidedPayload.resultId);
          expect(res.data.result.status).toBe('DECIDED');
          expect(res.data.result.topDishes).toHaveLength(3);
        }
      }
    });

    test('caches terminal result across multiple calls for the same room', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: canonicalDecidedPayload,
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });
      const first = await repo.getResult('room_123');
      const second = await repo.getResult('room_123');

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(first).toEqual(second);

      // forceRefetch should bypass cache
      await repo.getResult('room_123', { forceRefetch: true });
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    test('invalidates cache when server returns authorization or session failure (NOT_MEMBER, AUTH_REQUIRED, ROOM_EXPIRED)', async () => {
      let callCount = 0;
      const mockRpc = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: true, data: canonicalDecidedPayload };
        }
        return { ok: false, error: { messageKey: 'NOT_MEMBER' } };
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });

      // Step 1: Initial read succeeds and caches
      const res1 = await repo.getResult('room_123');
      expect(res1.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Step 2: Forced refetch receives NOT_MEMBER
      const res2 = await repo.getResult('room_123', { forceRefetch: true });
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.error.messageKey).toBe('NOT_MEMBER');
      }
      expect(mockRpc).toHaveBeenCalledTimes(2);

      // Step 3: Subsequent getResult('room_123') must NOT return stale cached result
      const res3 = await repo.getResult('room_123');
      expect(res3.ok).toBe(false);
      expect(mockRpc).toHaveBeenCalledTimes(3);
    });

    test('partitions cache by identity and supports clearCache and invalidateRoom', async () => {
      let currentIdentity = 'user_1';
      const mockRpc = jest.fn().mockResolvedValue({ ok: true, data: canonicalDecidedPayload });
      const repo = new LiveResultRepository({
        rpcCaller: mockRpc,
        getCurrentIdentity: () => currentIdentity,
      });

      // Read as user_1
      await repo.getResult('room_123');
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Read again as user_1 -> cache hit
      await repo.getResult('room_123');
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Switch identity to user_2 -> cache miss, calls server
      currentIdentity = 'user_2';
      await repo.getResult('room_123');
      expect(mockRpc).toHaveBeenCalledTimes(2);

      // Invalidate room
      repo.invalidateRoom('room_123');
      await repo.getResult('room_123');
      expect(mockRpc).toHaveBeenCalledTimes(3);

      // Clear all cache
      repo.clearCache();
      await repo.getResult('room_123');
      expect(mockRpc).toHaveBeenCalledTimes(4);
    });

    test('late response after room invalidation does not re-populate cache', async () => {
      let resolveFirstCall: (val: any) => void;
      const firstCallPromise = new Promise(resolve => {
        resolveFirstCall = resolve;
      });

      const mockRpc = jest.fn().mockImplementationOnce(() => firstCallPromise);
      const repo = new LiveResultRepository({ rpcCaller: mockRpc });

      // Start in-flight request
      const inFlight = repo.getResult('room_late');

      // Invalidate room while request is in flight
      repo.invalidateRoom('room_late');

      // First call resolves late
      resolveFirstCall!({ ok: true, data: canonicalDecidedPayload });
      const inFlightRes = await inFlight;

      // Monotonic epoch guard rejects late in-flight resolution
      expect(inFlightRes.ok).toBe(false);
      if (!inFlightRes.ok) {
        expect(inFlightRes.error.messageKey).toBe('CONTEXT_CHANGED');
      }

      // Subsequent read must call server again rather than hitting cache
      mockRpc.mockResolvedValueOnce({ ok: true, data: canonicalDecidedPayload });
      await repo.getResult('room_late');
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    test('monotonic epoch guard: in-flight request aborted and cache blocked when clearCache is called', async () => {
      let resolveFirstCall: (val: any) => void;
      const firstCallPromise = new Promise(resolve => {
        resolveFirstCall = resolve;
      });

      const mockRpc = jest.fn().mockImplementationOnce(() => firstCallPromise);
      const repo = new LiveResultRepository({ rpcCaller: mockRpc });

      // Start in-flight request
      const inFlight = repo.getResult('room_flight');

      // Clear all cache while request is in flight
      repo.clearCache();

      // Resolve late
      resolveFirstCall!({ ok: true, data: canonicalDecidedPayload });
      const res = await inFlight;

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('CONTEXT_CHANGED');
      }

      // Cache was NOT populated
      mockRpc.mockResolvedValueOnce({ ok: true, data: canonicalDecidedPayload });
      await repo.getResult('room_flight');
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    test('dual error path: RPC throwing 401 or 403 invalidates room cache', async () => {
      const mockRpc = jest.fn()
        .mockResolvedValueOnce({ ok: true, data: canonicalDecidedPayload })
        .mockRejectedValueOnce({ status: 401, body: { message: 'Unauthorized' } });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });

      // First call succeeds and caches
      const firstRes = await repo.getResult('room_auth_loss');
      expect(firstRes.ok).toBe(true);

      // Second call with forceRefetch throws 401
      const secondRes = await repo.getResult('room_auth_loss', { forceRefetch: true });
      expect(secondRes.ok).toBe(false);
      if (!secondRes.ok) {
        expect(secondRes.error.messageKey).toBe('AUTH_REQUIRED');
      }

      // Third call should not hit cache because room was invalidated
      mockRpc.mockResolvedValueOnce({ ok: true, data: canonicalDecidedPayload });
      await repo.getResult('room_auth_loss');
      expect(mockRpc).toHaveBeenCalledTimes(3);
    });

    test('dual error path: transient network error does not invalidate room cache', async () => {
      const mockRpc = jest.fn()
        .mockResolvedValueOnce({ ok: true, data: canonicalDecidedPayload })
        .mockRejectedValueOnce(new Error('Network request failed'));

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });

      // First call succeeds and caches
      const firstRes = await repo.getResult('room_net_transient');
      expect(firstRes.ok).toBe(true);

      // Force refetch fails with network error
      const secondRes = await repo.getResult('room_net_transient', { forceRefetch: true });
      expect(secondRes.ok).toBe(false);

      // Normal read (not forced) should still find the cached winner
      const thirdRes = await repo.getResult('room_net_transient');
      expect(thirdRes.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    test('resolves current identity from roomRepository.getCurrentUser() by default and responds to session switch', async () => {
      let currentUser: { id: string } | null = { id: 'user_live_01' };
      const listeners: (() => void)[] = [];

      const mockRoomRepo = {
        getCurrentUser: jest.fn(() => currentUser),
        subscribeSession: jest.fn((listener: () => void) => {
          listeners.push(listener);
          return () => {
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
          };
        }),
      } as any;

      const mockRpc = jest.fn().mockResolvedValue({ ok: true, data: canonicalDecidedPayload });
      const repo = new LiveResultRepository({
        roomRepository: mockRoomRepo,
        rpcCaller: mockRpc,
      });

      // Reads identity as user_live_01
      expect(repo.resolveCurrentIdentity()).toBe('user_live_01');

      // First fetch caches under user_live_01:room_id
      await repo.getResult('room_session_test');
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Fetch again -> cache hit
      await repo.getResult('room_session_test');
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // Switch user on room repo and trigger session listener
      currentUser = { id: 'user_live_02' };
      listeners.forEach(fn => fn());

      // Fetch again -> cache miss because cache was cleared and identity changed
      await repo.getResult('room_session_test');
      expect(mockRpc).toHaveBeenCalledTimes(2);

      repo.dispose();
    });

    test('handles RESULT_NOT_READY gracefully as NOT_READY', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: false,
        error: { messageKey: 'RESULT_NOT_READY' },
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });
      const res = await repo.getResult('room_123');

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('NOT_READY');
      }
    });

    test('maps server error codes faithfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: false,
        error: { messageKey: 'NOT_MEMBER' },
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });
      const res = await repo.getResult('room_123');

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('NOT_MEMBER');
      }
    });

    test('rejects malformed response with MALFORMED_RESPONSE', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: { invalidField: true },
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });
      const res = await repo.getResult('room_123');

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('MALFORMED_RESPONSE');
      }
    });

    test('fetches legacy unscored result if room is legacy', async () => {
      const legacyPayload = {
        resultId: 'res_leg_1',
        roomId: 'room_123',
        round: 1,
        policyVersion: 'decision-v2',
        matchTier: 'PERFECT',
        reasonCode: 'UNANIMOUS_WANT',
        finalizedAt: '2026-11-06T10:00:00Z',
        winnerRoundDishId: 'r1',
        winnerDish: {
          dishId: 'd1',
          roundDishId: 'r1',
          name: 'Phở bò',
        },
      };

      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: legacyPayload,
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });
      const res = await repo.getResult('room_123');

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.capability).toBe('legacy-unscored-v1');
      }
    });

    test('Places error does NOT alter canonical result', async () => {
      const mockPlacesFetcher = jest.fn().mockRejectedValue(new Error('Places quota exceeded'));

      const repo = new LiveResultRepository({
        rpcCaller: jest.fn().mockResolvedValue({ ok: true, data: canonicalDecidedPayload }),
        placesFetcher: mockPlacesFetcher,
      });

      const resultRes = await repo.getResult('room_123');
      expect(resultRes.ok).toBe(true);

      const placesRes = await repo.fetchNearbyPlaces({
        resultId: canonicalDecidedPayload.resultId,
        winnerDishId: validWinner.dishId,
      });

      expect(placesRes.ok).toBe(true);
      if (placesRes.ok) {
        expect(placesRes.data.status).toBe('error');
        expect(placesRes.data.places).toEqual([]);
      }

      // Re-verifying result is unchanged
      const checkResult = await repo.getResult('room_123');
      expect(checkResult).toEqual(resultRes);
    });
  });

  describe('MockResultRepository', () => {
    test('returns default mock scored result', async () => {
      const mockRepo = createMockResultRepository();
      const res = await mockRepo.getResult('mock_room');
      expect(res.ok).toBe(true);
      if (res.ok && res.data.capability === 'scored-v4') {
        expect(res.data.result.status).toBe('DECIDED');
        expect(res.data.result.winner?.name).toBe('Phở bò tái nạm');
      }
    });

    test('simulates finalizing and error readStates', async () => {
      const finalizingRepo = createMockResultRepository({ readState: 'finalizing' });
      const finalizingRes = await finalizingRepo.getResult('mock_room');
      expect(finalizingRes.ok).toBe(false);
      if (!finalizingRes.ok) {
        expect(finalizingRes.error.messageKey).toBe('NOT_READY');
      }

      const errorRepo = createMockResultRepository({ readState: 'error', errorCode: 'TIMEOUT' });
      const errorRes = await errorRepo.getResult('mock_room');
      expect(errorRes.ok).toBe(false);
      if (!errorRes.ok) {
        expect(errorRes.error.messageKey).toBe('TIMEOUT');
      }
    });
  });
});
