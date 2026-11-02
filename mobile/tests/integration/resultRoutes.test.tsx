import { renderRouter } from 'expo-router/testing-library';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Layout from '../../src/app/_layout';
import Index from '../../src/app/index';
import Welcome from '../../src/app/welcome';
import HomePreview from '../../src/app/dev/home';
import Foundation from '../../src/app/dev/foundation';
import CreateRoom from '../../src/app/room/create';
import CreateEntry from '../../src/app/room/create-entry';
import RoomSetup from '../../src/app/room/setup';
import Result from '../../src/app/room/result';
import NoConsensus from '../../src/app/room/no-consensus';
import RoomFlowSandbox from '../../src/app/dev/room-flow-sandbox';
import { markTutorialSeen, rememberPreviewGuest, rememberPreviewRoom, resetPreviewEntry, setPreviewScenario } from '../../src/bootstrap/roomPreview';
import { completeNativeAnimations } from '../helpers/completeNativeAnimations';

const routes = {
  _layout: Layout,
  index: Index,
  welcome: Welcome,
  'dev/home': HomePreview,
  'dev/foundation': Foundation,
  'room/create': CreateRoom,
  'room/create-entry': CreateEntry,
  'room/setup': RoomSetup,
  'room/result': Result,
  'room/no-consensus': NoConsensus,
  'dev/room-flow-sandbox': RoomFlowSandbox,
};
const press = async (name: string) => { await fireEvent.press(screen.getByRole('button', { name })); };
beforeEach(() => { completeNativeAnimations(); setPreviewScenario('default'); resetPreviewEntry(); markTutorialSeen(); });
afterEach(() => jest.restoreAllMocks());

test('merged Foundation opens Room Flow Sandbox and terminal result screens', async () => {
  await renderRouter(routes, { initialUrl: '/dev/foundation' });
  expect(screen.getByRole('button', { name: 'Mở kết quả GM-13' })).toBeEnabled();
  await press('Kiểm tra luồng GM-25');
  await screen.findByText('Kiểm tra Luồng UI–BE (GM-25)');
  expect(screen).toHavePathname('/dev/room-flow-sandbox');
  await press('Quay lại');
  await screen.findByRole('button', { name: 'Mở kết quả GM-13' });
  await press('Mở kết quả GM-13');
  await screen.findByText('Mô phỏng · kết quả · dữ liệu mẫu');
  await press('Chạm để bỏ qua');
  expect(screen).toHavePathname('/room/result');
  await press('Tình huống kiểm thử kết quả');
  await press('Xem chưa đồng thuận');
  await screen.findByText('Không thể chốt được món ăn');
  expect(screen).toHavePathname('/room/no-consensus');
});

test('development Home tools → foundation → Result → NoConsensus → Home uses real routes', async () => {
  rememberPreviewGuest('Tuấn');
  await renderRouter(routes, { initialUrl: '/dev/home' });
  await press('Công cụ kiểm thử');
  await press('Xem cấu trúc ứng dụng');
  await screen.findByRole('button', { name: 'Mở kết quả GM-13' });
  await press('Mở kết quả GM-13');
  await screen.findByText('Mô phỏng · kết quả · dữ liệu mẫu');
  await press('Chạm để bỏ qua');
  expect(screen).toHavePathname('/room/result');
  await press('Tình huống kiểm thử kết quả');
  await press('Xem chưa đồng thuận');
  await screen.findByText('Không thể chốt được món ăn');
  expect(screen).toHavePathname('/room/no-consensus');
  await press('Về trang chủ');
  await waitFor(() => expect(screen).toHavePathname('/'));
});

test.each(['/room/result', '/room/no-consensus'])('new session from %s clears only synthetic receipt and opens a fresh create form', async initialUrl => {
  rememberPreviewRoom({ roomId: 'old-fixture-room', code: 'GCD234', version: 2, role: 'host' });
  await renderRouter(routes, { initialUrl: `${initialUrl}?legacy=1` });
  await press('＋ Tạo phiên mới');
  await screen.findByLabelText('Tên của bạn (chủ phòng)');
  expect(screen).toHavePathname('/room/create');
  expect(screen.getByLabelText('Tên của bạn (chủ phòng)')).toHaveDisplayValue('');
  expect(screen.queryByText('Đã nhận yêu cầu mô phỏng')).toBeNull();
});

test('preview refetch restores offerings without switching tier or result identity', async () => {
  await renderRouter(routes, { initialUrl: '/room/result?legacy=1' });
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

test.each([
  ['Đang tải nơi bán lần đầu', false, true, 'Đang tải nơi bán'],
  ['Đang cập nhật nơi bán', true, true, 'Đang cập nhật nơi bán'],
  ['Lỗi tải nơi bán lần đầu', false, false, 'Chưa tải được nơi bán'],
  ['Lỗi cập nhật nơi bán', true, false, 'Chưa cập nhật được nơi bán'],
] as const)('preview %s distinguishes initial and refresh data without changing the result', async (label, cached, loading, title) => {
  await renderRouter(routes, { initialUrl: '/room/result?legacy=1' });
  await press('Công cụ kiểm thử GM-13');
  await press('Fixture CONSENSUS');
  const identity = screen.getByText(/Fixture hiện tại: CONSENSUS/).props.children;
  await press(`Fixture ${label}`);
  expect(screen.getByText(title)).toBeOnTheScreen();
  expect(screen.getByText(/Hôm nay ăn/)).toHaveTextContent(/Phở bò mẫu/);
  if (cached) {
    expect(screen.getByText('Quán phở mẫu')).toBeOnTheScreen();
    expect(screen.getByText('Dữ liệu cũ · Lịch dự kiến')).toBeOnTheScreen();
    expect(screen.getByText(/Dữ liệu lần tải trước:/)).toHaveTextContent(/11:31/);
  } else {
    expect(screen.queryByText('Quán phở mẫu')).toBeNull();
    expect(screen.queryByText(/Lấy thông tin lúc:|Dữ liệu lần tải trước:/)).toBeNull();
  }
  expect(screen.queryByText('Chưa có nơi bán phù hợp')).toBeNull();
  if (loading) expect(screen.getByRole('button', { name: 'Cập nhật nơi bán' })).toBeDisabled();
  else {
    await press('Cập nhật nơi bán');
    expect(screen.getByText('Quán phở mẫu')).toBeOnTheScreen();
    expect(screen.getByText(/Lấy thông tin lúc:/)).toHaveTextContent(/11:32/);
    expect(screen.queryByText('Dữ liệu cũ · Lịch dự kiến')).toBeNull();
    expect(screen.queryByText(title)).toBeNull();
  }
  expect(screen.getByText(/Fixture hiện tại: CONSENSUS/).props.children).toEqual(identity);
});

test.each(['/room/result', '/room/no-consensus'])('new dish-only session from %s opens the current GM-09/10 entry', async initialUrl => {
  rememberPreviewGuest('Tuấn');
  rememberPreviewRoom({ roomId: 'old-fixture-room', code: 'GCD234', version: 2, role: 'host' });
  await renderRouter(routes, { initialUrl });
  if (initialUrl === '/room/result') await press('Chạm để bỏ qua');
  await press('Tạo phòng mới');
  expect(await screen.findByText('Cùng chọn món cho cả nhóm')).toBeOnTheScreen();
  expect(screen).toHavePathname('/room/create-entry');
  expect(screen.getByRole('button', { name: 'Tiếp tục thiết lập' })).toBeEnabled();
});
