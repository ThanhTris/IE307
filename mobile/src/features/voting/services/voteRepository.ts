/**
 * GM-26 — Live Vote Repository implementation.
 * Connects Round 1 flashcard voting, Round 2 elimination, waiting rooms,
 * and host finalization to the canonical dish_session v4 API.
 * 
 * Spec: docs/specs/UI_SPEC.md, docs/architecture/DISH_SESSION_API_CONTRACT_B.md
 * Task: GM-26 (Issue #87)
 */

import type {
  ApiClient,
  ApiError,
  BallotVoteItem,
  BallotVoteValue,
  ErrorCode,
  PoolDish,
  ReadResult,
  RoomResult,
  RoomSnapshot,
  SubmissionReceipt,
  SubmitBallotRequest,
  SubmitBallotResponse,
  WriteResult,
} from '../../../data/api';
import { mapErrorHelper } from '../../../data/api/client/helpers';
import { isCanonicalRoomSnapshot, isRoomSnapshot } from '../../../data/api/responseGuards';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import {
  WAITING_DEADLINE_SECONDS,
  getRoundTwoEliminationCap,
  isHostEarlyFinishAllowed,
} from '../fixtures';

export const CANONICAL_VOTE_CONTRACT_VERSION = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
export const BASELINE_VOTE_CONTRACT_VERSION = 'dish-session-v4/roadmap-v2/GM-07.B';

export type RequestIdGenerator = (prefix?: string) => string;

let requestSeq = 0;
/**
 * Creates a unique durable request ID for idempotent voting RPC operations.
 */
export function createDurableRequestId(prefix = 'req_vote'): string {
  const ts = Date.now().toString(36);
  const seq = (++requestSeq).toString(36);
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${ts}_${seq}_${rand}`;
}

export interface SubmitBallotArgs {
  roomId: string;
  round: 1 | 2;
  poolVersion: number;
  expectedVersion: number;
  votes: BallotVoteItem[];
  intentId?: string;
  requestId?: string;
}

export interface EnterWaitingArgs {
  roomId: string;
  round: 1 | 2;
  poolVersion: number;
  expectedVersion: number;
  requestId?: string;
}

export interface EnterWaitingResponse {
  accepted: boolean;
  round: 1 | 2;
  poolVersion: number;
  waitingStartedAt: string;
  deadline: string;
  roomVersion?: number;
  state?: string;
}

export interface FinalizeArgs {
  roomId: string;
  expectedVersion: number;
  requestId?: string;
  /** Optional override for client-side quorum assertion before sending RPC */
  rosterAcknowledgedCount?: number;
  totalRosterCount?: number;
  isHost?: boolean;
}

export type FinalizeOutcome = 'ROUND_ADVANCED' | 'TERMINAL';

export interface FinalizeResponse {
  accepted: boolean;
  outcome: FinalizeOutcome;
  state: string;
  round: number;
  resultId?: string;
  finalizedAt?: string;
}

export interface VoteRepository {
  submitBallot(args: SubmitBallotArgs): Promise<WriteResult<SubmitBallotResponse>>;
  enterWaiting(args: EnterWaitingArgs): Promise<WriteResult<EnterWaitingResponse>>;
  finalize(args: FinalizeArgs): Promise<WriteResult<FinalizeResponse>>;
  getSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>>;
}

export interface LiveVoteRepositoryDeps {
  roomRepository?: RoomRepository;
  client?: ApiClient;
  rpcCaller?: (name: string, params: Record<string, unknown>) => Promise<unknown>;
  nextRequestId?: RequestIdGenerator;
}

export class LiveVoteRepository implements VoteRepository {
  private readonly roomRepo?: RoomRepository;
  private readonly client?: ApiClient;
  private readonly rpcCaller?: (name: string, params: Record<string, unknown>) => Promise<unknown>;
  private readonly nextRequestId: RequestIdGenerator;

  // Cache of submitted receipts for idempotency across retries
  private readonly idempotencyCache = new Map<string, WriteResult<SubmitBallotResponse>>();

  constructor(deps: LiveVoteRepositoryDeps = {}) {
    this.roomRepo = deps.roomRepository;
    this.client = deps.client;
    this.rpcCaller = deps.rpcCaller;
    this.nextRequestId = deps.nextRequestId ?? createDurableRequestId;
  }

  private getCaller(): ((name: string, params: Record<string, unknown>) => Promise<unknown>) | null {
    if (this.rpcCaller) return this.rpcCaller;
    if (this.roomRepo && typeof (this.roomRepo as any).getRpcCaller === 'function') {
      return (this.roomRepo as any).getRpcCaller();
    }
    return null;
  }

  /**
   * Submits a ballot for Round 1 (WANT/OK/NO) or Round 2 (KEEP/REMOVE).
   * Validates votes locally and enforces Round 2 elimination cap:
   * cap = max(1, floor(0.30 * N)).
   * If cap is exceeded in Round 2, rejects with REMOVE_LIMIT before calling server.
   * If re-submitting with identical requestId and payload, returns cached receipt.
   */
  async submitBallot(args: SubmitBallotArgs): Promise<WriteResult<SubmitBallotResponse>> {
    const rid = args.requestId || this.nextRequestId('submit');
    const intent = args.intentId || `intent_${rid}`;

    // Check client-side idempotency cache
    const cacheKey = `${args.roomId}_${args.round}_${rid}`;
    const cached = this.idempotencyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Local validation
    if (!args.roomId) {
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
    }
    if (args.round !== 1 && args.round !== 2) {
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
    }
    if (!Array.isArray(args.votes) || args.votes.length === 0) {
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INCOMPLETE_BALLOT' } };
    }

    if (args.round === 1) {
      for (const item of args.votes) {
        if (!item.roundDishId || !['WANT', 'OK', 'NO'].includes(item.vote)) {
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
        }
      }
    } else {
      // Round 2 validation & cap enforcement
      let removeCount = 0;
      for (const item of args.votes) {
        if (!item.roundDishId || !['KEEP', 'REMOVE'].includes(item.vote)) {
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
        }
        if (item.vote === 'REMOVE') {
          removeCount++;
        }
      }
      const cap = getRoundTwoEliminationCap(args.votes.length);
      if (removeCount > cap) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: {
            messageKey: 'REMOVE_LIMIT',
            details: { removeCount, cap, candidatesCount: args.votes.length },
          },
        };
      }
    }

    const caller = this.getCaller();
    if (caller) {
      try {
        const raw = (await caller('dish_session', {
          command: 'submit',
          payload: {
            contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
            requestId: rid,
            roomId: args.roomId,
            round: args.round,
            poolVersion: args.poolVersion,
            expectedVersion: args.expectedVersion,
            votes: args.votes,
          },
        })) as {
          ok?: boolean;
          data?: {
            accepted?: boolean;
            round?: number;
            poolVersion?: number;
            submittedAt?: string;
          };
          version?: number;
          state?: string;
          error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
        };

        if (raw?.ok) {
          const submittedAt = raw.data?.submittedAt || new Date().toISOString();
          const receipt: SubmissionReceipt = {
            round: args.round,
            intentId: intent,
            requestId: rid,
            submittedAt,
            voteCount: args.votes.length,
            votesSummary: args.votes,
          };
          const isTerminalState = raw.state === 'DECIDED' || raw.state === 'NO_CONSENSUS';
          const isAdvancedRound = raw.state === 'ROUND_2' && args.round === 1;
          const allSubmitted = isTerminalState || isAdvancedRound;

          const res: WriteResult<SubmitBallotResponse> = {
            ok: true,
            requestId: rid,
            roomId: args.roomId,
            version: raw.version ?? args.expectedVersion,
            state: raw.state,
            data: {
              accepted: true,
              round: args.round,
              allMembersSubmitted: allSubmitted,
              roomVersion: raw.version ?? args.expectedVersion,
              receipt,
            },
          };
          this.idempotencyCache.set(cacheKey, res);
          return res;
        }

        const errCode = (raw?.error?.messageKey || raw?.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: { messageKey: errCode, details: raw?.error?.details },
        };
      } catch (err: unknown) {
        return { ok: false, requestId: rid, roomId: args.roomId, error: mapErrorHelper(err) };
      }
    }

    // Fallback to client.submitBallot
    if (this.client) {
      const clientReq: SubmitBallotRequest = {
        roomId: args.roomId,
        round: args.round,
        poolVersion: args.poolVersion,
        intentId: intent,
        expectedVersion: args.expectedVersion,
        votes: args.votes,
        requestId: rid,
      };
      const res = await this.client.submitBallot(clientReq);
      if (res.ok) {
        this.idempotencyCache.set(cacheKey, res);
      }
      return res;
    }

    return {
      ok: false,
      requestId: rid,
      roomId: args.roomId,
      error: { messageKey: 'NETWORK_ERROR' },
    };
  }

  /**
   * Enters the waiting room after a ballot has been accepted.
   * Starts or joins the 60-second waiting countdown on the server.
   */
  async enterWaiting(args: EnterWaitingArgs): Promise<WriteResult<EnterWaitingResponse>> {
    const rid = args.requestId || this.nextRequestId('waiting');
    const caller = this.getCaller();

    if (caller) {
      try {
        const raw = (await caller('dish_session', {
          command: 'waiting',
          payload: {
            contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
            requestId: rid,
            roomId: args.roomId,
            round: args.round,
            poolVersion: args.poolVersion,
            expectedVersion: args.expectedVersion,
          },
        })) as {
          ok?: boolean;
          data?: {
            accepted?: boolean;
            round?: number;
            poolVersion?: number;
            waitingStartedAt?: string;
            deadline?: string;
          };
          version?: number;
          state?: string;
          error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
        };

        if (raw?.ok) {
          const nowIso = new Date().toISOString();
          const waitingStartedAt = raw.data?.waitingStartedAt || nowIso;
          const deadline = raw.data?.deadline || new Date(Date.now() + WAITING_DEADLINE_SECONDS * 1000).toISOString();

          return {
            ok: true,
            requestId: rid,
            roomId: args.roomId,
            version: raw.version ?? args.expectedVersion,
            state: raw.state,
            data: {
              accepted: true,
              round: args.round,
              poolVersion: args.poolVersion,
              waitingStartedAt,
              deadline,
              roomVersion: raw.version ?? args.expectedVersion,
              state: raw.state,
            },
          };
        }

        const errCode = (raw?.error?.messageKey || raw?.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: { messageKey: errCode, details: raw?.error?.details },
        };
      } catch (err: unknown) {
        return { ok: false, requestId: rid, roomId: args.roomId, error: mapErrorHelper(err) };
      }
    }

    // Default synthetic waiting response if direct caller not connected
    const nowIso = new Date().toISOString();
    return {
      ok: true,
      requestId: rid,
      roomId: args.roomId,
      version: args.expectedVersion,
      data: {
        accepted: true,
        round: args.round,
        poolVersion: args.poolVersion,
        waitingStartedAt: nowIso,
        deadline: new Date(Date.now() + WAITING_DEADLINE_SECONDS * 1000).toISOString(),
      },
    };
  }

  /**
   * Finalizes the current round early ("Chốt ngay" / Host early finish).
   * Host is only permitted to finish early when A_r > M/2 (strictly more than half of locked roster).
   * Server rejects unauthorized calls with NOT_HOST (403) or NOT_READY (409).
   */
  async finalize(args: FinalizeArgs): Promise<WriteResult<FinalizeResponse>> {
    const rid = args.requestId || this.nextRequestId('finalize');

    // Pre-flight client checks if parameters are explicitly provided
    if (args.isHost === false) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: { messageKey: 'NOT_HOST' },
      };
    }
    if (
      typeof args.rosterAcknowledgedCount === 'number' &&
      typeof args.totalRosterCount === 'number' &&
      !isHostEarlyFinishAllowed(args.rosterAcknowledgedCount, args.totalRosterCount)
    ) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: {
          messageKey: 'NOT_READY',
          details: {
            acknowledged: args.rosterAcknowledgedCount,
            total: args.totalRosterCount,
            required: Math.floor(args.totalRosterCount / 2) + 1,
          },
        },
      };
    }

    const caller = this.getCaller();
    if (caller) {
      try {
        const raw = (await caller('dish_session', {
          command: 'finalize',
          payload: {
            contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
            requestId: rid,
            roomId: args.roomId,
            expectedVersion: args.expectedVersion,
          },
        })) as {
          ok?: boolean;
          data?: {
            accepted?: boolean;
            outcome?: FinalizeOutcome;
            state?: string;
            round?: number;
            resultId?: string;
            finalizedAt?: string;
          };
          version?: number;
          state?: string;
          error?: { messageKey?: string; code?: string; details?: Record<string, unknown> };
        };

        if (raw?.ok) {
          const outcome = raw.data?.outcome || (raw.state === 'ROUND_2' ? 'ROUND_ADVANCED' : 'TERMINAL');
          const state = raw.data?.state || raw.state || 'DECIDED';
          const round = raw.data?.round || (outcome === 'ROUND_ADVANCED' ? 2 : 1);

          return {
            ok: true,
            requestId: rid,
            roomId: args.roomId,
            version: raw.version ?? args.expectedVersion,
            state: raw.state,
            data: {
              accepted: true,
              outcome,
              state,
              round,
              resultId: raw.data?.resultId,
              finalizedAt: raw.data?.finalizedAt,
            },
          };
        }

        const errCode = (raw?.error?.messageKey || raw?.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: { messageKey: errCode, details: raw?.error?.details },
        };
      } catch (err: unknown) {
        return { ok: false, requestId: rid, roomId: args.roomId, error: mapErrorHelper(err) };
      }
    }

    return {
      ok: false,
      requestId: rid,
      roomId: args.roomId,
      error: { messageKey: 'NETWORK_ERROR' },
    };
  }

  /**
   * Retrieves current room snapshot.
   */
  async getSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    const caller = this.getCaller();
    if (caller) {
      try {
        const raw = (await caller('dish_session', {
          command: 'snapshot',
          payload: {
            contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
            roomId,
          },
        })) as {
          ok?: boolean;
          data?: unknown;
          error?: { messageKey?: string; code?: string };
        };

        if (raw?.ok && raw.data) {
          if (isCanonicalRoomSnapshot(raw.data) || isRoomSnapshot(raw.data)) {
            return { ok: true, data: raw.data as RoomSnapshot };
          }
          if (typeof raw.data === 'object' && (raw.data as any).roomId && (raw.data as any).code) {
            return { ok: true, data: raw.data as RoomSnapshot };
          }
        }
        if (raw && !raw.ok) {
          const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
          return { ok: false, error: { messageKey: errCode } };
        }
        return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
      } catch (err: unknown) {
        return { ok: false, error: mapErrorHelper(err) };
      }
    }

    if (this.client) {
      return this.client.getRoomSnapshot(roomId);
    }

    return { ok: false, error: { messageKey: 'NETWORK_ERROR' } };
  }
}

export interface MockVoteRepositoryOptions {
  initialSnapshot?: Partial<RoomSnapshot>;
  failSubmit?: boolean;
  failFinalize?: boolean;
  failWaiting?: boolean;
  errorCode?: ErrorCode;
  delayMs?: number;
  initialRound?: 1 | 2;
  initialTotalRoster?: number;
  initialAcknowledgedCount?: number;
  isHost?: boolean;
}

/**
 * In-memory MockVoteRepository for tests, previews and isolated verification.
 */
export class MockVoteRepository implements VoteRepository {
  private options: MockVoteRepositoryOptions;
  private submissions: Map<string, SubmitBallotArgs> = new Map();
  private receipts: Map<string, WriteResult<SubmitBallotResponse>> = new Map();
  private waitingStartedAt: string | null = null;
  private currentRound: 1 | 2;
  private rosterCount: number;
  private acknowledgedCount: number;

  constructor(options: MockVoteRepositoryOptions = {}) {
    this.options = options;
    this.currentRound = options.initialRound ?? 1;
    this.rosterCount = options.initialTotalRoster ?? 3;
    this.acknowledgedCount = options.initialAcknowledgedCount ?? 1;
  }

  async submitBallot(args: SubmitBallotArgs): Promise<WriteResult<SubmitBallotResponse>> {
    if (this.options.delayMs) {
      await new Promise(r => setTimeout(r, this.options.delayMs));
    }
    const rid = args.requestId || createDurableRequestId('mock_submit');
    const intent = args.intentId || `intent_${rid}`;

    if (this.options.failSubmit) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: { messageKey: this.options.errorCode || 'UNKNOWN_ERROR' },
      };
    }

    // Check cached idempotent response
    const cacheKey = `${args.roomId}_${args.round}_${rid}`;
    if (this.receipts.has(cacheKey)) {
      return this.receipts.get(cacheKey)!;
    }

    // Round 2 cap enforcement
    if (args.round === 2) {
      const removeCount = args.votes.filter(v => v.vote === 'REMOVE').length;
      const cap = getRoundTwoEliminationCap(args.votes.length);
      if (removeCount > cap) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: {
            messageKey: 'REMOVE_LIMIT',
            details: { removeCount, cap },
          },
        };
      }
    }

    this.submissions.set(cacheKey, args);
    this.acknowledgedCount = Math.min(this.rosterCount, this.acknowledgedCount + 1);

    const allSubmitted = this.acknowledgedCount >= this.rosterCount;
    const response: WriteResult<SubmitBallotResponse> = {
      ok: true,
      requestId: rid,
      roomId: args.roomId,
      version: args.expectedVersion + 1,
      state: allSubmitted ? (args.round === 1 ? 'ROUND_2' : 'DECIDED') : (args.round === 1 ? 'WAITING_1' : 'WAITING_2'),
      data: {
        accepted: true,
        round: args.round,
        allMembersSubmitted: allSubmitted,
        roomVersion: args.expectedVersion + 1,
        receipt: {
          round: args.round,
          intentId: intent,
          requestId: rid,
          submittedAt: new Date().toISOString(),
          voteCount: args.votes.length,
          votesSummary: args.votes,
        },
      },
    };

    this.receipts.set(cacheKey, response);
    return response;
  }

  async enterWaiting(args: EnterWaitingArgs): Promise<WriteResult<EnterWaitingResponse>> {
    if (this.options.delayMs) {
      await new Promise(r => setTimeout(r, this.options.delayMs));
    }
    const rid = args.requestId || createDurableRequestId('mock_waiting');

    if (this.options.failWaiting) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: { messageKey: this.options.errorCode || 'UNKNOWN_ERROR' },
      };
    }

    if (!this.waitingStartedAt) {
      this.waitingStartedAt = new Date().toISOString();
    }
    const deadline = new Date(Date.now() + WAITING_DEADLINE_SECONDS * 1000).toISOString();

    return {
      ok: true,
      requestId: rid,
      roomId: args.roomId,
      version: args.expectedVersion,
      data: {
        accepted: true,
        round: args.round,
        poolVersion: args.poolVersion,
        waitingStartedAt: this.waitingStartedAt,
        deadline,
        roomVersion: args.expectedVersion,
        state: args.round === 1 ? 'WAITING_1' : 'WAITING_2',
      },
    };
  }

  async finalize(args: FinalizeArgs): Promise<WriteResult<FinalizeResponse>> {
    if (this.options.delayMs) {
      await new Promise(r => setTimeout(r, this.options.delayMs));
    }
    const rid = args.requestId || createDurableRequestId('mock_finalize');

    if (this.options.failFinalize) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: { messageKey: this.options.errorCode || 'UNKNOWN_ERROR' },
      };
    }

    if (args.isHost === false || this.options.isHost === false) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: { messageKey: 'NOT_HOST' },
      };
    }

    const ackCount = args.rosterAcknowledgedCount ?? this.acknowledgedCount;
    const totCount = args.totalRosterCount ?? this.rosterCount;

    if (!isHostEarlyFinishAllowed(ackCount, totCount)) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: {
          messageKey: 'NOT_READY',
          details: { acknowledged: ackCount, total: totCount },
        },
      };
    }

    if (this.currentRound === 1) {
      this.currentRound = 2;
      return {
        ok: true,
        requestId: rid,
        roomId: args.roomId,
        version: args.expectedVersion + 1,
        state: 'ROUND_2',
        data: {
          accepted: true,
          outcome: 'ROUND_ADVANCED',
          state: 'ROUND_2',
          round: 2,
        },
      };
    }

    return {
      ok: true,
      requestId: rid,
      roomId: args.roomId,
      version: args.expectedVersion + 1,
      state: 'DECIDED',
      data: {
        accepted: true,
        outcome: 'TERMINAL',
        state: 'DECIDED',
        round: 2,
        resultId: 'res_mock_winner_01',
        finalizedAt: new Date().toISOString(),
      },
    };
  }

  async getSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    const defaultSnapshot: RoomSnapshot = {
      roomId,
      code: 'GCD888',
      state: this.currentRound === 1 ? 'WAITING_1' : 'ROUND_2',
      version: 3,
      hostUserId: 'user_host_1',
      round: this.currentRound,
      poolVersion: 1,
      pool: [],
      members: [
        { userId: 'user_host_1', displayName: 'Host', isHost: true, ready: true, joinedAt: new Date().toISOString() },
        { userId: 'user_member_2', displayName: 'Member 2', isHost: false, ready: true, joinedAt: new Date().toISOString() },
        { userId: 'user_member_3', displayName: 'Member 3', isHost: false, ready: true, joinedAt: new Date().toISOString() },
      ],
      memberCount: this.rosterCount,
      submittedCount: this.acknowledgedCount,
      canEndWaiting: isHostEarlyFinishAllowed(this.acknowledgedCount, this.rosterCount),
      waitingStartedAt: this.waitingStartedAt,
      deadline: this.waitingStartedAt ? new Date(Date.now() + 60000).toISOString() : null,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    return {
      ok: true,
      data: {
        ...defaultSnapshot,
        ...this.options.initialSnapshot,
      },
    };
  }
}

export function createLiveVoteRepository(deps: LiveVoteRepositoryDeps = {}): VoteRepository {
  return new LiveVoteRepository(deps);
}

export function createMockVoteRepository(options: MockVoteRepositoryOptions = {}): VoteRepository {
  return new MockVoteRepository(options);
}
