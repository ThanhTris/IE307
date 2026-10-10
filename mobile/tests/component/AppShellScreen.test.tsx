import { render, screen, userEvent } from '@testing-library/react-native';
import { AppShellScreen } from '../../src/features/home/screens/AppShellScreen';
import { FoundationScreen } from '../../src/features/home/screens/FoundationScreen';
import { NotFoundScreen } from '../../src/features/home/screens/NotFoundScreen';

test('shell renders without backend env and clearly states its scope', async () => {
  await render(<AppShellScreen onOpenFoundation={jest.fn()} />);
  expect(screen.getByText(/Chọn một món/)).toBeOnTheScreen();
  expect(screen.getByText(/Chưa kết nối API/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Tạo phòng' })).toBeNull();
});

test('shell exposes accessible navigation action', async () => {
  const onOpen = jest.fn();
  await render(<AppShellScreen onOpenFoundation={onOpen} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Xem cấu trúc ứng dụng' }));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('foundation displays layers and back action', async () => {
  const onBack = jest.fn();
  await render(<FoundationScreen onBack={onBack} />);
  for (const layer of ['app', 'features', 'shared', 'domain', 'data']) expect(screen.getByText(layer)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('not-found offers recovery to home', async () => {
  const onHome = jest.fn();
  await render(<NotFoundScreen onHome={onHome} />);
  expect(screen.getByText('Không tìm thấy trang')).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Về trang đầu' }));
  expect(onHome).toHaveBeenCalledTimes(1);
});
