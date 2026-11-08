import type { DishPrice, PoolDish, RoomContext, RoomResult } from '../../data/api/contracts';

// Presentation metadata supplied by composition, not extra fields in the GM-07 wire DTO.
export type ResultOffering = {
  offeringId: string;
  dish: PoolDish;
  source: string | null;
  checkedAt: string | null;
  schedule: string | null;
  availability: 'scheduled' | 'unknown' | 'closed';
};
export type OfferingState = {
  status: 'ready' | 'loading' | 'error' | 'stale' | 'closed' | 'changed' | 'unknown';
  items: readonly ResultOffering[];
  fetchedAt: string | null;
};
export type ResultAction = 'maps' | 'review' | 'browser' | 'copy';
export type PublicOfferingTarget = {
  roomId: string;
  resultId: string;
  winnerRoundDishId: string;
  choiceId: string;
  dishId: string;
  offeringId: string;
  venueId: string;
  venueName: string;
  address: string;
  anchorId: string;
};
export type ResultNavigation = { onHome: () => void; onNewSession: () => void };
export type ExternalActionHandler = (action: ResultAction, target: PublicOfferingTarget) => Promise<{ ok: boolean }> | { ok: boolean };

export const tierCopy = {
  PERFECT: { label: 'Đồng thuận tuyệt đối', reason: 'Cả nhóm cùng muốn ăn món này.' },
  CONSENSUS: { label: 'Đồng thuận', reason: 'Đa số muốn ăn và mọi người đều giữ món này.' },
  COMPROMISE: { label: 'Phương án chung', reason: 'Phương án cả nhóm ăn được, ưu tiên theo mức muốn ăn.' },
} as const;
export function isWinnerResult(result: RoomResult | null): result is RoomResult & { winnerDish: PoolDish; winnerRoundDishId: string; matchTier: keyof typeof tierCopy } {
  return !!result && result.policyVersion === 'decision-v2' && !!result.winnerDish
    && !!result.winnerRoundDishId && result.winnerDish.roundDishId === result.winnerRoundDishId
    && ((result.matchTier === 'PERFECT' && result.reasonCode === 'UNANIMOUS_WANT' && result.round === 1)
      || ((result.matchTier === 'CONSENSUS' || result.matchTier === 'COMPROMISE') && result.reasonCode === 'ACCEPTABLE_FINAL' && result.round === 2));
}
export function noConsensusReason(result: RoomResult | null): string | null {
  if (!result || result.policyVersion !== 'decision-v2' || result.matchTier !== 'NO_CONSENSUS'
    || result.winnerDish !== null || result.winnerRoundDishId !== null) return null;
  if (result.reasonCode === 'EMPTY_INTERSECTION' && result.round === 1) return 'Chưa có phương án mọi người cùng chấp nhận ở vòng đầu.';
  if (result.reasonCode === 'ALL_REMOVED' && result.round === 2) return 'Sau vòng chọn lọc, chưa còn phương án mọi người cùng giữ.';
  return null;
}
export function belongsToWinner(offering: ResultOffering, result: RoomResult): boolean {
  return !!result.winnerDish && offering.dish.dishId === result.winnerDish.dishId
    && offering.dish.choiceId === result.winnerDish.choiceId
    && offering.dish.roundDishId === result.winnerRoundDishId;
}
export function publicTarget(offering: ResultOffering, result: RoomResult, context: RoomContext | null): PublicOfferingTarget | null {
  const d = offering.dish;
  if (!belongsToWinner(offering, result) || !offering.offeringId.trim() || !d.venueId?.trim()
    || !d.venueName?.trim() || !d.venueAddress?.trim() || !context?.anchorId.trim() || !result.winnerRoundDishId) return null;
  return { roomId: result.roomId, resultId: result.resultId, winnerRoundDishId: result.winnerRoundDishId,
    choiceId: d.choiceId, dishId: d.dishId, offeringId: offering.offeringId, venueId: d.venueId,
    venueName: d.venueName, address: d.venueAddress, anchorId: context.anchorId };
}
const units = { portion: 'phần', item: 'món', person: 'người', group: 'phần nhóm', kg: 'kg', menu_item_unspecified: 'đơn vị chưa rõ' } as const;
export function priceLabel(dish: PoolDish): string {
  const p: DishPrice = dish.price ?? { priceMin: dish.priceMin ?? null, priceMax: dish.priceMax ?? null,
    currency: dish.currency ?? null, unit: dish.unit ?? null, servingSize: dish.servingSize ?? null };
  const valid = (n: number | null) => n !== null && Number.isFinite(n) && n >= 0;
  if (!valid(p.priceMin) && !valid(p.priceMax)) return 'Chưa có giá';
  if (valid(p.priceMin) && valid(p.priceMax) && p.priceMin! > p.priceMax!) return 'Chưa có giá';
  const amount = (n: number) => n.toLocaleString('vi-VN');
  const range = valid(p.priceMin) && valid(p.priceMax)
    ? p.priceMin === p.priceMax ? amount(p.priceMin!) : `${amount(p.priceMin!)}–${amount(p.priceMax!)}`
    : valid(p.priceMin) ? `Từ ${amount(p.priceMin!)}` : `Đến ${amount(p.priceMax!)}`;
  return `${range} ${p.currency && p.currency !== 'other' ? p.currency : '(chưa rõ tiền tệ)'} / ${p.unit ? units[p.unit] : 'đơn vị chưa rõ'}${p.servingSize ? ` · ${p.servingSize}` : ''} · Giá tham khảo`;
}
export function distanceLabel(distanceM: number | undefined): string {
  if (distanceM === undefined || !Number.isFinite(distanceM) || distanceM < 0) return 'Chưa rõ khoảng cách';
  const value = distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
  return `${value} đường chim bay từ điểm ăn chung · không phải quãng đường đi`;
}
export function timeLabel(value: string | null): string {
  if (!value || Number.isNaN(Date.parse(value))) return 'Chưa rõ';
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }) + ' (UTC+7)';
}
