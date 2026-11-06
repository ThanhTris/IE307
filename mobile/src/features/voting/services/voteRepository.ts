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
  BallotVoteItem,
  ErrorCode,
  PoolDish,
  ReadResult,
  RoomSnapshot,
  SubmissionReceipt,
  SubmitBallotRequest,
  SubmitBallotResponse,
  WriteResult,
} from '../../../data/api';
import { mapErrorHelper } from '../../../data/api/client/helpers';
import { isCanonicalRoomSnapshot, isRoomSnapshot } from '../../../data/api/responseGuards';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { getDurableOutbox, type DurableOutbox } from '../../../data/local/outbox';
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

/**
 * Transforms raw canonical snapshot pool dishes into PoolDish objects.
 * Truthful projection without inventing fake prices, fake venue names, or default meal slots.
 */
export function mapSnapshotPoolToPoolDishes(pool: unknown[]): PoolDish[] {
  if (!Array.isArray(pool)) return [];
  return pool.map((item: any, idx: number) => {
    const roundDishId = item.roundDishId || `dish_${idx}`;
    const dishId = item.dishId || roundDishId;
    const choiceId = item.choiceId || roundDishId;
    const name = item.name || `Món ăn #${idx + 1}`;
    const description = item.description ?? undefined;
    const priceRef = item.priceReference;
    const priceAmount = typeof priceRef?.amount === 'number'
      ? priceRef.amount
      : (typeof item.priceMin === 'number' ? item.priceMin : undefined);
    const artworkUri = item.artwork?.uri || item.artwork?.url;
    return {
      roundDishId,
      choiceId,
      dishId,
      name,
      description,
      venueName: item.venueName || undefined,
      priceMin: priceAmount,
      priceMax: typeof item.priceMax === 'number' ? item.priceMax : priceAmount,
      currency: priceRef?.currency || item.currency || undefined,
      unit: priceRef?.unit || item.unit || undefined,
      artwork: artworkUri
        ? {
            url: artworkUri,
            uri: artworkUri,
            altText: item.artwork?.altText || undefined,
            attribution: item.artwork?.attribution || undefined,
            usageRights: item.artwork?.usageRights || (item.artwork?.attribution ? 'attributed' : 'unknown'),
            license: item.artwork?.license ?? null,
          }
        : undefined,
      mealSlots: Array.isArray(item.mealSlots) ? item.mealSlots : [],
      cuisineIds: Array.isArray(item.cuisineIds) ? item.cuisineIds : [],
      categoryIds: Array.isArray(item.categoryIds) ? item.categoryIds : [],
      cuisineLabels: Array.isArray(item.cuisineLabels) ? item.cuisineLabels : undefined,
      categoryLabels: Array.isArray(item.categoryLabels) ? item.categoryLabels : undefined,
      temperature: item.temperature ?? undefined,
      flavor: item.flavor ?? undefined,
      priceReference: priceRef ?? undefined,
    } as PoolDish;
  });
}

function isIsoTimestamp(val: unknown): val is string {
  return typeof val === 'string' && val.length >= 10 && !isNaN(Date.parse(val));
}

function isCanonicalSubmitEnvelope(
  raw: any,
  args: SubmitBallotArgs
): raw is {
  ok: true;
  requestId?: string;
  roomId?: string;
  version: number;
  state?: string;
  data: {
    accepted: true;
    round: number;
    poolVersion: number;
    submittedAt: string;
  };
} {
  if (!raw || raw.ok !== true) return false;
  if (typeof raw.version !== 'number' || raw.version < 1) return false;
  if (!raw.data || typeof raw.data !== 'object') return false;
  if (raw.data.accepted !== true) return false;
  if (raw.data.round !== args.round) return false;
  if (raw.data.poolVersion !== args.poolVersion) return false;
  if (!isIsoTimestamp(raw.data.submittedAt)) return false;
  return true;
}

function isCanonicalWaitingEnvelope(
  raw: any,
  args: EnterWaitingArgs
): raw is {
  ok: true;
  requestId?: string;
  roomId?: string;
  version: number;
  state?: string;
  data: {
    accepted: true;
    round: number;
    poolVersion: number;
    waitingStartedAt: string;
    deadline: string;
  };
} {
  if (!raw || raw.ok !== true) return false;
  if (typeof raw.version !== 'number' || raw.version < 1) return false;
  if (!raw.data || typeof raw.data !== 'object') return false;
  if (raw.data.accepted !== true) return false;
  if (raw.data.round !== args.round) return false;
  if (raw.data.poolVersion !== args.poolVersion) return false;
  if (!isIsoTimestamp(raw.data.waitingStartedAt)) return false;
  if (!isIsoTimestamp(raw.data.deadline)) return false;
  return true;
}

function isCanonicalFinalizeEnvelope(
  raw: any,
  args: FinalizeArgs
): raw is {
  ok: true;
  requestId?: string;
  roomId?: string;
  version?: number;
  state?: string;
  data: {
    accepted: true;
    outcome: FinalizeOutcome;
    state: string;
    round: number;
    resultId?: string;
    finalizedAt?: string;
  };
} {
  if (!raw || raw.ok !== true) return false;
  if (!raw.data || typeof raw.data !== 'object') return false;
  if (raw.data.accepted !== true) return false;
  if (raw.data.outcome !== 'ROUND_ADVANCED' && raw.data.outcome !== 'TERMINAL') return false;
  if (!['ROUND_2', 'DECIDED', 'NO_CONSENSUS'].includes(raw.data.state)) return false;
  if (raw.data.round !== 1 && raw.data.round !== 2) return false;
  if (raw.data.outcome === 'ROUND_ADVANCED') {
    if (raw.data.state !== 'ROUND_2' || raw.data.round !== 2) return false;
  }
  if (raw.data.outcome === 'TERMINAL') {
    if (!raw.data.resultId || typeof raw.data.resultId !== 'string') return false;
    if (!isIsoTimestamp(raw.data.finalizedAt)) return false;
  }
  return true;
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
  outbox?: DurableOutbox;
}

interface CachedSubmitEntry {
  payloadSerialized: string;
  result: WriteResult<SubmitBallotResponse>;
}

export class LiveVoteRepository implements VoteRepository {
  private readonly roomRepo?: RoomRepository;
  private readonly client?: ApiClient;
  private readonly rpcCaller?: (name: string, params: Record<string, unknown>) => Promise<unknown>;
  private readonly nextRequestId: RequestIdGenerator;
  private readonly outbox?: DurableOutbox;

  // Cache of submitted receipts for idempotency across retries
  private readonly idempotencyCache = new Map<string, CachedSubmitEntry>();

  constructor(deps: LiveVoteRepositoryDeps = {}) {
    this.roomRepo = deps.roomRepository;
    this.client = deps.client;
    this.rpcCaller = deps.rpcCaller;
    this.nextRequestId = deps.nextRequestId ?? createDurableRequestId;
    this.outbox = deps.outbox;
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
   * Transforms input votes to canonical wire format: { roundDishId, choice } (F1).
   * Enforces Round 2 elimination cap: max(1, floor(0.30 * N)).
   * If cap is exceeded in Round 2, rejects with REMOVE_LIMIT before calling server.
   * Compares payload against cache: if re-submitting with identical requestId and payload, returns cached receipt.
   * If re-submitting with same requestId but different payload, rejects with BAD_REQUEST (F6).
   */
  async submitBallot(args: SubmitBallotArgs): Promise<WriteResult<SubmitBallotResponse>> {
    let rid = args.requestId || this.nextRequestId('submit');
    let intent = args.intentId || `intent_${rid}`;

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

    // F1: Transform to strict wire format with ONLY roundDishId and choice
    const wireVotes: { roundDishId: string; choice: string }[] = [];
    if (args.round === 1) {
      for (const item of args.votes) {
        const choice = (item as any).choice ?? item.vote;
        if (!item.roundDishId || !['WANT', 'OK', 'NO'].includes(choice)) {
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
        }
        wireVotes.push({ roundDishId: item.roundDishId, choice });
      }
    } else {
      // Round 2 validation & cap enforcement
      let removeCount = 0;
      for (const item of args.votes) {
        const choice = (item as any).choice ?? item.vote;
        if (!item.roundDishId || !['KEEP', 'REMOVE'].includes(choice)) {
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
        }
        if (choice === 'REMOVE') {
          removeCount++;
        }
        wireVotes.push({ roundDishId: item.roundDishId, choice });
      }
      const cap = getRoundTwoEliminationCap(wireVotes.length);
      if (removeCount > cap) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: {
            messageKey: 'REMOVE_LIMIT',
            details: { removeCount, cap, candidatesCount: wireVotes.length },
          },
        };
      }
    }

    // F6: Serialize payload to verify payload stability on retries
    const payloadSerialized = JSON.stringify({
      roomId: args.roomId,
      round: args.round,
      poolVersion: args.poolVersion,
      expectedVersion: args.expectedVersion,
      votes: wireVotes,
    });

    const identityId = this.roomRepo?.getCurrentUser()?.id;
    const durableOutbox = identityId ? (this.outbox ?? getDurableOutbox()) : undefined;
    if (identityId && durableOutbox) {
      try {
        const previous = await durableOutbox.findEquivalent({
          identityId,
          roomId: args.roomId,
          round: args.round,
          poolVersion: args.poolVersion,
          contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
          expectedVersion: args.expectedVersion,
          payload: { intentId: intent, votes: wireVotes },
        });
        if (previous) {
          const latest = await this.getSnapshot(args.roomId);
          if (!latest.ok) return { ok: false, requestId: previous.requestId, roomId: args.roomId, error: latest.error };
          if (latest.data.ownSubmission?.requestId === previous.requestId) {
            await durableOutbox.acknowledge(identityId, previous.requestId).catch(() => undefined);
            const response: WriteResult<SubmitBallotResponse> = {
              ok: true,
              requestId: previous.requestId,
              roomId: args.roomId,
              version: latest.data.version,
              state: latest.data.state,
              data: {
                accepted: true,
                round: args.round,
                allMembersSubmitted: args.round === 1
                  ? latest.data.round > 1 || latest.data.state === 'DECIDED' || latest.data.state === 'NO_CONSENSUS'
                  : latest.data.state === 'DECIDED' || latest.data.state === 'NO_CONSENSUS',
                roomVersion: latest.data.version,
                receipt: latest.data.ownSubmission,
              },
            };
            return response;
          }
          const activeStates = args.round === 1 ? ['ROUND_1', 'WAITING_1'] : ['ROUND_2', 'WAITING_2'];
          if (!activeStates.includes(latest.data.state)
            || latest.data.round !== args.round
            || latest.data.poolVersion !== args.poolVersion
            || latest.data.version !== previous.expectedVersion) {
            await durableOutbox.remove(identityId, previous.requestId).catch(() => undefined);
            return { ok: false, requestId: previous.requestId, roomId: args.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
          }
          rid = previous.requestId;
          const previousPayload = previous.payload as { intentId?: string } | undefined;
          intent = previousPayload?.intentId ?? `intent_${rid}`;
        }
      } catch {
        return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'UNKNOWN_ERROR', message: 'Chưa thể kiểm tra trạng thái lượt chọn đã lưu; chưa gửi lại.' } };
      }
    }

    const cacheKey = `${args.roomId}_${args.round}_${rid}`;
    const cachedEntry = this.idempotencyCache.get(cacheKey);
    if (cachedEntry) {
      if (cachedEntry.payloadSerialized !== payloadSerialized) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: {
            messageKey: 'REQUEST_ID_REUSED',
            details: { reason: 'REQUEST_ID_REUSED_WITH_DIFFERENT_PAYLOAD' },
          },
        };
      }
      return cachedEntry.result;
    }

    if (identityId && durableOutbox) {
      try {
        await durableOutbox.enqueue({
          identityId,
          roomId: args.roomId,
          round: args.round,
          poolVersion: args.poolVersion,
          contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
          requestId: rid,
          expectedVersion: args.expectedVersion,
          payload: { intentId: intent, votes: wireVotes },
        });
      } catch {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: { messageKey: 'UNKNOWN_ERROR', message: 'Chưa lưu an toàn được lượt chọn trên thiết bị; chưa gửi lên máy chủ.' },
        };
      }
    }

    const acknowledgePersistedIntent = async () => {
      if (!identityId || !durableOutbox) return;
      try { await durableOutbox.acknowledge(identityId, rid); } catch {
        await durableOutbox.markUnknown(identityId, rid).catch(() => undefined);
      }
    };
    const classifyFailedIntent = async (messageKey: string) => {
      if (!identityId || !durableOutbox) return;
      if (messageKey === 'NETWORK_ERROR' || messageKey === 'TIMEOUT' || messageKey === 'UNKNOWN_ERROR') {
        await durableOutbox.markUnknown(identityId, rid).catch(() => undefined);
      } else {
        await durableOutbox.remove(identityId, rid).catch(() => undefined);
      }
    };

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
            votes: wireVotes,
          },
        })) as any;

        if (raw && !raw.ok) {
          const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
          await classifyFailedIntent(errCode);
          return {
            ok: false,
            requestId: rid,
            roomId: args.roomId,
            error: { messageKey: errCode, details: raw.error?.details },
          };
        }

        // F7: Canonical envelope guard check
        if (!isCanonicalSubmitEnvelope(raw, args)) {
          await classifyFailedIntent('UNKNOWN_ERROR');
          return {
            ok: false,
            requestId: rid,
            roomId: args.roomId,
            error: { messageKey: 'MALFORMED_RESPONSE' },
          };
        }

        const submittedAt = raw.data.submittedAt;
        const receipt: SubmissionReceipt = {
          round: args.round,
          intentId: intent,
          requestId: rid,
          submittedAt,
          voteCount: wireVotes.length,
          votesSummary: args.votes,
        };
        const isTerminalState = raw.state === 'DECIDED' || raw.state === 'NO_CONSENSUS';
        const isAdvancedRound = raw.state === 'ROUND_2' && args.round === 1;
        const allSubmitted = isTerminalState || isAdvancedRound;

        const res: WriteResult<SubmitBallotResponse> = {
          ok: true,
          requestId: rid,
          roomId: args.roomId,
          version: raw.version,
          state: raw.state,
          data: {
            accepted: true,
            round: args.round,
            allMembersSubmitted: allSubmitted,
            roomVersion: raw.version,
            receipt,
          },
        };
        await acknowledgePersistedIntent();
        this.idempotencyCache.set(cacheKey, { payloadSerialized, result: res });
        return res;
      } catch (err: unknown) {
        await classifyFailedIntent('NETWORK_ERROR');
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: mapErrorHelper(err),
        };
      }
    }

    // Fallback client submit
    if (this.client) {
      const submitReq: SubmitBallotRequest = {
        roomId: args.roomId,
        round: args.round,
        poolVersion: args.poolVersion,
        expectedVersion: args.expectedVersion,
        intentId: intent,
        requestId: rid,
        votes: args.votes,
      };
      const res = await this.client.submitBallot(submitReq);
      if (res.ok) {
        await acknowledgePersistedIntent();
        this.idempotencyCache.set(cacheKey, { payloadSerialized, result: res });
      } else {
        await classifyFailedIntent(res.error.messageKey);
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
   * Enters the waiting room after ballot ACK.
   * Uses canonical schema contract: dish-session-v4/roadmap-v2/GM-07.B-supplement.
   * Requires server-provided waitingStartedAt and deadline (F7).
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
        })) as any;

        if (raw && !raw.ok) {
          const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
          return {
            ok: false,
            requestId: rid,
            roomId: args.roomId,
            error: { messageKey: errCode, details: raw.error?.details },
          };
        }

        // F7: Canonical envelope validation — requires deadline from server (no synthetic fallback)
        if (!isCanonicalWaitingEnvelope(raw, args)) {
          return {
            ok: false,
            requestId: rid,
            roomId: args.roomId,
            error: { messageKey: 'MALFORMED_RESPONSE' },
          };
        }

        return {
          ok: true,
          requestId: rid,
          roomId: args.roomId,
          version: raw.version,
          state: raw.state,
          data: {
            accepted: true,
            round: args.round,
            poolVersion: args.poolVersion,
            waitingStartedAt: raw.data.waitingStartedAt,
            deadline: raw.data.deadline,
            roomVersion: raw.version,
            state: raw.state,
          },
        };
      } catch (err: unknown) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: mapErrorHelper(err),
        };
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
   * Finalizes the current round early (Host Chốt ngay).
   * Enforces quorum condition: A_r > M/2 (strictly more than half locked roster).
   */
  async finalize(args: FinalizeArgs): Promise<WriteResult<FinalizeResponse>> {
    const rid = args.requestId || this.nextRequestId('finalize');

    // Quorum check if counts are supplied
    if (args.rosterAcknowledgedCount != null && args.totalRosterCount != null) {
      if (!isHostEarlyFinishAllowed(args.rosterAcknowledgedCount, args.totalRosterCount)) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: {
            messageKey: 'NOT_READY',
            details: {
              acknowledged: args.rosterAcknowledgedCount,
              total: args.totalRosterCount,
            },
          },
        };
      }
    }

    if (args.isHost === false) {
      return {
        ok: false,
        requestId: rid,
        roomId: args.roomId,
        error: { messageKey: 'NOT_HOST' },
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
        })) as any;

        if (raw && !raw.ok) {
          const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
          return {
            ok: false,
            requestId: rid,
            roomId: args.roomId,
            error: { messageKey: errCode, details: raw.error?.details },
          };
        }

        // F7: Canonical envelope validation
        if (!isCanonicalFinalizeEnvelope(raw, args)) {
          return {
            ok: false,
            requestId: rid,
            roomId: args.roomId,
            error: { messageKey: 'MALFORMED_RESPONSE' },
          };
        }

        return {
          ok: true,
          requestId: rid,
          roomId: args.roomId,
          version: raw.version,
          state: raw.data.state,
          data: {
            accepted: true,
            outcome: raw.data.outcome,
            state: raw.data.state,
            round: raw.data.round,
            resultId: raw.data.resultId,
            finalizedAt: raw.data.finalizedAt,
          },
        };
      } catch (err: unknown) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: mapErrorHelper(err),
        };
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
   * Fetches the current room snapshot.
   * Requires strict validation against canonical schema guards (F7).
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
        })) as any;

        if (raw?.ok && raw.data) {
          if (isCanonicalRoomSnapshot(raw.data) || isRoomSnapshot(raw.data)) {
            const snapshot = raw.data as RoomSnapshot;
            await this.reconcileOutbox(snapshot);
            return { ok: true, data: snapshot };
          }
          // F7: Missing or invalid schema fields must strictly return MALFORMED_RESPONSE
          return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
        }
        if (raw && !raw.ok) {
          const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as ErrorCode;
          return { ok: false, error: { messageKey: errCode, details: raw.error?.details } };
        }
        return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
      } catch (err: unknown) {
        return { ok: false, error: mapErrorHelper(err) };
      }
    }

    if (this.client) {
      const result = await this.client.getRoomSnapshot(roomId);
      if (result.ok) await this.reconcileOutbox(result.data);
      return result;
    }

    return {
      ok: false,
      error: { messageKey: 'NETWORK_ERROR' },
    };
  }

  private async reconcileOutbox(snapshot: RoomSnapshot): Promise<void> {
    const identityId = this.roomRepo?.getCurrentUser()?.id;
    if (!identityId) return;
    const outbox = this.outbox ?? getDurableOutbox();
    await outbox.cacheSnapshot({
      identityId,
      roomId: snapshot.roomId,
      contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
      value: snapshot,
    }).catch(() => undefined);
    await outbox.reconcileBeforeReplay(identityId, async () => ({
      roomId: snapshot.roomId,
      round: snapshot.round,
      poolVersion: snapshot.poolVersion,
      contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
      version: snapshot.version,
      active: ['ROUND_1', 'WAITING_1', 'ROUND_2', 'WAITING_2'].includes(snapshot.state),
      acknowledgedRequestIds: snapshot.ownSubmission?.requestId ? [snapshot.ownSubmission.requestId] : [],
    })).catch(() => []);
  }
}

export interface MockVoteRepositoryOptions {
  delayMs?: number;
  failSubmit?: boolean;
  failWaiting?: boolean;
  failFinalize?: boolean;
  errorCode?: ErrorCode;
  initialRound?: 1 | 2;
  initialTotalRoster?: number;
  initialAcknowledgedCount?: number;
  isHost?: boolean;
  initialSnapshot?: Partial<RoomSnapshot>;
}

export class MockVoteRepository implements VoteRepository {
  private readonly options: MockVoteRepositoryOptions;
  private readonly submissions = new Map<string, SubmitBallotArgs>();
  private readonly receipts = new Map<string, WriteResult<SubmitBallotResponse>>();
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

    // F1: Normalize to wire choices
    const wireVotes = args.votes.map(v => ({
      roundDishId: v.roundDishId,
      choice: (v as any).choice ?? v.vote,
    }));

    // Round 2 cap enforcement
    if (args.round === 2) {
      const removeCount = wireVotes.filter(v => v.choice === 'REMOVE').length;
      const cap = getRoundTwoEliminationCap(wireVotes.length);
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

    // Check cached idempotent response
    const cacheKey = `${args.roomId}_${args.round}_${rid}`;
    if (this.receipts.has(cacheKey)) {
      const cached = this.receipts.get(cacheKey)!;
      return cached;
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
