import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccountEditScreen } from '../../src/features/account/screens/AccountEditScreen';
import type { AccountService } from '../../src/data/auth';
import type { ReadResult } from '../../src/data/api/contracts';
import { lightColors } from '../../src/shared/theme/tokens';

const user = { id: 'fixture-member', displayName: 'Minh', isGuest: false, createdAt: '2026-11-16T00:00:00Z' };
const failed = { ok: false, error: { messageKey: 'NETWORK_ERROR' } } as const;

function setup(kind: 'edit-profile' | 'change-password') {
  let resolve!: (result: ReadResult<void>) => void;
  const request = new Promise<ReadResult<void>>(done => { resolve = done; });
  const account = { saveProfile: jest.fn(() => request), changePassword: jest.fn(() => request) };
  const tree = <AccountEditScreen kind={kind} user={user} account={account as unknown as AccountService}
    onBack={jest.fn()} onRecovery={jest.fn()} />;
  return { render: () => render(tree), account, finish: async (result: ReadResult<void> = failed) => act(async () => { resolve(result); }) };
}

function expectFieldError(label: string, message: string) {
  const input = screen.getByLabelText(label);
  expect(input).toHaveProp('accessibilityHint', message);
  expect(input).toHaveStyle({ borderColor: lightColors.danger });
}

test('G04 keeps the submitted name after network failure and retries it successfully', async () => {
  const fixture = setup('edit-profile');
  await fixture.render();
  await fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), 'Minh mới');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expect(screen.getByRole('button', { name: 'Đang lưu hồ sơ…' })).toBeDisabled();
  expect(screen.queryByText('Đã lưu hồ sơ')).toBeNull();
  await fixture.finish();
  expect(screen.getByDisplayValue('Minh mới')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
  expect(fixture.account.saveProfile).toHaveBeenCalledTimes(1);

  fixture.account.saveProfile.mockResolvedValueOnce({ ok: true, data: undefined });
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expect(fixture.account.saveProfile).toHaveBeenNthCalledWith(2, 'Minh mới');
  expect(screen.getByText('Đã lưu hồ sơ')).toBeOnTheScreen();
});

test('G05 blocks a second submit while pending and clears every password after provider failure', async () => {
  const fixture = setup('change-password');
  await fixture.render();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'Fixture-before!');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'Fixture-after!');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Fixture-after!');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  const pending = screen.getByRole('button', { name: 'Đang cập nhật mật khẩu…' });
  expect(pending).toBeDisabled();
  await fireEvent.press(pending);
  expect(fixture.account.changePassword).toHaveBeenCalledTimes(1);
  await fixture.finish();
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveProp('value', '');
  expect(screen.getByLabelText('Mật khẩu mới')).toHaveProp('value', '');
  expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveProp('value', '');
  expect(screen.getByRole('button', { name: 'Lưu mật khẩu mới' })).toBeEnabled();
  expect(screen.queryByText('Đã đổi mật khẩu thành công')).toBeNull();
});

test('a missing display name is highlighted without submitting the form', async () => {
  const fixture = setup('edit-profile');
  await fixture.render();
  await fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), '  ');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expectFieldError('Tên hiển thị', 'Nhập tên hiển thị.');
  expect(fixture.account.saveProfile).not.toHaveBeenCalled();
});

test('password validation identifies each field and provider credential errors target the current password', async () => {
  const fixture = setup('change-password');
  await fixture.render();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'short');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'different');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  expectFieldError('Mật khẩu hiện tại', 'Nhập mật khẩu hiện tại.');
  expectFieldError('Mật khẩu mới', 'Mật khẩu cần ít nhất 8 ký tự');
  expectFieldError('Nhập lại mật khẩu mới', 'Hai mật khẩu mới chưa khớp.');
  expect(fixture.account.changePassword).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'Fixture-before!');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'Fixture-after!');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Fixture-after!');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  await fixture.finish({ ok: false, error: { messageKey: 'AUTH_REQUIRED', details: { reason: 'invalid_credentials' } } });
  expectFieldError('Mật khẩu hiện tại', 'Mật khẩu hiện tại chưa đúng.');
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveProp('value', '');
  expect(screen.getByLabelText('Mật khẩu mới')).toHaveProp('value', 'Fixture-after!');
  expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveProp('value', 'Fixture-after!');
});

test('an invalid new password clears both new fields and keeps the current password', async () => {
  const fixture = setup('change-password');
  await fixture.render();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'Fixture-before!');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'short');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'short');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveProp('value', 'Fixture-before!');
  expect(screen.getByLabelText('Mật khẩu mới')).toHaveProp('value', '');
  expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveProp('value', '');
  expect(fixture.account.changePassword).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'Fixture-before!');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Fixture-before!');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  await fixture.finish({ ok: false, error: { messageKey: 'INVALID_INPUT', details: { reason: 'same_password' } } });
  expectFieldError('Mật khẩu mới', 'Hãy chọn mật khẩu khác với mật khẩu hiện tại.');
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveProp('value', 'Fixture-before!');
  expect(screen.getByLabelText('Mật khẩu mới')).toHaveProp('value', '');
  expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveProp('value', '');
});

test('successful password change confirms completion', async () => {
  const fixture = setup('change-password');
  await fixture.render();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'Fixture-before!');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'Fixture-after!');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Fixture-after!');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  await fixture.finish({ ok: true, data: undefined });
  expect(screen.getByText('Đã đổi mật khẩu thành công')).toBeOnTheScreen();
});
