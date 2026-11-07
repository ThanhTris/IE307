import { validRawDish, validRawTerminal } from './resultWireGuard';
/**
 * GM-27 — UI–API kết quả Top 3 và Places độc lập.
 * Connects the canonical dish_session v4 result projection (GM-20/21)
 * to the mobile UI flow with dense ranking, ties, NO_CONSENSUS, and Places isolation.
 *
 * Spec: docs/specs/UI_SPEC.md, docs/architecture/DISH_SESSION_API_CONTRACT_B.md
 * Task: GM-27 (Issue #88)
 */

import type {
  ApiClient,
  ErrorCode,
  ReadResult,
  RoomResult,
  RoomSnapshot,
} from '../../../data/api/contracts';
import { mapErrorHelper } from '../../../data/api/client/helpers';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import {
  validScoredResult,
  type NearbyPlace,
  type NearbyState,
  type NearbyStatus,
  type RankedDish,
  type ResultCompanion,
  type ResultDish,
  type ResultInput,
  type ScoredResult,
} from './resultPresentation';

export const CANONICAL_RESULT_CONTRACT_VERSION = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
export const BASELINE_RESULT_CONTRACT_VERSION = 'dish-session-v4/roadmap-v2/GM-07.B';
export const CANONICAL_RESULT_POLICY_VERSION = 'dish-decision-v4/ADR-019-30PCT-MIN1';
export const LEGACY_DECISION_POLICY_VERSION = 'decision-v2';

export interface GetResultOptions {
  contractVersion?: string;
  forceRefetch?: boolean;
  identityId?: string;
}

export interface FetchNearbyPlacesParams {
  resultId: string;
  winnerDishId: string;
  dishName?: string;
  latitude?: number;
  longitude?: number;
}

export interface ResultRepository {
  /** Reads the terminal result projection, returning either canonical scored-v4 or legacy unscored-v1. */
  getResult(roomId: string, options?: GetResultOptions): Promise<ReadResult<ResultInput>>;
  /** Reads and validates a canonical scored-v4 terminal result. */
  getScoredResult(roomId: string, options?: GetResultOptions): Promise<ReadResult<ScoredResult>>;
  /** Optional helper to get room snapshot companions / roster members. */
  getSnapshot?(roomId: string): Promise<ReadResult<RoomSnapshot>>;
  /** Optional helper to fetch nearby places for the winning dish without altering the winner. */
  fetchNearbyPlaces?(params: FetchNearbyPlacesParams): Promise<ReadResult<NearbyState>>;
  /** Optional cleanup / unsubscribe */
  dispose?(): void;
}

export interface LiveResultRepositoryDeps {
  roomRepository?: RoomRepository;
  client?: ApiClient;
  rpcCaller?: (name: string, params: Record<string, unknown>) => Promise<unknown>;
  contractVersion?: string;
  placesFetcher?: (params: FetchNearbyPlacesParams) => Promise<ReadResult<NearbyState>>;
  getCurrentIdentity?: () => string | null;
}

/**
 * Maps raw dish projection into a sanitized ResultDish complying with ResultDish shape.
 */
export function mapRawToResultDish(raw: any): ResultDish | null {
  if (!validRawDish(raw)) return null;
  return {
    dishId: raw.dishId, roundDishId: raw.roundDishId, name: raw.name,
    description: raw.description, artwork: raw.artwork, priceReference: raw.priceReference,
  };
}

/**
 * Maps raw snapshot members into ResultCompanion presentation items.
 */
export function mapSnapshotMembersToCompanions(members: unknown): ResultCompanion[] {
  if (!Array.isArray(members)) return [];
  const result: ResultCompanion[] = [];
  const seen = new Set<string>();
  for (const m of members) {
    if (!m || typeof m !== 'object') continue;
    const id = typeof (m as any).userId === 'string' ? (m as any).userId : (m as any).id;
    const label = typeof (m as any).displayName === 'string' ? (m as any).displayName : (m as any).nickname;
    if (typeof id === 'string' && id.trim() && !seen.has(id)) {
      seen.add(id);
      result.push({ id: id.trim(), label: typeof label === 'string' && label.trim() ? label.trim() : 'Thành viên' });
    }
  }
  return result;
}

/**
 * Transforms raw server response into a valid ScoredResult if compliant with contract.
 * Preserves server-persisted order, scores, and ranks; never recalculates on client.
 */
export function mapRawToScoredResult(raw: any): ScoredResult | null {
  if (!validRawTerminal(raw) || !validScoredResult(raw as ScoredResult)) return null;
  if (!raw || typeof raw !== 'object') return null;

  // Raw wire schema validation: check actual existence of the 4 required keys in $defs.terminalResult.required
  if (!('winner' in raw) || !('topDishes' in raw) || !('scoreVersion' in raw) || !('rankingVersion' in raw)) {
    return null;
  }

  const resultId = typeof raw.resultId === 'string' ? raw.resultId.trim() : null;
  const contractVersion = raw.contractVersion;
  const policyVersion = raw.policyVersion;
  const status = raw.status;
  const round = raw.round;
  const reasonCode = raw.reasonCode;
  const finalizedAt = typeof raw.finalizedAt === 'string' ? raw.finalizedAt : null;
  const scoreVersion = raw.scoreVersion;
  const rankingVersion = raw.rankingVersion;
  const round1BallotCount = typeof raw.round1BallotCount === 'number' ? raw.round1BallotCount : undefined;

  if (!resultId || !finalizedAt || (round !== 1 && round !== 2)) return null;
  if (status !== 'DECIDED' && status !== 'NO_CONSENSUS') return null;

  // Validate canonical contractVersion and policyVersion
  if (
    contractVersion !== 'dish-session-v4/roadmap-v2/GM-07.B' &&
    contractVersion !== 'dish-session-v4/roadmap-v2/GM-07.B-supplement'
  ) {
    return null;
  }
  if (policyVersion !== CANONICAL_RESULT_POLICY_VERSION) {
    return null;
  }

  // round1BallotCount validation
  if (contractVersion === 'dish-session-v4/roadmap-v2/GM-07.B-supplement') {
    if (round1BallotCount === undefined || !Number.isInteger(round1BallotCount) || round1BallotCount < 0 || round1BallotCount > 20) {
      return null;
    }
  }

  if (status === 'NO_CONSENSUS') {
    // For NO_CONSENSUS, wire object must explicitly have winner: null, topDishes: [], scoreVersion: null, rankingVersion: null
    if (raw.winner !== null) return null;
    if (!Array.isArray(raw.topDishes) || raw.topDishes.length !== 0) return null;
    if (raw.scoreVersion !== null) return null;
    if (raw.rankingVersion !== null) return null;

    if (round === 1 && reasonCode !== 'EMPTY_INTERSECTION') return null;
    if (round === 2 && reasonCode !== 'ALL_REMOVED') return null;

    const scoredNoConsensus: ScoredResult = {
      resultId,
      contractVersion,
      policyVersion,
      status: 'NO_CONSENSUS',
      round,
      winner: null,
      reasonCode,
      finalizedAt,
      scoreVersion: null,
      rankingVersion: null,
      topDishes: [],
      ...(round1BallotCount !== undefined ? { round1BallotCount } : {}),
    };
    return validScoredResult(scoredNoConsensus) ? scoredNoConsensus : null;
  }

  // DECIDED status
  if (scoreVersion !== 'want2-ok1-round1-v1') return null;
  if (rankingVersion !== 'score-desc-dense-rank-v1') return null;
  if (round === 1 && reasonCode !== 'UNANIMOUS_WANT') return null;
  if (round === 2 && reasonCode !== 'ACCEPTABLE_FINAL') return null;

  const winnerDish = mapRawToResultDish(raw.winner);
  if (!winnerDish) return null;

  if (!Array.isArray(raw.topDishes) || raw.topDishes.length < 1 || raw.topDishes.length > 3) {
    return null;
  }

  const mappedTopDishes: RankedDish[] = [];
  for (const item of raw.topDishes) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    if (!('dish' in item) || !('score' in item) || !('rank' in item) || !('isWinner' in item)) return null;
    const dish = mapRawToResultDish(item.dish);
    if (!dish) return null;
    if (typeof item.score !== 'number' || !Number.isInteger(item.score) || item.score < 0) return null;
    if (typeof item.rank !== 'number' || !Number.isInteger(item.rank) || item.rank < 1) return null;
    if (typeof item.isWinner !== 'boolean') return null;

    mappedTopDishes.push({
      dish,
      score: item.score,
      rank: item.rank,
      isWinner: item.isWinner,
    });
  }

  const scored: ScoredResult = {
    resultId,
    contractVersion,
    policyVersion,
    status: 'DECIDED',
    round,
    winner: winnerDish,
    reasonCode,
    finalizedAt,
    scoreVersion,
    rankingVersion,
    topDishes: mappedTopDishes,
    ...(round1BallotCount !== undefined ? { round1BallotCount } : {}),
  };

  return validScoredResult(scored) ? scored : null;
}

export class LiveResultRepository implements ResultRepository {
  private readonly roomRepo?: RoomRepository;
  private readonly client?: ApiClient;
  private readonly rpcCaller?: (name: string, params: Record<string, unknown>) => Promise<unknown>;
  private readonly defaultContractVersion: string;
  private readonly placesFetcher?: (params: FetchNearbyPlacesParams) => Promise<ReadResult<NearbyState>>;
  private readonly getCurrentIdentity?: () => string | null;
  private unsubscribeSession?: () => void;

  // In-memory cache of terminal results partitioned by identity + roomId + contractVersion
  private readonly resultCache = new Map<string, ResultInput>();
  // Monotonic epoch counters to prevent late responses from restoring invalidated cache
  private globalEpoch = 1;
  private readonly roomEpochs = new Map<string, number>();

  constructor(deps: LiveResultRepositoryDeps = {}) {
    this.roomRepo = deps.roomRepository;
    this.client = deps.client;
    this.rpcCaller = deps.rpcCaller;
    this.defaultContractVersion = deps.contractVersion ?? CANONICAL_RESULT_CONTRACT_VERSION;
    this.placesFetcher = deps.placesFetcher;
    this.getCurrentIdentity = deps.getCurrentIdentity ?? (() => {
      if (this.roomRepo && typeof this.roomRepo.getCurrentUser === 'function') {
        return this.roomRepo.getCurrentUser()?.id ?? null;
      }
      return null;
    });

    let lastIdent = this.resolveCurrentIdentity();
    if (this.roomRepo && typeof this.roomRepo.subscribeSession === 'function') {
      this.unsubscribeSession = this.roomRepo.subscribeSession(() => {
        const currentIdent = this.resolveCurrentIdentity();
        if (currentIdent !== lastIdent) {
          lastIdent = currentIdent;
          this.clearCache();
        }
      });
    }
  }

  dispose(): void {
    if (this.unsubscribeSession) {
      this.unsubscribeSession();
      this.unsubscribeSession = undefined;
    }
  }

  resolveCurrentIdentity(): string | null {
    if (this.getCurrentIdentity) {
      try {
        return this.getCurrentIdentity() ?? null;
      } catch {
        return null;
      }
    }
    if (this.roomRepo && typeof this.roomRepo.getCurrentUser === 'function') {
      try {
        return this.roomRepo.getCurrentUser()?.id ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private getCaller(): ((name: string, params: Record<string, unknown>) => Promise<unknown>) | null {
    if (this.rpcCaller) return this.rpcCaller;
    if (this.roomRepo && typeof (this.roomRepo as any).getRpcCaller === 'function') {
      return (this.roomRepo as any).getRpcCaller();
    }
    return null;
  }

  private getCacheKey(roomId: string, identityId?: string, contractVersion?: string): string {
    const ident = identityId ?? this.resolveCurrentIdentity() ?? 'anonymous';
    const cv = contractVersion ?? this.defaultContractVersion;
    return `${ident}:${roomId}:${cv}`;
  }

  private getRoomEpoch(roomId: string): number {
    return this.roomEpochs.get(roomId) ?? 1;
  }

  private bumpRoomEpoch(roomId: string): number {
    const next = (this.roomEpochs.get(roomId) ?? 1) + 1;
    this.roomEpochs.set(roomId, next);
    return next;
  }

  /**
   * Completely clears the cache and bumps the global epoch.
   * Call upon logout or account change.
   */
  clearCache(): void {
    this.globalEpoch += 1;
    this.resultCache.clear();
  }

  /**
   * Invalidates any cached results for a specific room across all identities/contracts.
   */
  invalidateRoom(roomId: string): void {
    const trimmed = roomId.trim();
    this.bumpRoomEpoch(trimmed);
    for (const key of Array.from(this.resultCache.keys())) {
      if (key.includes(`:${trimmed}:`)) {
        this.resultCache.delete(key);
      }
    }
  }

  private isPermissionOrTerminalRevocationError(errCode?: string): boolean {
    if (!errCode) return false;
    return [
      'NOT_MEMBER',
      'AUTH_REQUIRED',
      'UNAUTHORIZED',
      'ROOM_EXPIRED',
      'FORBIDDEN',
      'PERMISSION_DENIED',
      'ROOM_NOT_FOUND',
      'NOT_FOUND',
      'ACCESS_DENIED',
      'SESSION_NOT_FOUND',
      'OUTSIDER',
      'KICKED',
      '401',
      '403',
    ].includes(errCode);
  }

  /**
   * Reads the terminal result projection for a room.
   * If cached and not forced, returns the persisted result immediately.
   */
  async getResult(roomId: string, options?: GetResultOptions): Promise<ReadResult<ResultInput>> {
    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      return { ok: false, error: { messageKey: 'INVALID_INPUT' } };
    }

    const trimmedRoomId = roomId.trim();
    const contractVersion = options?.contractVersion ?? this.defaultContractVersion;
    const startGlobalEpoch = this.globalEpoch;
    const startRoomEpoch = this.getRoomEpoch(trimmedRoomId);
    const startIdentity = options?.identityId ?? this.resolveCurrentIdentity();
    const cacheKey = this.getCacheKey(trimmedRoomId, startIdentity ?? undefined, contractVersion);

    const isEpochValid = () => {
      const currentIdent = options?.identityId ?? this.resolveCurrentIdentity();
      return (
        this.globalEpoch === startGlobalEpoch &&
        this.getRoomEpoch(trimmedRoomId) === startRoomEpoch &&
        currentIdent === startIdentity
      );
    };

    if (!options?.forceRefetch && this.resultCache.has(cacheKey)) {
      return { ok: true, data: this.resultCache.get(cacheKey)! };
    }

    const caller = this.getCaller();

    if (caller) {
      try {
        const raw = (await caller('dish_session', {
          command: 'result',
          payload: {
            contractVersion,
            roomId: trimmedRoomId,
          },
        })) as any;

        if (!isEpochValid()) {
          return { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Room context or auth changed in flight' } };
        }

        if (raw?.ok && raw.data) {
          const isCanonical =
            raw.data.contractVersion === CANONICAL_RESULT_CONTRACT_VERSION ||
            raw.data.contractVersion === BASELINE_RESULT_CONTRACT_VERSION ||
            raw.data.policyVersion === CANONICAL_RESULT_POLICY_VERSION;

          if (isCanonical) {
            const scored = mapRawToScoredResult(raw.data);
            if (scored) {
              const resultInput: ResultInput = { capability: 'scored-v4', result: scored };
              if (isEpochValid()) {
                this.resultCache.set(cacheKey, resultInput);
              }
              return isEpochValid()
                ? { ok: true, data: resultInput }
                : { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Room context or auth changed in flight' } };
            }
            // Canonical projection failed validation - reject as MALFORMED_RESPONSE without legacy fallback
            return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
          }

          // Check for genuine legacy unscored-v1
          const isLegacy =
            raw.data.policyVersion === LEGACY_DECISION_POLICY_VERSION &&
            raw.data.contractVersion !== CANONICAL_RESULT_CONTRACT_VERSION &&
            raw.data.contractVersion !== BASELINE_RESULT_CONTRACT_VERSION;

          if (isLegacy) {
            const legacyInput: ResultInput = {
              capability: 'legacy-unscored-v1',
              result: raw.data as RoomResult,
            };
            if (isEpochValid()) {
              this.resultCache.set(cacheKey, legacyInput);
            }
            return isEpochValid()
              ? { ok: true, data: legacyInput }
              : { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Room context or auth changed in flight' } };
          }

          // Payload does not conform to required contracts
          return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
        }

        if (raw && !raw.ok) {
          const errCode = (raw.error?.messageKey || raw.error?.code || 'UNKNOWN_ERROR') as string;
          if (this.isPermissionOrTerminalRevocationError(errCode)) {
            this.invalidateRoom(trimmedRoomId);
          }
          // Result not yet finalized
          if (errCode === 'RESULT_NOT_READY' || errCode === 'NOT_READY') {
            return { ok: false, error: { messageKey: 'NOT_READY', details: raw.error?.details } };
          }
          return { ok: false, error: { messageKey: errCode as ErrorCode, details: raw.error?.details } };
        }

        return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
      } catch (err: unknown) {
        // Inspect for explicit RESULT_NOT_READY / NOT_READY inside thrown error (e.g. FetchTransport HTTP 409)
        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
        const body = errObj?.body && typeof errObj.body === 'object' ? (errObj.body as Record<string, unknown>) : null;
        const bodyError = body?.error && typeof body.error === 'object' ? (body.error as Record<string, unknown>) : null;
        const errError = errObj?.error && typeof errObj.error === 'object' ? (errObj.error as Record<string, unknown>) : null;

        const candidateKeys: unknown[] = [
          bodyError?.messageKey,
          bodyError?.code,
          body?.messageKey,
          body?.code,
          errError?.messageKey,
          errError?.code,
          errObj?.messageKey,
          errObj?.code,
        ];

        const isResultNotReady = candidateKeys.some(k => k === 'RESULT_NOT_READY' || k === 'NOT_READY');
        if (isResultNotReady) {
          return { ok: false, error: { messageKey: 'NOT_READY' } };
        }

        const mapped = mapErrorHelper(err);
        const rawStatus = typeof (err as any)?.status === 'number'
          ? (err as any).status
          : typeof (err as any)?.statusCode === 'number'
            ? (err as any).statusCode
            : null;

        const isAuthOrPermissionLoss =
          rawStatus === 401 ||
          rawStatus === 403 ||
          this.isPermissionOrTerminalRevocationError(mapped.messageKey);

        if (isAuthOrPermissionLoss) {
          this.invalidateRoom(trimmedRoomId);
        }

        return { ok: false, error: mapped };
      }
    }

    // Client-based fallback if available
    if (this.client) {
      try {
        const snap = await this.client.getRoomSnapshot(trimmedRoomId);
        if (!isEpochValid()) {
          return { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Room context or auth changed in flight' } };
        }

        if (snap.ok && snap.data.result) {
          const rawResult = snap.data.result as any;
          const isCanonical =
            rawResult.contractVersion === CANONICAL_RESULT_CONTRACT_VERSION ||
            rawResult.contractVersion === BASELINE_RESULT_CONTRACT_VERSION ||
            rawResult.policyVersion === CANONICAL_RESULT_POLICY_VERSION;

          if (isCanonical) {
            const scored = mapRawToScoredResult(rawResult);
            if (scored) {
              const input: ResultInput = { capability: 'scored-v4', result: scored };
              if (isEpochValid()) {
                this.resultCache.set(cacheKey, input);
              }
              return isEpochValid()
                ? { ok: true, data: input }
                : { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Room context or auth changed in flight' } };
            }
            return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
          }

          const isLegacy =
            rawResult.policyVersion === LEGACY_DECISION_POLICY_VERSION &&
            rawResult.contractVersion !== CANONICAL_RESULT_CONTRACT_VERSION &&
            rawResult.contractVersion !== BASELINE_RESULT_CONTRACT_VERSION;

          if (isLegacy) {
            const legacyInput: ResultInput = {
              capability: 'legacy-unscored-v1',
              result: rawResult,
            };
            if (isEpochValid()) {
              this.resultCache.set(cacheKey, legacyInput);
            }
            return isEpochValid()
              ? { ok: true, data: legacyInput }
              : { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Room context or auth changed in flight' } };
          }

          return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
        }
        if (!snap.ok) {
          const snapErr = (snap.error?.messageKey || (snap.error as any)?.code || '') as string;
          if (snapErr === 'RESULT_NOT_READY' || snapErr === 'NOT_READY') {
            return { ok: false, error: { messageKey: 'NOT_READY', details: snap.error?.details } };
          }
          if (this.isPermissionOrTerminalRevocationError(snapErr)) {
            this.invalidateRoom(trimmedRoomId);
          }
          return { ok: false, error: snap.error };
        }
      } catch (err: unknown) {
        const errObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
        const body = errObj?.body && typeof errObj.body === 'object' ? (errObj.body as Record<string, unknown>) : null;
        const bodyError = body?.error && typeof body.error === 'object' ? (body.error as Record<string, unknown>) : null;
        const errError = errObj?.error && typeof errObj.error === 'object' ? (errObj.error as Record<string, unknown>) : null;

        const candidateKeys: unknown[] = [
          bodyError?.messageKey,
          bodyError?.code,
          body?.messageKey,
          body?.code,
          errError?.messageKey,
          errError?.code,
          errObj?.messageKey,
          errObj?.code,
        ];

        const isResultNotReady = candidateKeys.some(k => k === 'RESULT_NOT_READY' || k === 'NOT_READY');
        if (isResultNotReady) {
          return { ok: false, error: { messageKey: 'NOT_READY' } };
        }

        const mapped = mapErrorHelper(err);
        const rawStatus = typeof (err as any)?.status === 'number'
          ? (err as any).status
          : typeof (err as any)?.statusCode === 'number'
            ? (err as any).statusCode
            : null;

        const isAuthOrPermissionLoss =
          rawStatus === 401 ||
          rawStatus === 403 ||
          this.isPermissionOrTerminalRevocationError(mapped.messageKey);

        if (isAuthOrPermissionLoss) {
          this.invalidateRoom(trimmedRoomId);
        }

        return { ok: false, error: mapped };
      }
    }

    return { ok: false, error: { messageKey: 'NETWORK_ERROR' } };
  }

  /**
   * Fetches the scored-v4 terminal result, rejecting legacy or malformed results.
   */
  async getScoredResult(roomId: string, options?: GetResultOptions): Promise<ReadResult<ScoredResult>> {
    const res = await this.getResult(roomId, options);
    if (!res.ok) return res;
    if (res.data.capability !== 'scored-v4') {
      return { ok: false, error: { messageKey: 'CONTRACT_MISMATCH' } };
    }
    return { ok: true, data: res.data.result };
  }

  /**
   * Reads room snapshot to extract member companions or current room state.
   */
  async getSnapshot(roomId: string): Promise<ReadResult<RoomSnapshot>> {
    const caller = this.getCaller();
    if (caller) {
      try {
        const raw = (await caller('dish_session', {
          command: 'snapshot',
          payload: {
            contractVersion: this.defaultContractVersion,
            roomId,
          },
        })) as any;
        if (raw?.ok && raw.data) {
          return { ok: true, data: raw.data as RoomSnapshot };
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
      return this.client.getRoomSnapshot(roomId);
    }

    return { ok: false, error: { messageKey: 'NETWORK_ERROR' } };
  }

  /**
   * Fetches nearby places for the winning dish without mutating the canonical result.
   */
  async fetchNearbyPlaces(params: FetchNearbyPlacesParams): Promise<ReadResult<NearbyState>> {
    if (this.placesFetcher) {
      try {
        return await this.placesFetcher(params);
      } catch {
        return {
          ok: true,
          data: {
            resultId: params.resultId,
            winnerDishId: params.winnerDishId,
            status: 'error',
            places: [],
            fetchedAt: new Date().toISOString(),
          },
        };
      }
    }

    // Default fallback when places service is not configured (e.g. pending GM-30 native module)
    return {
      ok: true,
      data: {
        resultId: params.resultId,
        winnerDishId: params.winnerDishId,
        status: 'permission',
        places: [],
        fetchedAt: null,
      },
    };
  }
}

export interface MockResultRepositoryOptions {
  initialResult?: ResultInput | ScoredResult;
  readState?: 'ready' | 'loading' | 'finalizing' | 'error';
  delayMs?: number;
  failResult?: boolean;
  errorCode?: ErrorCode;
  nearbyStatus?: NearbyStatus;
  places?: NearbyPlace[];
  members?: ResultCompanion[];
}

export class MockResultRepository implements ResultRepository {
  private readonly options: MockResultRepositoryOptions;

  constructor(options: MockResultRepositoryOptions = {}) {
    this.options = options;
  }

  async getResult(roomId: string): Promise<ReadResult<ResultInput>> {
    if (this.options.delayMs) {
      await new Promise(r => setTimeout(r, this.options.delayMs));
    }

    if (this.options.failResult) {
      return {
        ok: false,
        error: { messageKey: this.options.errorCode || 'UNKNOWN_ERROR' },
      };
    }

    if (this.options.readState === 'finalizing') {
      return {
        ok: false,
        error: { messageKey: 'NOT_READY' },
      };
    }

    if (this.options.readState === 'error') {
      return {
        ok: false,
        error: { messageKey: this.options.errorCode || 'NETWORK_ERROR' },
      };
    }

    if (this.options.initialResult) {
      const init = this.options.initialResult;
      if ('capability' in init) {
        return { ok: true, data: init };
      }
      return { ok: true, data: { capability: 'scored-v4', result: init } };
    }

    // Default mock scored result
    const defaultWinner: ResultDish = {
      dishId: '00000000-0000-4000-8000-000000000010',
      roundDishId: '00000000-0000-4000-8000-000000000020',
      name: 'Phở bò tái nạm',
      description: 'Phở truyền thống nước dùng thanh ngọt',
      artwork: null,
      priceReference: {
        amount: 65000,
        currency: 'VND',
        unit: 'portion',
        servingSize: null,
        sourceRef: 'Menu',
        checkedAt: new Date().toISOString(),
      },
    };

    const defaultScored: ScoredResult = {
      resultId: '00000000-0000-4000-8000-000000000100',
      contractVersion: CANONICAL_RESULT_CONTRACT_VERSION,
      policyVersion: CANONICAL_RESULT_POLICY_VERSION,
      status: 'DECIDED',
      round: 1,
      winner: defaultWinner,
      reasonCode: 'UNANIMOUS_WANT',
      finalizedAt: new Date().toISOString(),
      scoreVersion: 'want2-ok1-round1-v1',
      rankingVersion: 'score-desc-dense-rank-v1',
      round1BallotCount: 3,
      topDishes: [
        { dish: defaultWinner, score: 6, rank: 1, isWinner: true },
      ],
    };

    return {
      ok: true,
      data: { capability: 'scored-v4', result: defaultScored },
    };
  }

  async getScoredResult(roomId: string): Promise<ReadResult<ScoredResult>> {
    const res = await this.getResult(roomId);
    if (!res.ok) return res;
    if (res.data.capability !== 'scored-v4') {
      return { ok: false, error: { messageKey: 'CONTRACT_MISMATCH' } };
    }
    return { ok: true, data: res.data.result };
  }

  async fetchNearbyPlaces(params: FetchNearbyPlacesParams): Promise<ReadResult<NearbyState>> {
    if (this.options.delayMs) {
      await new Promise(r => setTimeout(r, this.options.delayMs));
    }

    const status = this.options.nearbyStatus ?? 'ready';
    const places = this.options.places ?? [
      {
        id: 'mock-place-1',
        name: 'Quán Phở Thảo',
        address: '123 Võ Văn Ngân, TP. Thủ Đức',
        distanceM: 450,
        latitude: 10.8505,
        longitude: 106.7719,
        attribution: 'Mô phỏng · không phải Google Places',
      },
    ];

    return {
      ok: true,
      data: {
        resultId: params.resultId,
        winnerDishId: params.winnerDishId,
        status,
        places: status === 'ready' ? places : [],
        fetchedAt: new Date().toISOString(),
      },
    };
  }
}

export function createLiveResultRepository(deps: LiveResultRepositoryDeps = {}): ResultRepository {
  return new LiveResultRepository(deps);
}

export function createMockResultRepository(options: MockResultRepositoryOptions = {}): ResultRepository {
  return new MockResultRepository(options);
}
