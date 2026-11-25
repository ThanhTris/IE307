import type { ApiError, ErrorCode } from '../../data/api/contracts';

/** The one thing the person should do next. `none`: fix the input or wait for the screen to change. */
export type ErrorAction = 'retry' | 'reload' | 'signIn' | 'home' | 'none';

export type ErrorDescription = {
  code: ErrorCode;
  title: string;
  message: string;
  action: ErrorAction;
  /** Offer "Báo lỗi": only for failures the person cannot fix themselves. */
  reportable: boolean;
};

type Entry = readonly [title: string, message: string, action: ErrorAction, reportable?: boolean];

const CHANGED: Entry = ['Dữ liệu vừa thay đổi', 'Tải lại để xem bản mới rồi thử lại.', 'reload'];
const INPUT: Entry = ['Thông tin chưa hợp lệ', 'Kiểm tra lại thông tin vừa nhập.', 'none'];

/** Every error code has plain Vietnamese copy and a next step. A new code fails to compile until it is added. */
const ENTRIES: Record<ErrorCode, Entry> = {
  NETWORK_ERROR: ['Không kết nối được máy chủ', 'Kiểm tra mạng rồi thử lại. Nếu mạng vẫn ổn, có thể máy chủ đang gặp sự cố.', 'retry', true],
  TIMEOUT: ['Máy chủ phản hồi quá lâu', 'Chờ vài giây rồi thử lại.', 'retry', true],
  MALFORMED_RESPONSE: ['Máy chủ trả về dữ liệu lỗi', 'Thử lại. Nếu vẫn lỗi, hãy báo lỗi để chúng tôi sửa.', 'retry', true],
  UNKNOWN_ERROR: ['Có lỗi xảy ra', 'Thử lại. Nếu vẫn lỗi, hãy báo lỗi để chúng tôi sửa.', 'retry', true],
  CONTRACT_MISMATCH: ['Bản app này không còn khớp máy chủ', 'Cập nhật app lên bản mới nhất.', 'home', true],
  RATE_LIMITED: ['Bạn thao tác hơi nhanh', 'Chờ một lát rồi thử lại.', 'retry'],
  AUTH_REQUIRED: ['Phiên đăng nhập đã hết hạn', 'Đăng nhập lại để tiếp tục.', 'signIn'],
  VERSION_CONFLICT: CHANGED,
  CONTEXT_CHANGED: CHANGED,
  INVALID_ROOM_STATE: CHANGED,
  REQUEST_ID_REUSED: CHANGED,
  NOT_READY: ['Dữ liệu chưa sẵn sàng', 'Chờ vài giây rồi thử lại.', 'retry'],
  NOT_HOST: ['Chỉ chủ phòng làm được việc này', 'Nhờ chủ phòng thực hiện.', 'reload'],
  NOT_MEMBER: ['Bạn không còn trong phòng này', 'Về trang chủ để vào lại bằng mã mời.', 'home'],
  ROOM_NOT_FOUND: ['Không tìm thấy phòng', 'Kiểm tra lại mã mời hoặc xin mã mới.', 'home'],
  ROOM_EXPIRED: ['Phòng đã hết hạn', 'Về trang chủ để tạo hoặc vào phòng khác.', 'home'],
  ROOM_TERMINAL: ['Phòng đã kết thúc', 'Về trang chủ để tạo hoặc vào phòng khác.', 'home'],
  ROOM_FULL: ['Phòng đã đủ người', 'Nhờ chủ phòng kiểm tra hoặc vào phòng khác.', 'home'],
  ROOM_LOCKED: ['Phòng đã bắt đầu', 'Không thể vào thêm lúc này.', 'home'],
  NOT_ENOUGH_MEMBERS: ['Chưa đủ người', 'Mời thêm bạn bè rồi thử lại.', 'none'],
  MEMBERS_NOT_READY: ['Còn người chưa sẵn sàng', 'Chờ mọi người chọn xong khẩu vị.', 'none'],
  ALREADY_SUBMITTED: ['Bạn đã gửi phiếu rồi', 'Chờ những người khác hoàn tất.', 'reload'],
  INCOMPLETE_BALLOT: ['Phiếu chưa đủ', 'Chọn cho tất cả các món trước khi gửi.', 'none'],
  REMOVE_LIMIT: ['Bỏ quá số món cho phép', 'Bỏ bớt lựa chọn rồi gửi lại.', 'none'],
  INSUFFICIENT_DISHES: ['Không đủ món', 'Nới bộ lọc hoặc giảm số món.', 'none'],
  NO_ELIGIBLE_FOOD: ['Chưa có món phù hợp', 'Đổi bộ lọc rồi thử lại.', 'none'],
  INVALID_DISH: ['Món không còn dùng được', 'Tải lại danh sách món.', 'reload'],
  OUT_OF_COVERAGE: ['Khu vực này chưa có dữ liệu', 'Chọn khu vực khác.', 'none'],
  AVAILABILITY_UNKNOWN: ['Chưa rõ món còn bán không', 'Chọn món khác.', 'none'],
  DESIRED_TIME_PASSED: ['Giờ ăn đã qua', 'Chọn lại giờ ăn.', 'none'],
  UNSUPPORTED_FIELD: INPUT,
  INVALID_INPUT: INPUT,
  NOT_PARTNER: ['Hai bạn chưa là bạn bè', 'Kết bạn trước rồi thử lại.', 'reload'],
  NOT_RECIPIENT: ['Lời mời không dành cho bạn', 'Tải lại danh sách lời mời.', 'reload'],
  CONSENT_REQUIRED: ['Cần bạn đồng ý trước', 'Bật tùy chọn trong Cài đặt rồi thử lại.', 'none'],
  INVITE_EXPIRED: ['Lời mời đã hết hạn', 'Xin lời mời mới.', 'reload'],
  INVITE_REJECTED: ['Lời mời đã bị từ chối', 'Tải lại danh sách lời mời.', 'reload'],
  INVITE_CANCELLED: ['Lời mời đã bị hủy', 'Tải lại danh sách lời mời.', 'reload'],
};

export function describeError(error: Pick<ApiError, 'messageKey'> | null | undefined): ErrorDescription {
  const code: ErrorCode = error && Object.prototype.hasOwnProperty.call(ENTRIES, error.messageKey) ? error.messageKey : 'UNKNOWN_ERROR';
  const [title, message, action, reportable = false] = ENTRIES[code];
  return { code, title, message, action, reportable };
}

/** Show inline/banner help pill only for structural bugs or after >= 2 consecutive reportable failures. */
export function shouldOfferHelp(code: ErrorCode, failureCount = 1): boolean {
  if (code === 'MALFORMED_RESPONSE' || code === 'CONTRACT_MISMATCH') return true;
  return describeError({ messageKey: code }).reportable && failureCount >= 2;
}

const CONNECTION_STEPS = [
  'Kiểm tra Wi-Fi hoặc dữ liệu di động đang bật.',
  'Mở thử một trang web để chắc điện thoại có mạng.',
  'Đợi khoảng một phút rồi thử lại, có thể máy chủ đang bận.',
];
const APP_STEPS = [
  'Thử lại thao tác vừa làm.',
  'Tắt hẳn app rồi mở lại.',
  'Cập nhật app lên bản mới nhất nếu có.',
];

/** Things the person can try before reporting, shown in "Trợ giúp & báo lỗi". */
export function helpSteps(code: ErrorCode): string[] {
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') return CONNECTION_STEPS;
  if (code === 'AUTH_REQUIRED') return ['Đăng nhập lại.', 'Kiểm tra ngày giờ trên điện thoại đang đặt tự động.'];
  return APP_STEPS;
}

export const ERROR_CODES = Object.keys(ENTRIES) as ErrorCode[];

export const ACTION_LABEL: Record<Exclude<ErrorAction, 'none'>, string> = {
  retry: 'Thử lại',
  reload: 'Tải lại',
  signIn: 'Đăng nhập lại',
  home: 'Về trang chủ',
};
