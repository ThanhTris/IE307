import { renderRouter } from 'expo-router/testing-library';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { store } from 'expo-router/build/global-state/router-store';
import Layout from '../../src/app/_layout';
import Index from '../../src/app/index';
import Foundation from '../../src/app/foundation';
import NotFound from '../../src/app/+not-found';
import Components from '../../src/app/components';

const routes = { _layout: Layout, index: Index, foundation: Foundation, components: Components, '+not-found': NotFound };
afterEach(() => jest.useRealTimers());

test('real route modules navigate from shell to foundation and back', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  expect(store.getRouteInfo().pathname).toBe('/');
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Xem cấu trúc ứng dụng' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/foundation'));
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/'));
});

test('foundation exposes the GM-05 component preview route', async () => {
  await renderRouter(routes, { initialUrl: '/foundation' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Mở component mẫu GM-05' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/components'));
  expect(screen.getByText('GM-05 · Component dùng chung')).toBeOnTheScreen();
  expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
});

test('unknown deep link renders not-found and recovers to shell', async () => {
  await renderRouter(routes, { initialUrl: '/khong-co-trang' });
  expect(screen.getByText('Không tìm thấy trang')).toBeOnTheScreen();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Về trang đầu' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/'));
  expect(screen.getByText(/Chọn một món/)).toBeOnTheScreen();
});
