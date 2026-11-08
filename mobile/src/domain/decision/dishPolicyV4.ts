/** GM15.3 / ADR-019–020. Pure private tally over server-accepted full ballots. */
import { classifyTier, scoreVotes, selectWinner, type MatchTier } from './index';

export const DISH_POLICY_V4 = 'dish-decision-v4/ADR-019-30PCT-MIN1' as const;
export const DISH_EVALUATOR_V4 = '1.0.0' as const;
export const DISH_SCORE_V4 = 'want2-ok1-round1-v1' as const;
export const DISH_RANKING_V4 = 'score-desc-dense-rank-v1' as const;

type Ballots<V extends string> = Readonly<Record<string, Readonly<Record<string, V>>>>;
export interface DishDecisionV4Input {
  readonly policyVersion: typeof DISH_POLICY_V4;
  readonly roster: readonly string[];
  /** Initial locked pool. Round two is derived from acknowledged round-one NOs. */
  readonly pool: readonly string[];
  readonly round: 1 | 2;
  readonly round1: Ballots<'WANT' | 'OK' | 'NO'>;
  readonly round2: Ballots<'KEEP' | 'REMOVE'>;
  /** Server-provided private seed, never client entropy. */
  readonly seed: string;
}
export interface DishPodiumV4 {
  readonly dishId: string;
  readonly score: number;
  readonly rank: number;
  readonly isWinner: boolean;
}
interface BaseDecision {
  readonly policyVersion: typeof DISH_POLICY_V4;
  readonly evaluatorVersion: typeof DISH_EVALUATOR_V4;
  readonly round1BallotCount: number;
  /** Private IDs, not an API pool/result DTO or a list of individual votes. */
  readonly eligibleIds: readonly string[];
  readonly candidateIds: readonly string[];
  readonly removalCap: number | null;
}
interface PendingDecision extends BaseDecision {
  readonly status: 'WAITING' | 'ROUND_2';
  readonly winnerId: null;
  readonly reasonCode: null;
  readonly matchTier: null;
  readonly scoreVersion: null;
  readonly rankingVersion: null;
  readonly topDishes: readonly [];
}
interface NoConsensusDecision extends BaseDecision {
  readonly status: 'NO_CONSENSUS';
  readonly winnerId: null;
  readonly reasonCode: 'EMPTY_INTERSECTION' | 'ALL_REMOVED';
  readonly matchTier: 'NO_CONSENSUS';
  readonly scoreVersion: null;
  readonly rankingVersion: null;
  readonly topDishes: readonly [];
}
interface SelectedDecision extends BaseDecision {
  readonly status: 'DECIDED';
  readonly winnerId: string;
  readonly reasonCode: 'UNANIMOUS_WANT' | 'ACCEPTABLE_FINAL';
  readonly matchTier: Exclude<MatchTier, 'NO_CONSENSUS'>;
  readonly scoreVersion: typeof DISH_SCORE_V4;
  readonly rankingVersion: typeof DISH_RANKING_V4;
  readonly topDishes: readonly DishPodiumV4[];
}
export type DishDecisionV4 = PendingDecision | NoConsensusDecision | SelectedDecision;
type RecordValue = Record<string, unknown>;

function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    && Reflect.ownKeys(value).every(key => typeof key === 'string'
      && Object.getOwnPropertyDescriptor(value, key)?.enumerable === true
      && Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, 'value'));
}
function ids(value: unknown, min: number, max: number): value is string[] {
  return Array.isArray(value) && value.length >= min && value.length <= max
    && Array.from(value).every(id => typeof id === 'string' && id.trim().length > 0)
    && new Set(value).size === value.length;
}
export function removalCapV4(count: number): number {
  if (!Number.isInteger(count) || count < 0 || count > 20) throw new RangeError('Invalid pool size');
  return count === 0 ? 0 : Math.max(1, Math.floor(0.30 * count));
}
function ballots(value: unknown, roster: readonly string[], pool: readonly string[], allowed: readonly string[], cap?: number): RecordValue {
  if (!record(value)) throw new RangeError('Invalid accepted ballot map');
  for (const member of Object.keys(value)) {
    const ballot = value[member];
    if (!roster.includes(member) || !record(ballot)
      || Object.keys(ballot).length !== pool.length
      || pool.some(id => !Object.hasOwn(ballot, id) || typeof ballot[id] !== 'string' || !allowed.includes(ballot[id] as string))
      || Object.keys(ballot).some(id => !pool.includes(id))
      || (cap !== undefined && Object.values(ballot).filter(v => v === 'REMOVE').length > cap)) {
      throw new RangeError('Invalid accepted complete ballot');
    }
  }
  return value;
}

/**
 * Invalid input throws RangeError without reflecting votes. No request/ACK, clock,
 * host quorum, persist/retry or public projection is implemented here. GM20 calls
 * this only after its transaction authorizes ALL/HOST/TIMEOUT evaluation.
 */
export function decideDishSessionV4(value: unknown): DishDecisionV4 {
  const keys = ['policyVersion', 'roster', 'pool', 'round', 'round1', 'round2', 'seed'];
  if (!record(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))
    || value.policyVersion !== DISH_POLICY_V4 || !ids(value.roster, 2, 20) || !ids(value.pool, 10, 20)
    || (value.round !== 1 && value.round !== 2) || typeof value.seed !== 'string' || !/^[0-9a-f]{8}$/.test(value.seed)) {
    throw new RangeError('Invalid locked v4 snapshot');
  }
  const roster = value.roster;
  const pool = [...value.pool].sort();
  const r1 = ballots(value.round1, roster, pool, ['WANT', 'OK', 'NO']);
  const participants = Object.keys(r1);
  const vote = (map: RecordValue, member: string, dish: string) => (map[member] as RecordValue)[dish];
  const eligible = pool.filter(d => participants.every(u => vote(r1, u, d) !== 'NO'));
  const unanimous = eligible.filter(d => participants.every(u => vote(r1, u, d) === 'WANT'));
  const cap = value.round === 2 ? removalCapV4(eligible.length) : null;
  // Round-two input is never silently ignored, including impossible transitions.
  if (value.round === 2 && (!participants.length || !eligible.length || unanimous.length > 0)) {
    throw new RangeError('Invalid round-two transition');
  }
  const r2 = ballots(value.round2, roster, value.round === 2 ? eligible : [], ['KEEP', 'REMOVE'], cap ?? undefined);
  if (value.round === 1 && Object.keys(r2).length) throw new RangeError('Premature round-two ballot');
  const base = { policyVersion: DISH_POLICY_V4, evaluatorVersion: DISH_EVALUATOR_V4,
    round1BallotCount: participants.length, removalCap: cap };
  const pending = (status: 'WAITING' | 'ROUND_2', available: string[], candidates: string[] = []): PendingDecision =>
    ({ ...base, status, eligibleIds: available, candidateIds: candidates, winnerId: null,
      reasonCode: null, matchTier: null, scoreVersion: null, rankingVersion: null, topDishes: [] });
  const none = (reasonCode: NoConsensusDecision['reasonCode']): NoConsensusDecision =>
    ({ ...base, status: 'NO_CONSENSUS', eligibleIds: [], candidateIds: [], winnerId: null,
      reasonCode, matchTier: 'NO_CONSENSUS', scoreVersion: null, rankingVersion: null, topDishes: [] });
  if (!participants.length) return pending('WAITING', []);
  if (!eligible.length) return none('EMPTY_INTERSECTION');
  if (value.round === 1 && !unanimous.length) return pending('ROUND_2', eligible, eligible);
  const submitted2 = Object.keys(r2);
  if (value.round === 2 && !submitted2.length) return pending('WAITING', eligible);
  const survivors = value.round === 1 ? eligible : eligible.filter(d => submitted2.every(u => vote(r2, u, d) !== 'REMOVE'));
  if (!survivors.length) return none('ALL_REMOVED');
  const wants = (dish: string) => participants.filter(u => vote(r1, u, dish) === 'WANT').length;
  const score = (dish: string) => scoreVotes(wants(dish), participants.filter(u => vote(r1, u, dish) === 'OK').length);
  const scored = survivors.map(dishId => ({ dishId, score: score(dishId) }))
    .sort((a, b) => b.score - a.score || (a.dishId < b.dishId ? -1 : a.dishId > b.dishId ? 1 : 0));
  const candidateIds = scored.filter(d => d.score === scored[0]!.score).map(d => d.dishId);
  const winnerId = selectWinner(candidateIds, value.seed);
  const selected = scored.slice(0, 3);
  if (!selected.some(d => d.dishId === winnerId)) {
    selected[selected.length - 1] = scored.find(d => d.dishId === winnerId)!;
    selected.sort((a, b) => b.score - a.score || (a.dishId < b.dishId ? -1 : a.dishId > b.dishId ? 1 : 0));
  }
  let previous: number | undefined;
  let rank = 0;
  const topDishes = selected.map(d => {
    if (d.score !== previous) rank++;
    previous = d.score;
    return { ...d, rank, isWinner: d.dishId === winnerId };
  });
  return { ...base, status: 'DECIDED', eligibleIds: survivors, candidateIds, winnerId,
    reasonCode: value.round === 1 ? 'UNANIMOUS_WANT' : 'ACCEPTABLE_FINAL',
    matchTier: classifyTier(participants.length, wants(winnerId), true) as SelectedDecision['matchTier'],
    scoreVersion: DISH_SCORE_V4, rankingVersion: DISH_RANKING_V4, topDishes };
}
