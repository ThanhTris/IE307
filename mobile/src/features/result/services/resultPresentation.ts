import type { RoomResult } from '../../../data/api/contracts';

/** Allowlisted presentation input. GM-27 owns decoding/mapping the received wire contract. */
export type ResultDish = {
  dishId: string; roundDishId: string; name: string; description: string | null;
  artwork: { uri: string; altText: string; attribution: string | null } | null;
  priceReference: { amount: number; currency: string; unit: string; servingSize: string | null; sourceRef: string; checkedAt: string } | null;
};
export type RankedDish = { dish: ResultDish; score: number; rank: number; isWinner: boolean };
export type ScoredResult = {
  resultId: string;
  contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B' | 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
  policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1';
  status: 'DECIDED' | 'NO_CONSENSUS'; round: 1 | 2; winner: ResultDish | null;
  reasonCode: 'UNANIMOUS_WANT' | 'ACCEPTABLE_FINAL' | 'EMPTY_INTERSECTION' | 'ALL_REMOVED';
  finalizedAt: string; scoreVersion: 'want2-ok1-round1-v1' | null;
  rankingVersion: 'score-desc-dense-rank-v1' | null;
  topDishes: readonly RankedDish[]; round1BallotCount?: number;
};
export type ResultInput = { capability: 'scored-v4'; result: ScoredResult } | { capability: 'legacy-unscored-v1'; result: RoomResult };
export type ResultReadState = 'ready' | 'loading' | 'finalizing' | 'error' | 'unknown';
export type ResultCompanion = { id: string; label: string };
export type NearbyPlace = { id: string; name: string; address: string | null; distanceM: number | null; latitude: number | null; longitude: number | null; attribution: string | null };
export type NearbyStatus = 'permission' | 'denied' | 'blocked' | 'location-off' | 'loading' | 'ready' | 'empty' | 'error' | 'offline' | 'unsupported';
export type NearbyState = { resultId: string; winnerDishId: string; status: NearbyStatus; places: readonly NearbyPlace[]; fetchedAt: string | null; cached?: boolean };
export type ResultExternalAction = 'maps' | 'tiktok' | 'youtube';
export type ResultActionTarget = { resultId: string; dishId: string; dishName: string; place?: NearbyPlace };
export type ResultActionReply = { ok: boolean };
export type ResultPresentationActions = {
  onHome: () => void; onNewSession: () => void; onRetryResult: () => void;
  onRetryPlaces?: () => void | Promise<void>; onRequestLocation?: () => void | Promise<void>; onOpenSettings?: () => void | Promise<void>;
  onExternalAction?: (action: ResultExternalAction, target: ResultActionTarget) => ResultActionReply | Promise<ResultActionReply>;
};
const versions = ['dish-session-v4/roadmap-v2/GM-07.B', 'dish-session-v4/roadmap-v2/GM-07.B-supplement'];
const validDish = (dish: ResultDish | null | undefined): dish is ResultDish => !!dish && typeof dish.dishId === 'string' && !!dish.dishId.trim() && typeof dish.roundDishId === 'string' && !!dish.roundDishId.trim() && typeof dish.name === 'string' && !!dish.name.trim();
/** Compare the complete locked projection, including fields not displayed by this UI. */
function equalProjection(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  const keys = Object.keys(x).sort();
  return keys.length === Object.keys(y).length && keys.every(key => Object.hasOwn(y, key) && equalProjection(x[key], y[key]));
}
export function validScoredResult(value: ScoredResult | null): value is ScoredResult {
  if (!value || !value.resultId?.trim() || !versions.includes(value.contractVersion) || value.policyVersion !== 'dish-decision-v4/ADR-019-30PCT-MIN1' || ![1, 2].includes(value.round) || !Number.isFinite(Date.parse(value.finalizedAt)) || !Array.isArray(value.topDishes)) return false;
  const count = value.round1BallotCount;
  if (count !== undefined && (!Number.isInteger(count) || count < 0 || count > 20)) return false;
  if (value.contractVersion.endsWith('-supplement') && count === undefined) return false;
  if (value.status === 'NO_CONSENSUS') return value.winner === null && value.topDishes.length === 0 && value.scoreVersion === null && value.rankingVersion === null && value.reasonCode === (value.round === 1 ? 'EMPTY_INTERSECTION' : 'ALL_REMOVED');
  if (value.status !== 'DECIDED' || !validDish(value.winner) || value.scoreVersion !== 'want2-ok1-round1-v1' || value.rankingVersion !== 'score-desc-dense-rank-v1' || value.reasonCode !== (value.round === 1 ? 'UNANIMOUS_WANT' : 'ACCEPTABLE_FINAL') || (count !== undefined && count < 1) || value.topDishes.length < 1 || value.topDishes.length > 3) return false;
  let rank = 0, previous: number | undefined;
  const ids = new Set<string>(), roundIds = new Set<string>();
  for (const entry of value.topDishes) {
    if (!entry || !validDish(entry.dish) || !Number.isInteger(entry.score) || entry.score < 0 || entry.score > 2 * (count ?? 20) || typeof entry.isWinner !== 'boolean' || ids.has(entry.dish.dishId) || roundIds.has(entry.dish.roundDishId)) return false;
    if (previous !== undefined && entry.score > previous) return false;
    if (entry.score !== previous) rank++;
    if (entry.rank !== rank) return false;
    previous = entry.score; ids.add(entry.dish.dishId); roundIds.add(entry.dish.roundDishId);
  }
  const winners = value.topDishes.filter(entry => entry.isWinner);
  return winners.length === 1 && winners[0]!.rank === 1 && equalProjection(winners[0]!.dish, value.winner);
}
/**
 * Podium order: score first, then the server's own order for equal scores, with the winner leading its group.
 * Every dish gets its own place (1, 2, 3), so equal scores never share a pedestal.
 */
export function podiumOrder<T extends { score: number; isWinner: boolean }>(entries: readonly T[]): T[] {
  return entries.map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.score - a.entry.score || Number(b.entry.isWinner) - Number(a.entry.isWinner) || a.index - b.index)
    .map(item => item.entry);
}
export function resultPrice(dish: ResultDish) {
  const p = dish.priceReference;
  if (!p || !Number.isFinite(p.amount) || p.amount < 0 || !p.currency?.trim() || !p.unit?.trim() || !p.sourceRef?.trim() || !Number.isFinite(Date.parse(p.checkedAt))) return null;
  const units: Record<string, string> = { portion: 'phần', item: 'món', person: 'người', group: 'phần nhóm', kg: 'kg', menu_item_unspecified: 'đơn vị chưa rõ' };
  return `${p.amount.toLocaleString('vi-VN')} ${p.currency} / ${units[p.unit] ?? p.unit} · ${p.sourceRef}`;
}
export const nearbyMatches = (state: NearbyState, result: ScoredResult) => state.resultId === result.resultId && state.winnerDishId === result.winner?.dishId;
