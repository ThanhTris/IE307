import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { AccountService } from '../../src/data/auth';
import type { ReadResult } from '../../src/data/api/contracts';
import { AccountAccessScreen } from '../../src/features/account/screens/AccountAccessScreen';
import { lightColors } from '../../src/shared/theme/tokens';

afterEach(() => jest.useRealTimers());

async function renderSignup() {
  const signUp = jest.fn<Promise<ReadResult<void>>, [Parameters<AccountService['signUp']>[0]]>()
    .mockResolvedValue({ ok: true, data: undefined });
  const sendCode = jest.fn(async () => ({ ok: true, data: undefined }));
  const verifyCode = jest.fn(async () => ({ ok: true, data: undefined }));
  const account = { signUp, sendCode, verifyCode } as unknown as AccountService;
  await render(<AccountAccessScreen flow="sign-up" account={account} isGuest={false}
    onBack={jest.fn()} onNavigate={jest.fn()} onComplete={jest.fn()} />);
  return { signUp, sendCode, verifyCode };
}

function expectFieldError(label: string, message: string) {
  const input = screen.getByLabelText(label);
  expect(input).toHaveProp('accessibilityHint', message);
  expect(input).toHaveStyle({ borderColor: lightColors.danger });
  expect(screen.getByText(message)).toHaveProp('accessibilityRole', 'alert');
}

test('signup marks every missing field and clears only the field being corrected', async () => {
  const { signUp } = await renderSignup();
  await fireEvent.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));

  expectFieldError('Tên hiển thị', 'Nhập tên hiển thị.');
  expectFieldError('Email', 'Nhập địa chỉ email.');
  expectFieldError('Mật khẩu', 'Nhập mật khẩu.');
  expectFieldError('Nhập lại mật khẩu', 'Nhập lại mật khẩu.');
  expect(signUp).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), 'Tuấn');
  expect(screen.getByLabelText('Tên hiển thị')).not.toHaveStyle({ borderColor: lightColors.danger });
  expectFieldError('Email', 'Nhập địa chỉ email.');
});

test('signup shows invalid email and mismatched password under their own fields', async () => {
  const { signUp } = await renderSignup();
  await fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), 'Tuấn');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'sai-email');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'Fixture!123');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu'), 'Fixture!124');
  await fireEvent.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));

  expectFieldError('Email', 'Nhập địa chỉ email hợp lệ.');
  expectFieldError('Nhập lại mật khẩu', 'Hai mật khẩu chưa khớp.');
  expect(screen.getByLabelText('Mật khẩu')).not.toHaveStyle({ borderColor: lightColors.danger });
  expect(signUp).not.toHaveBeenCalled();
});

test('email confirmation puts an incomplete code under the input and clears the resend notice after five seconds', async () => {
  jest.useFakeTimers();
  const { signUp, sendCode, verifyCode } = await renderSignup();
  await fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), 'Tuấn');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'tuan@example.test');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'Fixture!123');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu'), 'Fixture!123');
  await fireEvent.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));

  expect(signUp).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Nhập mã 6 chữ số trong email gửi tới tuan@example.test.')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Mã xác minh'), '12345');
  await fireEvent.press(screen.getByRole('button', { name: 'Xác minh mã' }));
  expectFieldError('Mã xác minh', 'Nhập đủ 6 chữ số');
  expect(verifyCode).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: 'Gửi lại mã' }));
  expect(sendCode).toHaveBeenCalledWith('tuan@example.test', 'signup');
  expect(screen.getByText('Kiểm tra hộp thư để lấy mã mới.')).toBeOnTheScreen();
  expect(screen.queryByText(/Nếu .* đủ điều kiện/)).toBeNull();
  expect(screen.queryByText('Nhập đủ 6 chữ số')).toBeNull();
  await act(async () => jest.advanceTimersByTime(4999));
  expect(screen.getByText('Kiểm tra hộp thư để lấy mã mới.')).toBeOnTheScreen();
  await act(async () => jest.advanceTimersByTime(1));
  expect(screen.queryByText('Kiểm tra hộp thư để lấy mã mới.')).toBeNull();
});

test('sign-in highlights missing and malformed credentials without calling Auth', async () => {
  const signIn = jest.fn();
  await render(<AccountAccessScreen flow="sign-in" account={{ signIn } as unknown as AccountService}
    isGuest={false} onBack={jest.fn()} onNavigate={jest.fn()} onComplete={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expectFieldError('Email', 'Nhập địa chỉ email.');
  expectFieldError('Mật khẩu', 'Nhập mật khẩu của bạn.');
  await fireEvent.changeText(screen.getByLabelText('Email'), 'sai-email');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expectFieldError('Email', 'Nhập địa chỉ email hợp lệ.');
  expect(signIn).not.toHaveBeenCalled();
});

test('linking highlights an invalid email without calling Auth', async () => {
  const linkEmail = jest.fn();
  await render(<AccountAccessScreen flow="link" account={{ linkEmail } as unknown as AccountService}
    isGuest onBack={jest.fn()} onNavigate={jest.fn()} onComplete={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'sai-email');
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã xác minh' }));
  expectFieldError('Email', 'Nhập địa chỉ email hợp lệ.');
  expect(linkEmail).not.toHaveBeenCalled();
});

test('sign-in puts the generic credential rejection beneath email', async () => {
  const signIn = jest.fn().mockResolvedValue({
    ok: false, error: { messageKey: 'AUTH_REQUIRED', details: { reason: 'invalid_credentials' } },
  });
  await render(<AccountAccessScreen flow="sign-in" account={{ signIn } as unknown as AccountService}
    isGuest={false} onBack={jest.fn()} onNavigate={jest.fn()} onComplete={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'other@example.test');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'Fixture!123');
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  expectFieldError('Email', 'Email hoặc mật khẩu chưa đúng.');
});

test('recovery highlights the new password and confirmation independently', async () => {
  const sendCode = jest.fn().mockResolvedValue({ ok: true, data: undefined });
  const verifyCode = jest.fn().mockResolvedValue({ ok: true, data: undefined });
  const setPassword = jest.fn();
  const account = { sendCode, verifyCode, setPassword, discardPasswordProof: jest.fn() } as unknown as AccountService;
  await render(<AccountAccessScreen flow="recovery" account={account}
    isGuest={false} onBack={jest.fn()} onNavigate={jest.fn()} onComplete={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'tuan@example.test');
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã xác minh' }));
  await fireEvent.changeText(screen.getByLabelText('Mã xác minh'), '123456');
  await fireEvent.press(screen.getByRole('button', { name: 'Xác minh mã' }));
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'short');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'different');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu' }));
  expectFieldError('Mật khẩu mới', 'Mật khẩu cần ít nhất 8 ký tự');
  expectFieldError('Nhập lại mật khẩu mới', 'Hai mật khẩu chưa khớp.');
  expect(setPassword).not.toHaveBeenCalled();
});

test('recovery from change password keeps a different email on the details screen', async () => {
  const sendCode = jest.fn();
  const sendAccountRecoveryCode = jest.fn()
    .mockResolvedValueOnce({ ok: false, error: { messageKey: 'INVALID_INPUT', details: { reason: 'recovery_email_mismatch' } } })
    .mockResolvedValueOnce({ ok: true, data: undefined });
  const account = { sendCode, sendAccountRecoveryCode } as unknown as AccountService;
  await render(<AccountAccessScreen flow="recovery" account={account} recoveryForCurrentAccount
    isGuest={false} onBack={jest.fn()} onNavigate={jest.fn()} onComplete={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'another@example.test');
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã xác minh' }));
  expectFieldError('Email', 'Nhập email của tài khoản đang đăng nhập.');
  expect(screen.queryByLabelText('Mã xác minh')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'tester@example.test');
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi mã xác minh' }));
  expect(screen.getByLabelText('Mã xác minh')).toBeOnTheScreen();
  expect(sendAccountRecoveryCode.mock.calls).toEqual([['another@example.test'], ['tester@example.test']]);
  expect(sendCode).not.toHaveBeenCalled();
});
