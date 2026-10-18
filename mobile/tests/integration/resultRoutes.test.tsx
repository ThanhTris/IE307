import { renderRouter } from 'expo-router/testing-library';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { store } from 'expo-router/build/global-state/router-store';
import Layout from '../../src/app/_layout';
import Index from '../../src/app/index';
import Foundation from '../../src/app/foundation';
import CreateRoom from '../../src/app/create-room';
import Result from '../../src/app/gm13/result';
import NoConsensus from '../../src/app/gm13/no-consensus';
import { rememberPreviewRoom, setPreviewScenario } from '../../src/bootstrap/roomPreview';

const routes = { _layout: Layout, index: Index, foundation: Foundation, 'create-room': CreateRoom,
  'gm13/result': Result, 'gm13/no-consensus': NoConsensus };
const press = async (name: string) => { await fireEvent.press(screen.getByRole('button', { name })); };
beforeEach(() => setPreviewScenario('default'));

test('Home tools → foundation → Result → NoConsensus → Home uses real routes', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  await press('Công cụ kiểm thử');
  await press('Xem cấu trúc ứng dụng');
  await screen.findByRole('button', { name: 'Mở kết quả GM-13' });
  await press('Mở kết quả GM-13');
  await screen.findByText('Mô phỏng · GM-13');
  expect(store.getRouteInfo().pathname).toBe('/gm13/result');
  await press('Công cụ kiểm thử GM-13');
  await press('Xem chưa đồng thuận');
  await screen.findByText('Chưa chọn được món chung');
  expect(store.getRouteInfo().pathname).toBe('/gm13/no-consensus');
  await press('Về trang chủ');
  await waitFor(() => expect(store.getRouteInfo().pathname).toBe('/'));
});
test.each(['/gm13/result', '/gm13/no-consensus'])('new session from %s clears only synthetic receipt and opens a fresh create form', async initialUrl => {
  rememberPreviewRoom({ roomId: 'old-fixture-room', code: 'GCD234', version: 2, role: 'host' });
  await renderRouter(routes, { initialUrl });
  await press('＋ Tạo phiên mới');
  await screen.findByLabelText('Tên của bạn (chủ phòng)');
  expect(store.getRouteInfo().pathname).toBe('/create-room');
  expect(screen.getByLabelText('Tên của bạn (chủ phòng)')).toHaveDisplayValue('');
  expect(screen.queryByText('Đã nhận yêu cầu mô phỏng')).toBeNull();
});
test('preview refetch restores offerings without switching tier or result identity', async () => {
  await renderRouter(routes, { initialUrl: '/gm13/result' });
  await press('Công cụ kiểm thử GM-13');
  await press('Fixture COMPROMISE');
  await press('Fixture Đóng cửa');
  expect(screen.getByText('Đóng cửa theo lịch mới.')).toBeOnTheScreen();
  const identity = screen.getByText(/Fixture hiện tại: COMPROMISE/).props.children;
  await press('Cập nhật nơi bán');
  expect(screen.getByText(/Fixture hiện tại: COMPROMISE/).props.children).toEqual(identity);
  expect(screen.queryByText('Đóng cửa theo lịch mới.')).toBeNull();
  expect(screen.getByText(/Phương án cả nhóm ăn được/)).toBeOnTheScreen();
});
