import type { ApiClient, MealSlot, PoolDish, RoomContext } from '../../../data/api/contracts';

export type RoomSetupRepository = Pick<ApiClient, 'getDiscoveryContext' | 'getRoomSnapshot' | 'previewFoodPool' | 'updateContext' | 'updatePreferences'>;
export type AnchorSuggestion = { status: 'suggested'; anchorId: string } | { status: 'denied' | 'unavailable' | 'outside' };
export type SuggestAnchor = () => Promise<AnchorSuggestion>;
export type PreferenceOption = { id: string; label: string };
export type PreferenceCatalogue = { cuisines: readonly PreferenceOption[]; categories: readonly PreferenceOption[] };
export type RequestIdFactory = () => string;

export const mealLabels: Record<MealSlot, string> = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối', snack: 'Ăn nhẹ' };
export const temperatureLabels = { hot: 'Nóng', warm: 'Ấm', cold: 'Lạnh', ambient: 'Nhiệt độ phòng', unknown: 'Chưa rõ nhiệt độ' } as const;
export const originLabels = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam', unknown: 'Chưa rõ nguồn gốc', not_applicable: 'Không áp dụng vùng miền' } as const;

// Read only from event handlers; renders use the last fetched server timestamp.
export function currentServerTime(serverTime: string, loadedAt: number, now: number = Date.now()): number {
  return Date.parse(serverTime) + Math.max(0, now - loadedAt);
}

export function localTime(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ') : '';
}

export function parseLocalTime(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return undefined;
  const date = new Date(value.replace(' ', 'T') + ':00+07:00');
  if (!Number.isFinite(date.getTime())) return undefined;
  const iso = date.toISOString();
  return localTime(iso) === value ? iso : undefined;
}

export function shiftLocalDate(value: string, days: number): string | undefined {
  const iso = parseLocalTime(`${value} 00:00`);
  if (!iso || !Number.isInteger(days)) return undefined;
  const target = new Date(Date.parse(iso) + days * 86400000 + 7 * 3600000);
  if (!Number.isFinite(target.getTime())) return undefined;
  const shifted = target.toISOString().slice(0, 10);
  return parseLocalTime(`${shifted} 00:00`) ? shifted : undefined;
}

export function mealDateLabel(value: string): string {
  if (!parseLocalTime(`${value} 00:00`)) return value || 'Chưa chọn ngày';
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export function suggestedMeal(iso: string): Pick<RoomContext, 'mealSlot' | 'timeHint'> {
  const hour = new Date(Date.parse(iso) + 7 * 3600000).getUTCHours();
  if (hour >= 5 && hour < 11) return { mealSlot: 'breakfast' };
  if (hour < 15 && hour >= 11) return { mealSlot: 'lunch' };
  if (hour < 18 && hour >= 15) return { mealSlot: 'snack' };
  return hour >= 22 || hour < 5 ? { mealSlot: 'dinner', timeHint: 'late_night' } : { mealSlot: 'dinner' };
}

// A meal chip suggests the next occurrence in UTC+7; snack leaves custom time alone.
// The caller supplies server time. This never runs as an eligibility fallback.
export function nextMealTime(meal: MealSlot, serverNow: number): string | undefined {
  if (meal === 'snack') return undefined;
  const hour = { breakfast: 7, lunch: 12, dinner: 19 }[meal];
  const local = new Date(serverNow + 7 * 3600000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  let next = midnight + (hour - 7) * 3600000;
  if (next <= serverNow) next += 24 * 3600000;
  return new Date(next).toISOString();
}

export function parseBudget(value: string): number | null | undefined {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim())) return undefined;
  const amount = Number(value.trim());
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : undefined;
}

export function dishPrice(dish: PoolDish): string {
  const price = dish.price ?? dish;
  const low = price.priceMin;
  const high = price.priceMax;
  if ((low == null && high == null) || !price.currency) return 'Chưa có giá';
  const number = (v: number) => new Intl.NumberFormat('vi-VN').format(v);
  const range = low != null && high != null ? low === high ? number(low) : `${number(low)}–${number(high)}` : low != null ? `Từ ${number(low)}` : `Đến ${number(high!)}`;
  const units = { person: 'người', portion: 'suất', item: 'món', group: 'nhóm', kg: 'kg', menu_item_unspecified: 'giá menu, chưa rõ khẩu phần' };
  return `${range} ${price.currency === 'VND' ? 'đ' : price.currency}${price.unit ? ` / ${units[price.unit]}` : ' · chưa rõ đơn vị'}`;
}

export function dishDistance(distanceM?: number | null): string {
  if (typeof distanceM !== 'number' || !Number.isFinite(distanceM) || distanceM < 0) return 'Chưa có khoảng cách đường chim bay từ điểm ăn chung';
  const km = distanceM >= 1000;
  const value = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(km ? distanceM / 1000 : distanceM);
  return `${value} ${km ? 'km' : 'm'} đường chim bay từ điểm ăn chung`;
}

export function setupError(code: string): string {
  switch (code) {
    case 'OUT_OF_COVERAGE': return 'Khu vực này chưa có dữ liệu. Hãy chọn một điểm công cộng trong vùng hỗ trợ.';
    case 'NO_ELIGIBLE_FOOD': return 'Chưa có món phù hợp với buổi và giờ này. Hãy sửa bối cảnh; không tự mở rộng giờ hay khu vực.';
    case 'AVAILABILITY_UNKNOWN': return 'Chưa đủ dữ liệu để xác nhận giờ bán. Hãy sửa bối cảnh hoặc thử lại sau.';
    case 'VERSION_CONFLICT': case 'CONTEXT_CHANGED': return 'Bối cảnh đã thay đổi. Tải lại và xác nhận trước khi lưu.';
    case 'DESIRED_TIME_PASSED': return 'Giờ ăn đã qua. Hãy chọn và xác nhận giờ mới.';
    case 'NOT_HOST': return 'Chỉ chủ phòng được sửa bối cảnh chung.';
    case 'NOT_MEMBER': case 'AUTH_REQUIRED': return 'Phiên tham gia không còn hợp lệ. Hãy quay lại và mở lại phòng.';
    case 'ROOM_EXPIRED': case 'ROOM_TERMINAL': case 'ROOM_LOCKED': case 'INVALID_ROOM_STATE': return 'Phòng không còn cho phép thay đổi. Hãy quay lại để kiểm tra trạng thái.';
    case 'TIMEOUT': case 'NETWORK_ERROR': return 'Chưa biết yêu cầu đã được nhận hay chưa. Thử lại cùng yêu cầu để kiểm tra.';
    default: return 'Chưa tải hoặc lưu được dữ liệu. Hãy thử tải lại.';
  }
}
