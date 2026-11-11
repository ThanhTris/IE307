import { fireEvent, render, screen } from '@testing-library/react-native';
import { ProfileScreen } from '../../src/features/account/screens/ProfileScreen';

// Figma 232:349 "Cá nhân · Khách".
test('guest profile follows the Figma guest card and explains accounts are coming', async () => {
  const navigate = jest.fn();
  await render(<ProfileScreen displayName="Minh" onNavigate={navigate} onHome={jest.fn()} />);
  expect(screen.getByText('M')).toBeOnTheScreen();
  expect(screen.getByText('Giữ bạn bè và lịch sử khi đổi máy.')).toBeOnTheScreen();
  expect(screen.getByText('Bạn vẫn có thể tạo hoặc tham gia phòng với tư cách khách.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Cài đặt' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Tạo tài khoản' }));
  expect(screen.getByText('Tài khoản sẽ có trong bản cập nhật tới. Bạn vẫn dùng đầy đủ tính năng với tư cách khách.')).toBeOnTheScreen();
  expect(navigate).not.toHaveBeenCalled();
});
