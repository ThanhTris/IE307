import type { NearbyState, NearbyStatus, ResultDish, ResultInput, ResultReadState, ScoredResult } from '../features/result/services/resultPresentation';
import { winnerFixture } from './resultFixtures';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const names = ['Phở bò tái nạm', 'Cơm tấm', 'Bún bò Huế'];
const dish = (index: number): ResultDish => ({ dishId: uuid(10 + index), roundDishId: uuid(20 + index), name: names[index]!, description: null, artwork: null, priceReference: null });
export const resultCaseOptions = [
  { id: 'top3', label: 'Top 3 món' }, { id: 'one', label: 'Còn 1 món' }, { id: 'two', label: 'Còn 2 món' },
  { id: 'tie-two', label: 'Hai món đồng hạng' }, { id: 'tie-first', label: 'Đồng hạng đầu' }, { id: 'tie-last', label: 'Đồng hạng cuối' }, { id: 'tie-all', label: 'Tất cả đồng hạng' },
  { id: 'missing', label: 'Thiếu ảnh và giá' }, { id: 'legacy', label: 'Kết quả cũ không điểm' }, { id: 'invalid', label: 'Kết quả không hợp lệ' },
  { id: 'finalizing', label: 'Đang chốt kết quả' }, { id: 'loading', label: 'Đang tải kết quả' }, { id: 'error', label: 'Lỗi tải kết quả' }, { id: 'unknown', label: 'Chưa xác nhận kết quả' },
  { id: 'empty-r1', label: 'Không còn món sau vòng 1' }, { id: 'removed-r2', label: 'Loại hết sau vòng 2' },
] as const;
export type ResultCase = typeof resultCaseOptions[number]['id'];
export function scoredResultFixture(id: ResultCase = 'top3'): ScoredResult {
  const scores = id === 'one' ? [4] : id === 'two' ? [5, 4] : id === 'tie-two' ? [4, 4] : id === 'tie-first' ? [5, 5, 4] : id === 'tie-last' ? [5, 4, 4] : id === 'tie-all' ? [5, 5, 5] : [6, 5, 4];
  const noConsensus = id === 'empty-r1' || id === 'removed-r2';
  // Synthetic expected projections, not application vote evaluation.
  const ranks = scores.map((score, index) => new Set(scores.slice(0, index + 1)).size);
  return { resultId: uuid(1), contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement', policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1', status: noConsensus ? 'NO_CONSENSUS' : 'DECIDED', round: id === 'removed-r2' ? 2 : 1,
    winner: noConsensus ? null : dish(0), reasonCode: id === 'empty-r1' ? 'EMPTY_INTERSECTION' : id === 'removed-r2' ? 'ALL_REMOVED' : 'UNANIMOUS_WANT', finalizedAt: '2026-11-03T05:00:00Z', scoreVersion: noConsensus ? null : 'want2-ok1-round1-v1', rankingVersion: noConsensus ? null : 'score-desc-dense-rank-v1', round1BallotCount: 3,
    topDishes: noConsensus ? [] : scores.map((score, index) => ({ dish: dish(index), score: id === 'invalid' ? 99 : score, rank: ranks[index]!, isWinner: index === 0 })) };
}
export function dishResultFixture(id: ResultCase): { input: ResultInput; readState: ResultReadState } {
  return { input: id === 'legacy' ? { capability: 'legacy-unscored-v1', result: winnerFixture() } : { capability: 'scored-v4', result: scoredResultFixture(id) }, readState: id === 'finalizing' || id === 'loading' || id === 'error' || id === 'unknown' ? id : 'ready' };
}
export const nearbyCaseOptions: { id: NearbyStatus; label: string }[] = [
  { id: 'ready', label: 'Có quán mẫu' }, { id: 'loading', label: 'Đang tìm quán' }, { id: 'empty', label: 'Không có quán' }, { id: 'error', label: 'Lỗi tải quán' },
  { id: 'permission', label: 'Cần bật vị trí' }, { id: 'denied', label: 'Từ chối vị trí' }, { id: 'blocked', label: 'Quyền bị chặn' }, { id: 'location-off', label: 'Dịch vụ vị trí tắt' }, { id: 'offline', label: 'Ngoại tuyến' }, { id: 'unsupported', label: 'Thiếu capability bản đồ' },
];
export function nearbyFixture(result: ScoredResult, status: NearbyStatus = 'permission'): NearbyState {
  return { resultId: result.resultId, winnerDishId: result.winner?.dishId ?? '', status, fetchedAt: status === 'ready' || status === 'empty' ? '2026-11-03T05:01:00Z' : null,
    places: status === 'ready' ? [{ id: 'ui-place', name: 'Quán phở A · mẫu', address: 'Quận 3 · TP.HCM · địa chỉ minh họa', distanceM: 600, latitude: null, longitude: null, attribution: 'Mô phỏng, không phải dữ liệu Google Places' }] : [] };
}
