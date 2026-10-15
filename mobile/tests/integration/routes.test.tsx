import { renderRouter } from 'expo-router/testing-library';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { store } from 'expo-router/build/global-state/router-store';
import Layout from '../../src/app/_layout';
import Index from '../../src/app/index';
import Foundation from '../../src/app/foundation';
import NotFound from '../../src/app/+not-found';
import Components from '../../src/app/components';
import Gm12Vote from '../../src/app/gm12/vote';
import Gm12Final from '../../src/app/gm12/final';

const routes = {
  _layout: Layout,
  index: Index,
  foundation: Foundation,
  components: Components,
  '+not-found': NotFound,
  'gm12/vote': Gm12Vote,
  'gm12/final': Gm12Final,
};
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

test('shell navigates to GM-12 vote route and renders voting screen', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Mở bình chọn GM-12' }));
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/gm12/vote'));
  expect(screen.getByText('GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)')).toBeOnTheScreen();
});
