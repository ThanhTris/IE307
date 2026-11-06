import {
  CANONICAL_VOTE_CONTRACT_VERSION,
  createDurableRequestId,
  createLiveVoteRepository,
  createMockVoteRepository,
  mapSnapshotPoolToPoolDishes,
} from '../../src/features/voting/services/voteRepository';
import {
  getRoundTwoEliminationCap,
  isHostEarlyFinishAllowed,
} from '../../src/features/voting/fixtures';
import type { BallotVoteItem, PoolDish, RoomSnapshot } from '../../src/data/api';

describe('GM-26 — Vote Repository Unit Suite (Issue #87)', () => {
  const dummyPool: PoolDish[] = [
    {
      roundDishId: 'dish_01',
      choiceId: 'choice_01',
      dishId: 'food_01',
      name: 'Phở bò',
      cuisineIds: ['cui_vn'],
      categoryIds: ['cat_soup'],
      origin: 'north',
      temperature: 'hot',
      priceMin: 50000,
      priceMax: 60000,
      currency: 'VND',
    },
    {
      roundDishId: 'dish_02',
      choiceId: 'choice_02',
      dishId: 'food_02',
      name: 'Bún chả',
      cuisineIds: ['cui_vn'],
      categoryIds: ['cat_noodle'],
      origin: 'north',
      temperature: 'warm',
      priceMin: 45000,
      priceMax: 55000,
      currency: 'VND',
    },
  ];

  describe('Durable Request ID Generator', () => {
    it('generates unique, collision-resistant IDs with specified prefix', () => {
      const id1 = createDurableRequestId('vote');
      const id2 = createDurableRequestId('vote');
      expect(id1).toMatch(/^vote_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^vote_[a-z0-9]+_[a-z0-9]+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Round 2 Elimination Cap: cap = max(1, floor(0.30 * N))', () => {
    it('enforces cap = 1 for N = 1 (Node 638:9369 special case)', () => {
      expect(getRoundTwoEliminationCap(1)).toBe(1);
    });

    it('enforces cap = 1 for N = 2..6', () => {
      expect(getRoundTwoEliminationCap(2)).toBe(1);
      expect(getRoundTwoEliminationCap(3)).toBe(1);
      expect(getRoundTwoEliminationCap(4)).toBe(1);
      expect(getRoundTwoEliminationCap(5)).toBe(1);
      expect(getRoundTwoEliminationCap(6)).toBe(1);
    });

    it('enforces cap = 2 for N = 7..9', () => {
      expect(getRoundTwoEliminationCap(7)).toBe(2);
      expect(getRoundTwoEliminationCap(8)).toBe(2);
      expect(getRoundTwoEliminationCap(9)).toBe(2);
    });

    it('enforces cap = 3 for N = 10..13', () => {
      expect(getRoundTwoEliminationCap(10)).toBe(3);
      expect(getRoundTwoEliminationCap(12)).toBe(3);
      expect(getRoundTwoEliminationCap(13)).toBe(3);
    });

    it('returns 0 for non-positive candidate counts', () => {
      expect(getRoundTwoEliminationCap(0)).toBe(0);
      expect(getRoundTwoEliminationCap(-5)).toBe(0);
    });
  });

  describe('Host Early Finish Quorum: A_r > M/2', () => {
    it('blocks early finish when A_r is less than or equal to half the roster', () => {
      // 1 out of 3: 1 <= 1.5 -> false
      expect(isHostEarlyFinishAllowed(1, 3)).toBe(false);
      // Exactly half: 1 out of 2: 1 <= 1.0 -> false
      expect(isHostEarlyFinishAllowed(1, 2)).toBe(false);
      // Exactly half: 2 out of 4: 2 <= 2.0 -> false
      expect(isHostEarlyFinishAllowed(2, 4)).toBe(false);
      // 2 out of 5: 2 <= 2.5 -> false
      expect(isHostEarlyFinishAllowed(2, 5)).toBe(false);
      // 0 out of any: false
      expect(isHostEarlyFinishAllowed(0, 3)).toBe(false);
      expect(isHostEarlyFinishAllowed(2, 0)).toBe(false);
    });

    it('permits early finish only when strictly more than half has acknowledged ballots', () => {
      // 2 out of 3: 2 > 1.5 -> true
      expect(isHostEarlyFinishAllowed(2, 3)).toBe(true);
      // 2 out of 2: 2 > 1.0 -> true
      expect(isHostEarlyFinishAllowed(2, 2)).toBe(true);
      // 3 out of 4: 3 > 2.0 -> true
      expect(isHostEarlyFinishAllowed(3, 4)).toBe(true);
      // 3 out of 5: 3 > 2.5 -> true
      expect(isHostEarlyFinishAllowed(3, 5)).toBe(true);
      // Single person room: 1 out of 1: 1 > 0.5 -> true
      expect(isHostEarlyFinishAllowed(1, 1)).toBe(true);
    });
  });

  describe('LiveVoteRepository with RPC Dispatch', () => {
    it('does not dispatch a persisted ballot after identity changes while enqueue is pending', async () => {
      let userId = 'user-A';
      let resolveEnqueue: (() => void) | undefined;
      const enqueuePending = new Promise<void>(resolve => { resolveEnqueue = resolve; });
      const rpc = jest.fn();
      const outbox = {
        findEquivalent: jest.fn().mockResolvedValue(undefined),
        enqueue: jest.fn(async () => { await enqueuePending; return {}; }),
        markUnknown: jest.fn().mockResolvedValue(undefined),
      };
      const roomRepository = {
        getCurrentUser: () => ({ id: userId }),
        getIdentityRevision: () => userId === 'user-A' ? 1 : 2,
        getSessionApi: () => ({ getGeneration: () => userId === 'user-A' ? 10 : 11 }),
        getSessionStatus: () => 'active',
        getRpcCaller: () => rpc,
      } as unknown as import('../../src/features/rooms/services/roomRepository').RoomRepository;
      const repo = createLiveVoteRepository({ roomRepository, outbox: outbox as any });
      const submitted = repo.submitBallot({
        roomId: 'room-identity-race', round: 1, poolVersion: 1, expectedVersion: 1,
        requestId: 'identity-race-request', votes: [{ roundDishId: 'dish_01', vote: 'WANT' }],
      });
      await Promise.resolve();
      userId = 'user-B';
      resolveEnqueue?.();
      expect(await submitted).toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
      expect(rpc).not.toHaveBeenCalled();
      expect(outbox.markUnknown).toHaveBeenCalledWith('user-A', 'identity-race-request');
    });

    it('reuses the original request and expected version when a same-scope room version advanced', async () => {
      const snapshot = {
        roomId: 'room-version-range', code: 'ABC123', state: 'ROUND_1', version: 13, hostUserId: 'user-A',
        context: { anchorId: 'anchor-1', radiusM: 1000, desiredAt: '2026-11-07T00:00:00Z', serviceMode: 'dine_in', mealSlot: 'lunch', avoidRecent: false },
        members: [{ userId: 'user-A', displayName: 'A', isHost: true, ready: true, joinedAt: '2026-11-07T00:00:00Z' }],
        round: 1, poolVersion: 1, pool: [], expiresAt: '2027-11-07T00:00:00Z',
      };
      const rpc = jest.fn(async (_name: string, { command }: any) => command === 'snapshot'
        ? { ok: true, data: snapshot }
        : { ok: false, error: { messageKey: 'NETWORK_ERROR' } });
      const previous = {
        requestId: 'stable-request', expectedVersion: 12,
        payload: { intentId: 'stable-intent', votes: [{ roundDishId: 'dish_01', choice: 'WANT' }] },
      };
      const outbox = {
        findEquivalent: jest.fn().mockResolvedValue(previous),
        cacheSnapshot: jest.fn().mockResolvedValue(undefined),
        reconcileBeforeReplay: jest.fn().mockResolvedValue([]),
        enqueue: jest.fn().mockResolvedValue(undefined),
        markUnknown: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      };
      const roomRepository = {
        getCurrentUser: () => ({ id: 'user-A' }), getIdentityRevision: () => 1,
        getSessionApi: () => ({ getGeneration: () => 1 }), getSessionStatus: () => 'active',
        getRpcCaller: () => rpc,
      } as unknown as import('../../src/features/rooms/services/roomRepository').RoomRepository;
      const repo = createLiveVoteRepository({ roomRepository, outbox: outbox as any });
      const result = await repo.submitBallot({
        roomId: 'room-version-range', round: 1, poolVersion: 1, expectedVersion: 13,
        requestId: 'new-call-request', votes: [{ roundDishId: 'dish_01', vote: 'WANT' }],
      });
      expect(result).toMatchObject({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
      expect(outbox.enqueue).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'stable-request', expectedVersion: 12 }));
      expect(rpc).toHaveBeenLastCalledWith('dish_session', expect.objectContaining({
        command: 'submit', payload: expect.objectContaining({ requestId: 'stable-request', expectedVersion: 12 }),
      }));
    });

    it('dispatches submitBallot via dish_session v4 with canonical contract version', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          accepted: true,
          round: 1,
          poolVersion: 1,
          submittedAt: '2026-11-05T12:00:00Z',
        },
        version: 2,
        state: 'WAITING_1',
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const votes: BallotVoteItem[] = [
        { roundDishId: 'dish_01', vote: 'WANT' },
        { roundDishId: 'dish_02', vote: 'OK' },
      ];

      const res = await repo.submitBallot({
        roomId: 'room_live_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
        votes,
        requestId: 'req_sub_01',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.accepted).toBe(true);
        expect(res.data.round).toBe(1);
        expect(res.data.receipt?.requestId).toBe('req_sub_01');
        expect(res.data.receipt?.voteCount).toBe(2);
      }

      expect(mockRpc).toHaveBeenCalledWith('dish_session', {
        command: 'submit',
        payload: {
          contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
          requestId: 'req_sub_01',
          roomId: 'room_live_01',
          round: 1,
          poolVersion: 1,
          expectedVersion: 1,
          votes: [
            { roundDishId: 'dish_01', choice: 'WANT' },
            { roundDishId: 'dish_02', choice: 'OK' },
          ],
        },
      });
    });

    it('rejects Round 2 submission before calling server when REMOVE count exceeds cap', async () => {
      const mockRpc = jest.fn();
      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });

      // 3 candidates -> cap = max(1, floor(0.30 * 3)) = 1
      const votesExceedingCap: BallotVoteItem[] = [
        { roundDishId: 'c1', vote: 'REMOVE' },
        { roundDishId: 'c2', vote: 'REMOVE' }, // 2 REMOVE > cap 1
        { roundDishId: 'c3', vote: 'KEEP' },
      ];

      const res = await repo.submitBallot({
        roomId: 'room_live_02',
        round: 2,
        poolVersion: 2,
        expectedVersion: 2,
        votes: votesExceedingCap,
        requestId: 'req_cap_exceeded',
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('REMOVE_LIMIT');
        expect(res.error.details).toEqual({
          removeCount: 2,
          cap: 1,
          candidatesCount: 3,
        });
      }
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('allows Round 2 submission with N=1 and REMOVE choice (Node 638:9369)', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          accepted: true,
          round: 2,
          poolVersion: 2,
          submittedAt: '2026-11-05T12:05:00Z',
        },
        version: 3,
        state: 'WAITING_2',
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      // N=1 -> cap = 1. Removing 1 item is strictly within cap.
      const singleRemoveVote: BallotVoteItem[] = [
        { roundDishId: 'single_dish_01', vote: 'REMOVE' },
      ];

      const res = await repo.submitBallot({
        roomId: 'room_n1_test',
        round: 2,
        poolVersion: 2,
        expectedVersion: 2,
        votes: singleRemoveVote,
        requestId: 'req_n1_remove',
      });

      expect(res.ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it('preserves idempotency and returns cached receipt on retry with identical requestId', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          accepted: true,
          round: 1,
          poolVersion: 1,
          submittedAt: '2026-11-05T12:00:00Z',
        },
        version: 2,
        state: 'WAITING_1',
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const votes: BallotVoteItem[] = [{ roundDishId: 'dish_01', vote: 'WANT' }];

      const res1 = await repo.submitBallot({
        roomId: 'room_idem_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
        votes,
        requestId: 'req_durable_idem_99',
      });

      const res2 = await repo.submitBallot({
        roomId: 'room_idem_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
        votes,
        requestId: 'req_durable_idem_99',
      });

      expect(res1.ok).toBe(true);
      expect(res2.ok).toBe(true);
      // Server RPC called exactly once; second call was satisfied from idempotency cache
      expect(mockRpc).toHaveBeenCalledTimes(1);
      if (res1.ok && res2.ok) {
        expect(res2.data.receipt).toEqual(res1.data.receipt);
      }
    });

    it('rejects reused requestId with mismatched payload (F6)', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          accepted: true,
          round: 1,
          poolVersion: 1,
          submittedAt: '2026-11-05T12:00:00Z',
        },
        version: 2,
        state: 'WAITING_1',
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const votes1: BallotVoteItem[] = [{ roundDishId: 'dish_01', vote: 'WANT' }];
      const votes2: BallotVoteItem[] = [{ roundDishId: 'dish_01', vote: 'NO' }];

      const res1 = await repo.submitBallot({
        roomId: 'room_mismatch_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
        votes: votes1,
        requestId: 'req_durable_mismatch_01',
      });
      expect(res1.ok).toBe(true);

      const res2 = await repo.submitBallot({
        roomId: 'room_mismatch_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
        votes: votes2,
        requestId: 'req_durable_mismatch_01',
      });
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.error.messageKey).toBe('REQUEST_ID_REUSED');
      }
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it('calls enterWaiting and computes 60s countdown deadline from server timestamp', async () => {
      const serverStartedAt = '2026-11-05T12:10:00.000Z';
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          accepted: true,
          round: 1,
          poolVersion: 1,
          waitingStartedAt: serverStartedAt,
          deadline: '2026-11-05T12:11:00.000Z',
        },
        version: 2,
        state: 'WAITING_1',
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const res = await repo.enterWaiting({
        roomId: 'room_wait_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 2,
        requestId: 'req_enter_wait_01',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.accepted).toBe(true);
        expect(res.data.waitingStartedAt).toBe(serverStartedAt);
        expect(res.data.deadline).toBe('2026-11-05T12:11:00.000Z');
      }

      expect(mockRpc).toHaveBeenCalledWith('dish_session', {
        command: 'waiting',
        payload: {
          contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
          requestId: 'req_enter_wait_01',
          roomId: 'room_wait_01',
          round: 1,
          poolVersion: 1,
          expectedVersion: 2,
        },
      });
    });

    it('rejects finalize client-side when caller is marked non-host', async () => {
      const mockRpc = jest.fn();
      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });

      const res = await repo.finalize({
        roomId: 'room_fin_01',
        expectedVersion: 2,
        isHost: false,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('NOT_HOST');
      }
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('rejects finalize client-side when acknowledged count does not exceed half roster', async () => {
      const mockRpc = jest.fn();
      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });

      // 1 out of 3: not allowed
      const res = await repo.finalize({
        roomId: 'room_fin_02',
        expectedVersion: 2,
        isHost: true,
        rosterAcknowledgedCount: 1,
        totalRosterCount: 3,
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('NOT_READY');
      }
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('dispatches finalize when quorum is met and handles ROUND_ADVANCED outcome', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          accepted: true,
          outcome: 'ROUND_ADVANCED',
          state: 'ROUND_2',
          round: 2,
        },
        version: 3,
        state: 'ROUND_2',
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const res = await repo.finalize({
        roomId: 'room_fin_03',
        expectedVersion: 2,
        isHost: true,
        rosterAcknowledgedCount: 2,
        totalRosterCount: 3,
        requestId: 'req_fin_03',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.accepted).toBe(true);
        expect(res.data.outcome).toBe('ROUND_ADVANCED');
        expect(res.data.state).toBe('ROUND_2');
        expect(res.data.round).toBe(2);
      }

      expect(mockRpc).toHaveBeenCalledWith('dish_session', {
        command: 'finalize',
        payload: {
          contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
          requestId: 'req_fin_03',
          roomId: 'room_fin_03',
          expectedVersion: 2,
        },
      });
    });

    it('dispatches finalize and handles TERMINAL outcome (winner found)', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          accepted: true,
          outcome: 'TERMINAL',
          state: 'DECIDED',
          round: 2,
          resultId: 'res_canonical_01',
          finalizedAt: '2026-11-05T12:20:00Z',
        },
        version: 4,
        state: 'DECIDED',
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const res = await repo.finalize({
        roomId: 'room_fin_04',
        expectedVersion: 3,
        isHost: true,
        rosterAcknowledgedCount: 3,
        totalRosterCount: 3,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.outcome).toBe('TERMINAL');
        expect(res.data.state).toBe('DECIDED');
        expect(res.data.resultId).toBe('res_canonical_01');
      }
    });

    it('fetches room snapshot via dish_session snapshot command', async () => {
      const mockSnapshot: Partial<RoomSnapshot> = {
        roomId: 'room_snap_01',
        code: 'GCD999',
        state: 'WAITING_1',
        version: 2,
        hostUserId: 'host_01',
        context: {
          anchorId: 'anchor_01',
          radiusM: 2000,
          desiredAt: '2026-11-05T12:00:00Z',
          serviceMode: 'dine_in',
          mealSlot: 'lunch',
          avoidRecent: false,
        },
        round: 1,
        poolVersion: 1,
        pool: dummyPool,
        members: [
          { userId: 'host_01', displayName: 'Host', isHost: true, ready: true, joinedAt: '2026-11-05T12:00:00Z' },
        ],
        expiresAt: '2026-11-05T13:00:00Z',
      };

      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: mockSnapshot,
      });

      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const res = await repo.getSnapshot('room_snap_01');

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.code).toBe('GCD999');
        expect(res.data.state).toBe('WAITING_1');
      }
    });

    it('rejects malformed submit envelope missing accepted or round (F7)', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: { invalidField: true },
      });
      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const res = await repo.submitBallot({
        roomId: 'room_bad_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
        votes: [{ roundDishId: 'dish_01', vote: 'WANT' }],
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('MALFORMED_RESPONSE');
      }
    });

    it('rejects malformed waiting envelope (F7)', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: { accepted: 'not_boolean' },
      });
      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const res = await repo.enterWaiting({
        roomId: 'room_bad_wait_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('MALFORMED_RESPONSE');
      }
    });

    it('rejects malformed snapshot envelope (F7)', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        ok: true,
        data: { roomId: 'room_01' }, // Missing code, state, members, etc.
      });
      const repo = createLiveVoteRepository({ rpcCaller: mockRpc });
      const res = await repo.getSnapshot('room_bad_snap_01');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('MALFORMED_RESPONSE');
      }
    });
  });

  describe('MockVoteRepository for isolated tests and scenarios', () => {
    it('simulates full voting lifecycle from Round 1 submit to Host early finish to Round 2', async () => {
      const mockRepo = createMockVoteRepository({
        initialRound: 1,
        initialTotalRoster: 3,
        initialAcknowledgedCount: 1, // 1/3 ACK
        isHost: true,
      });

      // Attempt Host early finish at 1/3 ACK -> NOT_READY
      const prematureFin = await mockRepo.finalize({
        roomId: 'mock_room_01',
        expectedVersion: 1,
      });
      expect(prematureFin.ok).toBe(false);
      if (!prematureFin.ok) {
        expect(prematureFin.error.messageKey).toBe('NOT_READY');
      }

      // Member 2 submits ballot
      const subRes = await mockRepo.submitBallot({
        roomId: 'mock_room_01',
        round: 1,
        poolVersion: 1,
        expectedVersion: 1,
        votes: [{ roundDishId: 'd1', vote: 'WANT' }],
      });
      expect(subRes.ok).toBe(true);

      // Now acknowledged count is 2/3 (> half) -> Host early finish succeeds!
      const finRes = await mockRepo.finalize({
        roomId: 'mock_room_01',
        expectedVersion: 2,
      });
      expect(finRes.ok).toBe(true);
      if (finRes.ok) {
        expect(finRes.data.outcome).toBe('ROUND_ADVANCED');
        expect(finRes.data.round).toBe(2);
      }

      // In Round 2: submit with cap enforcement (N=2 candidates -> cap=1)
      const r2CapExceeded = await mockRepo.submitBallot({
        roomId: 'mock_room_01',
        round: 2,
        poolVersion: 2,
        expectedVersion: 3,
        votes: [
          { roundDishId: 'd1', vote: 'REMOVE' },
          { roundDishId: 'd2', vote: 'REMOVE' }, // 2 REMOVE > cap 1
        ],
      });
      expect(r2CapExceeded.ok).toBe(false);
      if (!r2CapExceeded.ok) {
        expect(r2CapExceeded.error.messageKey).toBe('REMOVE_LIMIT');
      }

      // Valid Round 2 submit
      const r2Valid = await mockRepo.submitBallot({
        roomId: 'mock_room_01',
        round: 2,
        poolVersion: 2,
        expectedVersion: 3,
        votes: [
          { roundDishId: 'd1', vote: 'REMOVE' },
          { roundDishId: 'd2', vote: 'KEEP' },
        ],
      });
      expect(r2Valid.ok).toBe(true);

      // Finalize Round 2 -> TERMINAL
      const r2Fin = await mockRepo.finalize({
        roomId: 'mock_room_01',
        expectedVersion: 4,
      });
      expect(r2Fin.ok).toBe(true);
      if (r2Fin.ok) {
        expect(r2Fin.data.outcome).toBe('TERMINAL');
        expect(r2Fin.data.state).toBe('DECIDED');
      }
    });
  });

  describe('mapSnapshotPoolToPoolDishes adapter (R3 truthfulness)', () => {
    it('truthfully maps null/unknown priceReference without fabricating 50k-70k fallback', () => {
      const snapshotItem = {
        roundDishId: 'r_01',
        choiceId: 'c_01',
        dishId: 'd_01',
        name: 'Món không giá',
        priceReference: null,
        sourceRef: 'menu_source_123',
        artwork: null,
      };

      const mapped = mapSnapshotPoolToPoolDishes([snapshotItem]);
      expect(mapped).toHaveLength(1);
      expect(mapped[0]!.priceMin).toBeUndefined();
      expect(mapped[0]!.priceMax).toBeUndefined();
      expect(mapped[0]!.venueName).toBeUndefined(); // sourceRef is NOT used as restaurant name!
      expect(mapped[0]!.artwork).toBeUndefined();
    });

    it('truthfully maps price observation and preserves artwork attribution', () => {
      const snapshotItem = {
        roundDishId: 'r_02',
        choiceId: 'c_02',
        dishId: 'd_02',
        name: 'Bún bò Huế',
        priceReference: {
          amount: 45000,
          currency: 'VND',
          unit: 'bowl',
        },
        artwork: {
          url: 'https://example.com/bunbo.jpg',
          usageRights: 'granted',
          license: 'CC-BY-4.0',
          attribution: 'Food Photographer',
        },
      };

      const mapped = mapSnapshotPoolToPoolDishes([snapshotItem]);
      expect(mapped).toHaveLength(1);
      expect(mapped[0]!.priceMin).toBe(45000);
      expect(mapped[0]!.priceMax).toBe(45000);
      expect(mapped[0]!.currency).toBe('VND');
      expect(mapped[0]!.unit).toBe('bowl');
      expect(mapped[0]!.artwork?.url).toBe('https://example.com/bunbo.jpg');
      expect(mapped[0]!.artwork?.attribution).toBe('Food Photographer');
      expect(mapped[0]!.artwork?.license).toBe('CC-BY-4.0');
    });
  });
});
