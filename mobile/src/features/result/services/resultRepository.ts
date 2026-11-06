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
  if (!raw || typeof raw !== 'object') return null;
  const dishId = typeof raw.dishId === 'string' && raw.dishId.trim() ? raw.dishId.trim() : null;
  const roundDishId = typeof raw.roundDishId === 'string' && raw.roundDishId.trim() ? raw.roundDishId.trim() : null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;

  if (!dishId || !roundDishId || !name) return null;

  const description = typeof raw.description === 'string' && raw.description.trim() ? raw.description : null;

  let artwork: ResultDish['artwork'] = null;
  if (raw.artwork && typeof raw.artwork === 'object') {
    const uri = typeof raw.artwork.uri === 'string' && raw.artwork.uri.trim()
      ? raw.artwork.uri.trim()
      : typeof raw.artwork.url === 'string' && raw.artwork.url.trim()
        ? raw.artwork.url.trim()
        : null;
    if (uri) {
      artwork = {
        uri,
        altText: typeof raw.artwork.altText === 'string' && raw.artwork.altText.trim() ? raw.artwork.altText : name,
        attribution: typeof raw.artwork.attribution === 'string' && raw.artwork.attribution.trim() ? raw.artwork.attribution : null,
      };
    }
  }

  let priceReference: ResultDish['priceReference'] = null;
  if (raw.priceReference && typeof raw.priceReference === 'object') {
    const pr = raw.priceReference;
    const amount = typeof pr.amount === 'number' && Number.isFinite(pr.amount) && pr.amount >= 0 ? pr.amount : null;
    const currency = typeof pr.currency === 'string' && pr.currency.trim() ? pr.currency.trim() : null;
    const unit = typeof pr.unit === 'string' && pr.unit.trim() ? pr.unit.trim() : null;
    const checkedAt = typeof pr.checkedAt === 'string' && Number.isFinite(Date.parse(pr.checkedAt))
      ? pr.checkedAt
      : typeof pr.observedAt === 'string' && Number.isFinite(Date.parse(pr.observedAt))
        ? pr.observedAt
        : null;
    const sourceRef = typeof pr.sourceRef === 'string' && pr.sourceRef.trim()
      ? pr.sourceRef.trim()
      : typeof pr.source === 'string' && pr.source.trim()
        ? pr.source.trim()
        : null;
    const servingSize = typeof pr.servingSize === 'string' && pr.servingSize.trim() ? pr.servingSize.trim() : null;

    if (amount !== null && currency && unit && checkedAt && sourceRef) {
      priceReference = {
        amount,
        currency,
        unit,
        servingSize,
        sourceRef,
        checkedAt,
      };
    }
  }

  return {
    dishId,
    roundDishId,
    name,
    description,
    artwork,
    priceReference,
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
  if (!raw || typeof raw !== 'object') return null;

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
    if (round1BallotCount === undefined || !Number.isInteger(round1BallotCount) || round1BallotCount < 1 || round1BallotCount > 20) {
      return null;
    }
  }

  if (status === 'NO_CONSENSUS') {
    // For NO_CONSENSUS, server response MUST NOT have winner or non-empty topDishes
    if (raw.winner != null) return null;
    if (raw.topDishes != null && (!Array.isArray(raw.topDishes) || raw.topDishes.length > 0)) return null;

    // scoreVersion and rankingVersion must be null or undefined
    if (scoreVersion !== null && scoreVersion !== undefined) return null;
    if (rankingVersion !== null && rankingVersion !== undefined) return null;

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
    if (!item || typeof item !== 'object') return null;
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

  // In-memory cache of terminal results partitioned by identity + roomId + contractVersion
  private readonly resultCache = new Map<string, ResultInput>();
  // Generation counter per room to prevent late responses from restoring invalidated cache
  private readonly roomGenerations = new Map<string, number>();

  constructor(deps: LiveResultRepositoryDeps = {}) {
    this.roomRepo = deps.roomRepository;
    this.client = deps.client;
    this.rpcCaller = deps.rpcCaller;
    this.defaultContractVersion = deps.contractVersion ?? CANONICAL_RESULT_CONTRACT_VERSION;
    this.placesFetcher = deps.placesFetcher;
    this.getCurrentIdentity = deps.getCurrentIdentity;
  }

  private getCaller(): ((name: string, params: Record<string, unknown>) => Promise<unknown>) | null {
    if (this.rpcCaller) return this.rpcCaller;
    if (this.roomRepo && typeof (this.roomRepo as any).getRpcCaller === 'function') {
      return (this.roomRepo as any).getRpcCaller();
    }
    return null;
  }

  private getCacheKey(roomId: string, identityId?: string, contractVersion?: string): string {
    const ident = identityId ?? (this.getCurrentIdentity ? this.getCurrentIdentity() : null) ?? 'anonymous';
    const cv = contractVersion ?? this.defaultContractVersion;
    return `${ident}:${roomId}:${cv}`;
  }

  private getRoomGeneration(roomId: string): number {
    return this.roomGenerations.get(roomId) ?? 0;
  }

  private bumpRoomGeneration(roomId: string): number {
    const next = (this.roomGenerations.get(roomId) ?? 0) + 1;
    this.roomGenerations.set(roomId, next);
    return next;
  }

  /**
   * Completely clears the cache. Call upon logout or account change.
   */
  clearCache(): void {
    this.resultCache.clear();
    this.roomGenerations.clear();
  }

  /**
   * Invalidates any cached results for a specific room across all identities/contracts.
   */
  invalidateRoom(roomId: string): void {
    const trimmed = roomId.trim();
    this.bumpRoomGeneration(trimmed);
    for (const key of Array.from(this.resultCache.keys())) {
      if (key.includes(`:${trimmed}:`)) {
        this.resultCache.delete(key);
      }
    }
  }

  private isPermissionOrTerminalRevocationError(errCode: string): boolean {
    return [
      'NOT_MEMBER',
      'AUTH_REQUIRED',
      'UNAUTHORIZED',
      'ROOM_EXPIRED',
      'FORBIDDEN',
      'ROOM_NOT_FOUND',
      'NOT_FOUND',
      'ACCESS_DENIED',
      'SESSION_NOT_FOUND',
      'OUTSIDER',
      'KICKED',
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
    const cacheKey = this.getCacheKey(trimmedRoomId, options?.identityId, contractVersion);

    if (!options?.forceRefetch && this.resultCache.has(cacheKey)) {
      return { ok: true, data: this.resultCache.get(cacheKey)! };
    }

    const startGen = this.getRoomGeneration(trimmedRoomId);
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

        if (raw?.ok && raw.data) {
          // Check for canonical scored-v4
          const scored = mapRawToScoredResult(raw.data);
          if (scored) {
            const resultInput: ResultInput = { capability: 'scored-v4', result: scored };
            if (this.getRoomGeneration(trimmedRoomId) === startGen) {
              this.resultCache.set(cacheKey, resultInput);
            }
            return { ok: true, data: resultInput };
          }

          // Check for legacy unscored-v1
          if (raw.data.policyVersion === LEGACY_DECISION_POLICY_VERSION || raw.data.capability === 'legacy-unscored-v1') {
            const legacyInput: ResultInput = {
              capability: 'legacy-unscored-v1',
              result: raw.data as RoomResult,
            };
            if (this.getRoomGeneration(trimmedRoomId) === startGen) {
              this.resultCache.set(cacheKey, legacyInput);
            }
            return { ok: true, data: legacyInput };
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
        return { ok: false, error: mapErrorHelper(err) };
      }
    }

    // Client-based fallback if available
    if (this.client) {
      try {
        const snap = await this.client.getRoomSnapshot(trimmedRoomId);
        if (snap.ok && snap.data.result) {
          if (snap.data.result.policyVersion === 'decision-v2') {
            const legacyInput: ResultInput = {
              capability: 'legacy-unscored-v1',
              result: snap.data.result,
            };
            if (this.getRoomGeneration(trimmedRoomId) === startGen) {
              this.resultCache.set(cacheKey, legacyInput);
            }
            return { ok: true, data: legacyInput };
          }
          const scored = mapRawToScoredResult(snap.data.result);
          if (scored) {
            const input: ResultInput = { capability: 'scored-v4', result: scored };
            if (this.getRoomGeneration(trimmedRoomId) === startGen) {
              this.resultCache.set(cacheKey, input);
            }
            return { ok: true, data: input };
          }
        }
        if (!snap.ok) {
          const snapErr = (snap.error?.messageKey || '') as string;
          if (this.isPermissionOrTerminalRevocationError(snapErr)) {
            this.invalidateRoom(trimmedRoomId);
          }
          return { ok: false, error: snap.error };
        }
      } catch (err: unknown) {
        return { ok: false, error: mapErrorHelper(err) };
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
