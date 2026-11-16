import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccountEditScreen } from '../../src/features/account/screens/AccountEditScreen';
import type { AccountService } from '../../src/data/auth';
import type { ReadResult } from '../../src/data/api/contracts';

const user = { id: 'fixture-member', displayName: 'Minh', isGuest: false, createdAt: '2026-11-16T00:00:00Z' };
const failed = { ok: false, error: { messageKey: 'NETWORK_ERROR' } } as const;

function setup(kind: 'edit-profile' | 'change-password') {
  let resolve!: (result: ReadResult<void>) => void;
  const request = new Promise<ReadResult<void>>(done => { resolve = done; });
  const account = { saveProfile: jest.fn(() => request), changePassword: jest.fn(() => request) };
  const tree = <AccountEditScreen kind={kind} user={user} account={account as unknown as AccountService}
    onBack={jest.fn()} onRecovery={jest.fn()} />;
  return { render: () => render(tree), account, finish: async () => act(async () => { resolve(failed); }) };
}

test('G04 blocks repeated saves while pending and keeps the submitted name after network failure', async () => {
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
});

test('G05 clears every password after failed provider ACK and leaves the retry action available', async () => {
  const fixture = setup('change-password');
  await fixture.render();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'Fixture-before!');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'Fixture-after!');
  await fireEvent.changeText(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Fixture-after!');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));
  expect(screen.getByRole('button', { name: 'Đang cập nhật mật khẩu…' })).toBeDisabled();
  await fixture.finish();
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveProp('value', '');
  expect(screen.getByLabelText('Mật khẩu mới')).toHaveProp('value', '');
  expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveProp('value', '');
  expect(screen.getByRole('button', { name: 'Lưu mật khẩu mới' })).toBeEnabled();
  expect(screen.queryByText('Đã đổi mật khẩu')).toBeNull();
});
