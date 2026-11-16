import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileScreen } from '../../src/features/account/screens/ProfileScreen';

const guest = { id: 'fixture-guest', displayName: 'Minh', isGuest: true, createdAt: '2026-11-16T00:00:00Z' };

test('guest profile opens the live sign-in and link-email routes', async () => {
  const navigate = jest.fn();
  await render(<ProfileScreen user={guest} onNavigate={navigate} onHome={jest.fn()} onLogout={jest.fn()} />);
  expect(screen.getByText('M', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByText('Giữ bạn bè và lịch sử khi đổi máy.')).toBeOnTheScreen();
  expect(screen.getByText('Bạn vẫn có thể tạo hoặc tham gia phòng với tư cách khách.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Liên kết email' }));
  expect(navigate.mock.calls).toEqual([['/account/sign-in'], ['/account/link']]);
});
