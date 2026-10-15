import type { ApiClient, ErrorCode, RoomContext } from '../../../data/api/contracts';

// Same DTOs as GM-07; GM-25 injects the real client without rewriting screens.
export type RoomEntryRepository = Pick<ApiClient, 'restoreSession' | 'listFriends' | 'getDiscoveryContext' | 'createRoom' | 'joinRoom' | 'getRoomSnapshot'>;
export type RoomEntryReceipt = { roomId: string; code: string; version: number; role: 'host' | 'member' };
export type CameraAction = () => Promise<{ status: 'unavailable' | 'denied' } | { status: 'scanned'; code: string }>;
export type RequestIdFactory = () => string;

export const normalizeRoomCode = (value: string) => value.trim().toUpperCase();
// ROOM_SPEC + GM-07 mock alphabet; keep the server as validation authority.
export const validRoomCode = (value: string) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(normalizeRoomCode(value));
export const validDisplayName = (value: string) => value.trim().length > 0 && Array.from(value.trim()).length <= 24;

export const mealLabels: Record<RoomContext['mealSlot'], string> = {
  breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối', snack: 'Ăn nhẹ',
};

export function suggestMeal(utc: string): Pick<RoomContext, 'mealSlot' | 'timeHint'> {
  const hour = new Date(Date.parse(utc) + 7 * 60 * 60 * 1000).getUTCHours();
  if (hour >= 5 && hour < 11) return { mealSlot: 'breakfast' };
  if (hour >= 11 && hour < 15) return { mealSlot: 'lunch' };
  if (hour >= 15 && hour < 18) return { mealSlot: 'snack' };
  return hour >= 18 && hour < 22 ? { mealSlot: 'dinner' } : { mealSlot: 'dinner', timeHint: 'late_night' };
}

export const errorCopy: Record<ErrorCode, string> = {
  AUTH_REQUIRED: 'Phiên đã mất. Hãy khôi phục phiên trước khi tiếp tục.',
  NOT_MEMBER: 'Bạn chưa là thành viên phòng này.', NOT_HOST: 'Chỉ chủ phòng được thực hiện thao tác này.',
  NOT_RECIPIENT: 'Lời mời này không dành cho bạn.',
  NOT_READY: 'Nhóm chưa sẵn sàng.', NOT_PARTNER: 'Chưa có quan hệ bạn ăn cùng.', CONSENT_REQUIRED: 'Cần xác nhận quyền lưu lịch sử.',
  INVALID_INPUT: 'Kiểm tra lại thông tin đã nhập.', INVALID_DISH: 'Món không còn hợp lệ.', INCOMPLETE_BALLOT: 'Lựa chọn chưa đầy đủ.',
  ROOM_NOT_FOUND: 'Không tìm thấy phòng. Kiểm tra lại mã với chủ phòng.',
  ROOM_FULL: 'Phòng đã đủ người. Hãy hỏi chủ phòng hoặc chọn phòng khác.',
  ROOM_LOCKED: 'Phòng đã bắt đầu, không nhận thêm thành viên.',
  ROOM_EXPIRED: 'Phòng đã hết hạn. Hãy nhờ chủ phòng tạo phòng mới.',
  ROOM_TERMINAL: 'Phòng đã kết thúc.', INVALID_ROOM_STATE: 'Trạng thái phòng đã thay đổi.',
  CONTEXT_CHANGED: 'Bối cảnh đã đổi. Hãy kiểm tra và xác nhận lại.',
  ALREADY_SUBMITTED: 'Lựa chọn đã được nhận.', VERSION_CONFLICT: 'Dữ liệu đã cũ. Hãy tải lại trước khi tiếp tục.',
  REQUEST_ID_REUSED: 'Yêu cầu không còn khớp. Hãy tải lại màn hình.',
  OUT_OF_COVERAGE: 'Điểm ăn nằm ngoài vùng có dữ liệu. Hãy chọn một điểm công cộng khác.',
  NO_ELIGIBLE_FOOD: 'Chưa có món phù hợp với bối cảnh. Hãy sửa điểm ăn hoặc giờ.',
  AVAILABILITY_UNKNOWN: 'Chưa rõ lịch phục vụ. Hãy kiểm tra lại bối cảnh.',
  DESIRED_TIME_PASSED: 'Giờ ăn đã qua. Hãy chọn giờ mới và xác nhận lại.',
  INVITE_EXPIRED: 'Lời mời đã hết hạn.', INVITE_REJECTED: 'Lời mời không còn hiệu lực.',
  INVITE_CANCELLED: 'Lời mời đã bị hủy.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.',
  NETWORK_ERROR: 'Không kết nối được. Thử lại cùng yêu cầu khi có mạng.',
  TIMEOUT: 'Chưa rõ yêu cầu đã được nhận. Thử lại cùng yêu cầu.',
  MALFORMED_RESPONSE: 'Phản hồi không hợp lệ. Vui lòng thử lại.', UNKNOWN_ERROR: 'Chưa thể thực hiện. Vui lòng thử lại.',
};

export function localTimeInput(utc: string): string {
  const date = new Date(Date.parse(utc) + 7 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export function parseLocalTime(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value.replace(' ', 'T') + ':00+07:00');
  if (!Number.isFinite(date.getTime()) || localTimeInput(date.toISOString()) !== value) return null;
  return date.toISOString();
}

let requestSequence = 0;
export function newPreviewRequestId() {
  // Mock-only composition. GM-25 owns durable request IDs/outbox integration.
  return `gm09_${Date.now()}_${++requestSequence}`;
}
