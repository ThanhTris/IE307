import type { ApiError } from '../../../data/api/contracts';
import { validNewPassword } from '../../../data/auth/validation';

export function newPasswordError(value: string): string | undefined {
  if ([...value].length < 8) return 'Mật khẩu cần ít nhất 8 ký tự';
  if (!validNewPassword(value)) return 'Mật khẩu quá dài.';
}

export function accountErrorMessage(error: ApiError): string {
  switch (error.details?.reason) {
    case 'email_exists':
    case 'user_already_exists': return 'Email này đã được dùng. Bạn có thể đăng nhập hoặc dùng email khác.';
    case 'email_not_confirmed': return 'Email chưa được xác minh. Hãy yêu cầu mã xác minh.';
    case 'otp_expired': return 'Mã sai hoặc đã hết hạn. Kiểm tra lại hoặc yêu cầu mã mới.';
    case 'email_provider_disabled':
    case 'signup_disabled': return 'Máy chủ chưa bật tính năng tài khoản qua email.';
    case 'invalid_credentials': return 'Email hoặc mật khẩu chưa đúng.';
    case 'current_password_invalid': return 'Mật khẩu hiện tại chưa đúng.';
    case 'weak_password': return 'Mật khẩu chưa đáp ứng yêu cầu của máy chủ.';
    case 'same_password': return 'Hãy chọn mật khẩu khác với mật khẩu hiện tại.';
    case 'reauthentication_needed': return 'Hãy đăng nhập lại trước khi đổi mật khẩu.';
  }
  switch (error.messageKey) {
    case 'RATE_LIMITED': return 'Bạn thử quá nhiều lần. Hãy chờ một lát rồi thử lại.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT': return 'Chưa nhận được phản hồi. Kiểm tra kết nối rồi thử lại.';
    case 'AUTH_REQUIRED': return 'Phiên hoặc mã xác minh đã hết hạn. Hãy bắt đầu lại.';
    case 'VERSION_CONFLICT': return 'Thông tin tài khoản đã thay đổi. Hãy quay lại và mở lại thao tác.';
    case 'INVALID_INPUT': return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.';
    case 'MALFORMED_RESPONSE': return 'Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.';
    default: return 'Chưa thể hoàn tất. Vui lòng thử lại.';
  }
}
