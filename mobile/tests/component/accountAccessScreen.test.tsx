import { fireEvent, render, screen } from '@testing-library/react-native';
import type { AccountService } from '../../src/data/auth';
import type { ReadResult } from '../../src/data/api/contracts';
import { AccountAccessScreen } from '../../src/features/account/screens/AccountAccessScreen';
import { lightColors } from '../../src/shared/theme/tokens';

async function renderSignup() {
  const signUp = jest.fn<Promise<ReadResult<void>>, [Parameters<AccountService['signUp']>[0]]>()
    .mockResolvedValue({ ok: true, data: undefined });
  const account = { signUp } as unknown as AccountService;
  await render(<AccountAccessScreen flow="sign-up" account={account} isGuest={false}
    onBack={jest.fn()} onNavigate={jest.fn()} onComplete={jest.fn()} />);
  return signUp;
}

function expectFieldError(label: string, message: string) {
  const input = screen.getByLabelText(label);
  expect(input).toHaveProp('accessibilityHint', message);
  expect(input).toHaveStyle({ borderColor: lightColors.danger });
  expect(screen.getByText(message)).toHaveProp('accessibilityRole', 'alert');
}

test('signup marks every missing field and clears only the field being corrected', async () => {
  const signUp = await renderSignup();
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
  const signUp = await renderSignup();
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
