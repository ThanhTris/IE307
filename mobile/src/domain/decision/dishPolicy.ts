/** ADR-019. Versioned policy; legacy decision-v2 remains immutable. */
import { classifyTier, scoreVotes, selectWinner, type MatchTier } from './index';

export const DISH_POLICY = 'dish-decision-v3' as const;
export type DishVote = 'WANT' | 'OK' | 'NO' | 'KEEP' | 'REMOVE';
export type DishBallots = Readonly<Record<string, Readonly<Record<string, DishVote>>>>;
export interface DishDecisionInput {
  roster: readonly string[];
  pool: readonly string[];
  round: 1 | 2;
  round1: DishBallots;
  round2: DishBallots;
  seed: string;
}
export interface DishDecision {
  status: 'WAITING' | 'ROUND_2' | 'DECIDED' | 'NO_CONSENSUS';
  candidates: string[];
  winnerId: string | null;
  reason: 'UNANIMOUS_WANT' | 'ACCEPTABLE_FINAL' | 'EMPTY_INTERSECTION' | 'ALL_REMOVED' | null;
  tier: MatchTier | null;
}
export function removalCap(count: number): number {
  if (!Number.isInteger(count) || count < 0 || count > 20) throw new RangeError('Invalid pool size');
  return count === 0 ? 0 : Math.min(3, Math.floor((count - 1) / 2));
}
export function validDishCount(count: unknown): count is number {
  return typeof count === 'number' && Number.isInteger(count) && count >= 10 && count <= 20;
}
function validateBallots(ballots: DishBallots, roster: readonly string[], pool: readonly string[], values: readonly DishVote[], cap?: number) {
  if (!ballots || typeof ballots !== 'object' || Array.isArray(ballots)) throw new RangeError('Invalid ballots');
  for (const [user, ballot] of Object.entries(ballots)) {
    if (!roster.includes(user) || !ballot || typeof ballot !== 'object' || Array.isArray(ballot)
      || Object.keys(ballot).length !== pool.length || pool.some(dish => !Object.hasOwn(ballot, dish) || !values.includes(ballot[dish]!))
      || Object.keys(ballot).some(dish => !pool.includes(dish))
      || (cap !== undefined && Object.values(ballot).filter(v => v === 'REMOVE').length > cap)) throw new RangeError('Invalid ballot');
  }
}
/** Private evaluator: candidates/score never form the public RPC projection. */
export function decideDishSession(input: DishDecisionInput): DishDecision {
  const { roster, pool, round1, round2, round, seed } = input;
  if (!roster.length || roster.length > 20 || new Set(roster).size !== roster.length
    || !pool.length || pool.length > 20 || new Set(pool).size !== pool.length
    || [...roster, ...pool].some(id => typeof id !== 'string' || !id.trim())
    || !/^[0-9a-f]{8}$/.test(seed) || (round !== 1 && round !== 2)) throw new RangeError('Invalid snapshot');
  validateBallots(round1, roster, pool, ['WANT', 'OK', 'NO']);
  const participants = Object.keys(round1);
  const result = (status: DishDecision['status'], candidates: string[] = [], reason: DishDecision['reason'] = null, tier: MatchTier | null = null): DishDecision =>
    ({ status, candidates, winnerId: status === 'DECIDED' ? selectWinner(candidates, seed) : null, reason, tier });
  if (!participants.length) return result('WAITING');
  const acceptable = pool.filter(d => participants.every(u => round1[u]![d] !== 'NO'));
  const unanimous = acceptable.filter(d => participants.every(u => round1[u]![d] === 'WANT'));
  if (round === 1 && unanimous.length) return result('DECIDED', unanimous, 'UNANIMOUS_WANT', 'PERFECT');
  if (!acceptable.length) return result('NO_CONSENSUS', [], 'EMPTY_INTERSECTION', 'NO_CONSENSUS');
  if (round === 1 && acceptable.length > 1) return result('ROUND_2', acceptable);
  if (round === 2) validateBallots(round2, roster, acceptable, ['KEEP', 'REMOVE'], removalCap(acceptable.length));
  const submitted2 = Object.keys(round2);
  if (round === 2 && !submitted2.length) return result('WAITING');
  const survivors = round === 1 ? acceptable : acceptable.filter(d => submitted2.every(u => round2[u]![d] === 'KEEP'));
  if (!survivors.length) return result('NO_CONSENSUS', [], 'ALL_REMOVED', 'NO_CONSENSUS');
  const wants = (dish: string) => participants.filter(u => round1[u]![dish] === 'WANT').length;
  const score = (dish: string) => scoreVotes(wants(dish), participants.filter(u => round1[u]![dish] === 'OK').length);
  const best = Math.max(...survivors.map(score));
  const candidates = survivors.filter(d => score(d) === best);
  return result('DECIDED', candidates, 'ACCEPTABLE_FINAL', classifyTier(participants.length, wants(candidates[0]!), true));
}

