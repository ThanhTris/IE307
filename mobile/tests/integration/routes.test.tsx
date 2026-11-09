import { renderRouter } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { act } from 'react';
import { fireEvent, renderHook, screen, userEvent, waitFor } from '@testing-library/react-native';
import Layout from '../../src/app/_layout';
import Index from '../../src/app/index';
import Welcome from '../../src/app/welcome';
import Tutorial from '../../src/app/tutorial';
import ContinueSession from '../../src/app/continue-session';
import HomePreview from '../../src/app/dev/home';
import Foundation from '../../src/app/dev/foundation';
import NotFound from '../../src/app/+not-found';
import Components from '../../src/app/dev/components';
import Features from '../../src/app/dev/features';
import Lobby from '../../src/app/room/lobby';
import RoomStatus from '../../src/app/room/status';
import Friends from '../../src/app/friends';
import Inbox from '../../src/app/inbox';
import PushSettings from '../../src/app/push-settings';
import History from '../../src/app/history';
import Shell from '../../src/app/dev/shell';
import CreateRoom from '../../src/app/room/create';
import CreateEntry from '../../src/app/room/create-entry';
import JoinRoom from '../../src/app/room/join';
import JoinEntry from '../../src/app/room/join-entry';
import RoomPreview from '../../src/app/room/preview';
import Vote from '../../src/app/room/vote';
import FinalRound from '../../src/app/room/final-round';
import { markTutorialSeen, rememberPreviewGuest, rememberPreviewRoom, resetPreviewEntry, setPreviewScenario, useRoomPreview } from '../../src/bootstrap/roomPreview';
import * as roomRepositoryProvider from '../../src/bootstrap/RoomRepositoryProvider';
import type { RoomRepository } from '../../src/features/rooms/services/roomRepository';
import type { SessionUser } from '../../src/data/api/contracts';
import RoomLayout from '../../src/app/room/_layout';
import RoomContext from '../../src/app/room/context';
import RoomPreferences from '../../src/app/room/preferences';
import DiscoveryContext from '../../src/app/dev/discovery-context';

const routes = {
  _layout: Layout,
  index: Index,
  welcome: Welcome,
  tutorial: Tutorial,
  'continue-session': ContinueSession,
  'dev/home': HomePreview,
  friends: Friends,
  inbox: Inbox,
  'push-settings': PushSettings,
  history: History,
  '+not-found': NotFound,
  'room/_layout': RoomLayout,
  'room/create': CreateRoom,
  'room/create-entry': CreateEntry,
  'room/join': JoinRoom,
  'room/join-entry': JoinEntry,
  'room/preview': RoomPreview,
  'room/context': RoomContext,
  'room/preferences': RoomPreferences,
  'room/lobby': Lobby,
  'room/status': RoomStatus,
  'room/vote': Vote,
  'room/final-round': FinalRound,
  'dev/shell': Shell,
  'dev/foundation': Foundation,
  'dev/components': Components,
  'dev/features': Features,
  'dev/discovery-context': DiscoveryContext,
};

test('Push settings route explains the real-session requirement in mock mode', async () => {
  await renderRouter(routes, { initialUrl: '/push-settings' });
  await waitFor(() => expect(screen).toHavePathname('/push-settings'));
  expect(await screen.findByText('Đăng nhập bằng kết nối thật để quản lý đăng ký push. Hộp thư mô phỏng vẫn hoạt động.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Quay lại Hộp thư' })).toBeOnTheScreen();
});

test('Push settings route is reachable with an active real session', async () => {
  const user = { id: 'live-push-user', displayName: 'Minh', isGuest: true, createdAt: '2026-11-09T00:00:00Z' } satisfies SessionUser;
  const repository = {
    getCurrentUser: () => user,
    getSessionStatus: () => 'active',
    getIdentityRevision: () => 1,
    getApiClient: () => ({}),
  } as unknown as RoomRepository;
  const hook = jest.spyOn(roomRepositoryProvider, 'useRoomRepository').mockReturnValue({
    repository, status: 'active', issue: 'none', user, mode: 'real', isInitializing: false,
    restoreSession: jest.fn(), ensureSession: jest.fn(), logout: jest.fn(),
  });
  try {
    await renderRouter(routes, { initialUrl: '/push-settings' });
    await waitFor(() => expect(screen).toHavePathname('/push-settings'));
    expect(await screen.findByRole('button', { name: 'Tắt thông báo trên thiết bị này' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mở Hộp thư' })).toBeOnTheScreen();
  } finally {
    hook.mockRestore();
  }
});
beforeEach(() => { setPreviewScenario('default'); rememberPreviewGuest('Tuấn'); markTutorialSeen(); });
afterEach(() => jest.useRealTimers());

test('fresh mock entry reaches Home with a name without creating a real session or room', async () => {
  resetPreviewEntry();
  const preview = await renderHook(useRoomPreview);
  const createGuest = jest.spyOn(preview.result.current.client, 'createGuestSession');
  const createRoom = jest.spyOn(preview.result.current.client, 'createRoom');
  const joinRoom = jest.spyOn(preview.result.current.client, 'joinRoom');
  await renderRouter(routes, { initialUrl: '/' });
  expect(await screen.findByRole('button', { name: 'Tham gia với tư cách khách' })).toBeOnTheScreen();
  expect(screen).toHavePathname('/welcome');
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Tham gia với tư cách khách' }));
  await user.type(screen.getByLabelText('Tên khách'), 'Minh');
  await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));
  await waitFor(() => expect(screen).toHavePathname('/tutorial'));
  await user.press(screen.getByRole('button', { name: 'Bỏ qua hướng dẫn' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
  expect(await screen.findByText('Chủ phòng: Minh')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tiếp tục thiết lập' })).toBeEnabled();
  expect(createGuest).not.toHaveBeenCalled();
  expect(createRoom).not.toHaveBeenCalled();
  expect(joinRoom).not.toHaveBeenCalled();
  createGuest.mockRestore(); createRoom.mockRestore(); joinRoom.mockRestore();
});

test('Room setup routes preserve the same saved room from home tools through context and preferences', async () => {
  await renderRouter(routes, { initialUrl: '/dev/home' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Công cụ kiểm thử' }));
  await user.press(screen.getByRole('button', { name: 'Chọn điểm ăn và khẩu vị' }));
  await screen.findByLabelText('Giờ ăn (UTC+7)');
  await user.press(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' }));
  await user.press(screen.getByRole('button', { name: 'Xem món mẫu theo bối cảnh' }));
  await screen.findByText('Phở bò tái nạm');
  await user.press(screen.getByRole('button', { name: 'Lưu bối cảnh mẫu' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  await screen.findByRole('button', { name: 'Gì cũng được' });
  expect(screen).toHavePathname('/room/preferences');
  await user.press(screen.getByRole('button', { name: 'Cơm' }));
  await user.press(screen.getByRole('button', { name: 'Lưu khẩu vị mẫu' }));
  await screen.findByText('Sẵn sàng của bạn: Chưa sẵn sàng');
  expect(screen.getByText('Đã hoàn tất chọn khẩu vị')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Tiếp tục đến phòng chờ' })).toBeNull();
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await waitFor(() => expect(screen).toHavePathname('/room/context'));
  await user.press(screen.getByRole('button', { name: 'Chỉnh lại bối cảnh' }));
  await screen.findByLabelText('Giờ ăn (UTC+7)');
  expect(screen.getByLabelText('Giờ ăn (UTC+7)')).toBeEnabled();
  await user.press(screen.getByRole('button', { name: '2 km' }));
  await user.press(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' }));
  await user.press(screen.getByRole('button', { name: 'Xem món mẫu theo bối cảnh' }));
  await screen.findByText('Phở bò tái nạm');
  await user.press(screen.getByRole('button', { name: 'Lưu bối cảnh mẫu' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  await screen.findByRole('button', { name: 'Cơm' });
  expect(screen.getByRole('button', { name: 'Cơm' }).props.accessibilityState.selected).toBe(true);
}, 15000);

test.each(['form', 'receipt'] as const)('Home brand on preferences %s returns to Home instead of context', async state => {
  await renderRouter(routes, { initialUrl: '/room/context?legacy=1' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await screen.findByLabelText('Giờ ăn (UTC+7)');
  await user.press(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' }));
  await user.press(screen.getByRole('button', { name: 'Xem món mẫu theo bối cảnh' }));
  await screen.findByText('Phở bò tái nạm');
  await user.press(screen.getByRole('button', { name: 'Lưu bối cảnh mẫu' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  await screen.findByRole('button', { name: 'Gì cũng được' });
  if (state === 'receipt') {
    await user.press(screen.getByRole('button', { name: 'Lưu khẩu vị mẫu' }));
    await screen.findByText('Đã hoàn tất chọn khẩu vị');
  }
  await user.press(screen.getByRole('button', { name: 'Về trang chủ' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeOnTheScreen();
});

test('Context carries host anti-repeat into preferences and skip ends at an explicit receipt', async () => {
  await renderRouter(routes, { initialUrl: '/room/context?legacy=1' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await screen.findByLabelText('Giờ ăn (UTC+7)');
  await fireEvent(screen.getByRole('switch', { name: 'Tránh lặp món gần đây' }), 'valueChange', true);
  await user.press(screen.getByRole('checkbox', { name: 'Tôi xác nhận điểm công cộng, buổi và giờ ăn' }));
  await user.press(screen.getByRole('button', { name: 'Xem món mẫu theo bối cảnh' }));
  await screen.findByText('Phở bò tái nạm');
  await user.press(screen.getByRole('button', { name: 'Lưu bối cảnh mẫu' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  await screen.findByRole('button', { name: 'Gì cũng được' });
  expect(screen.getByText('Chống lặp của phòng: Đang bật · do chủ phòng chọn.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Bỏ qua sở thích mềm' }));
  await screen.findByText('Đã hoàn tất chọn khẩu vị');
  expect(screen).toHavePathname('/room/preferences');
  await user.press(screen.getByRole('button', { name: 'Quay lại bối cảnh' }));
  await waitFor(() => expect(screen).toHavePathname('/room/context'));
});

test('real route modules navigate from shell to foundation and back', async () => {
  await renderRouter(routes, { initialUrl: '/dev/shell' });
  expect(screen).toHavePathname('/dev/shell');
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Xem cấu trúc ứng dụng' }));
  await waitFor(() => expect(screen).toHavePathname('/dev/foundation'));
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  await waitFor(() => expect(screen).toHavePathname('/dev/shell'));
});

test('foundation exposes the shared component preview route', async () => {
  await renderRouter(routes, { initialUrl: '/dev/foundation' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Mở component mẫu GM-05' }));
  await waitFor(() => expect(screen).toHavePathname('/dev/components'));
  expect(screen.getByText('GM-05 · Component dùng chung')).toBeOnTheScreen();
  expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
});

test('unknown deep link renders not-found and recovers to shell', async () => {
  await renderRouter(routes, { initialUrl: '/khong-co-trang' });
  expect(screen.getByText('Không tìm thấy trang')).toBeOnTheScreen();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Về trang đầu' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(screen.getByText(/Chọn món hợp ý/)).toBeOnTheScreen();
});

test('foundation preview opens feature routes through Expo Router', async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await renderRouter(routes, { initialUrl: '/dev/foundation' });
  await user.press(screen.getByRole('button', { name: 'Mở các màn mock GM-11 và GM-14' }));
  await waitFor(() => expect(screen).toHavePathname('/dev/features'));
  await user.press(screen.getByRole('button', { name: 'GM-14 · Lịch sử · Mở' }));
  await waitFor(() => expect(screen).toHavePathname('/history'));
  expect(await screen.findByText('Quyền lưu lịch sử')).toBeOnTheScreen();
});

test('Home navigates create/join with back to Home and preserves foundation tools', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  const user = userEvent.setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
  await waitFor(() => expect(screen).toHavePathname('/room/create-entry'));
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Tham gia phòng' }));
  await waitFor(() => expect(screen).toHavePathname('/room/join-entry'));
  await user.press(screen.getByRole('button', { name: 'Quay lại' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
});

test('Figma Home uses the shared banner/action/nav components and routes its tabs', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  const user = userEvent.setup();
  expect(await screen.findByText('Hôm nay\ncả nhóm ăn gì?')).toBeOnTheScreen();
  expect(screen.getByTestId('brand-banner-illustration')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Công cụ kiểm thử' }).props.accessibilityState.expanded).toBe(false);
  expect(screen.queryByRole('button', { name: 'Xem cấu trúc ứng dụng' })).toBeNull();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled());
  expect(screen.getByRole('button', { name: 'Tham gia phòng' })).toBeEnabled();
  expect(screen.getByRole('tab', { name: 'Trang chủ' }).props.accessibilityState.selected).toBe(true);

  await user.press(screen.getByRole('tab', { name: 'Bạn bè' }));
  await waitFor(() => expect(screen).toHavePathname('/friends'));
  await user.press(screen.getByRole('button', { name: 'Về màn hình chính' }));
  await waitFor(() => expect(screen).toHavePathname('/'));

  await user.press(screen.getByRole('tab', { name: 'Lịch sử' }));
  await waitFor(() => expect(screen).toHavePathname('/history'));
  await user.press(screen.getByRole('button', { name: 'Về màn hình chính' }));
  await waitFor(() => expect(screen).toHavePathname('/'));

  await user.press(screen.getByRole('button', { name: 'Thông báo' }));
  await waitFor(() => expect(screen).toHavePathname('/inbox'));
});

test('development Home fixtures expose friends failure and verified continuation with collapsed Home tools', async () => {
  await renderRouter(routes, { initialUrl: '/dev/home' });
  await fireEvent.press(screen.getByRole('button', { name: 'Công cụ kiểm thử' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Lỗi bạn bè' }));
  await screen.findByText('Chưa tải được bạn bè');
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Công cụ kiểm thử' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Có phòng để tiếp tục' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Quay lại phòng mô phỏng' }));
  await waitFor(() => expect(screen).toHavePathname('/continue-session'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tiếp tục phiên' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('button', { name: 'Về trang chủ' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(screen.getByRole('button', { name: 'Công cụ kiểm thử' }).props.accessibilityState.expanded).toBe(false);
  expect(screen.queryByRole('button', { name: 'Lỗi bạn bè' })).toBeNull();
});

test('release Home hides development tools while keeping create and join available', async () => {
  const devSetting = jest.replaceProperty(globalThis as typeof globalThis & { __DEV__: boolean }, '__DEV__', false);
  try {
    await renderRouter(routes, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Tham gia phòng' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Công cụ kiểm thử' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xem cấu trúc ứng dụng' })).toBeNull();
  } finally { devSetting.restore(); }
});

test('join deep link pre-fills code but waits for user confirmation', async () => {
  await renderRouter(routes, { initialUrl: '/room/join?code=gcd234' });
  expect(screen.getByLabelText('Mã phòng (6 ký tự)').props.value).toBe('GCD234');
  expect(screen.queryByText('Đã nhận yêu cầu mô phỏng')).toBeNull();
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Tên của bạn'));
  await user.type(screen.getByLabelText('Tên của bạn'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Vào phòng →' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' }));
  await waitFor(() => expect(screen).toHavePathname('/room/preview'));
  expect(await screen.findByLabelText('Mã phòng GCD234')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await screen.findByText('Phòng mẫu #GCD234');
  await user.press(screen.getByRole('button', { name: 'Quay lại phòng mô phỏng' }));
  await waitFor(() => expect(screen).toHavePathname('/continue-session'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tiếp tục phiên' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Tiếp tục phiên' }));
  await waitFor(() => expect(screen).toHavePathname('/room/preview'));
});

test('Home create flow reaches the adapter receipt and preserves the room on return', async () => {
  await renderRouter(routes, { initialUrl: '/dev/home' });
  const user = userEvent.setup();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeEnabled());
  await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
  await screen.findByRole('button', { name: 'Hồ Con Rùa' });
  await user.clear(screen.getByLabelText('Tên của bạn (chủ phòng)'));
  await user.type(screen.getByLabelText('Tên của bạn (chủ phòng)'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Hồ Con Rùa' }));
  expect(screen.getByText('BỐI CẢNH PHÒNG')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Tôi xác nhận điểm ăn, buổi và giờ' }));
  await user.press(screen.getByRole('button', { name: 'Tạo phòng mô phỏng' }));
  await waitFor(() => expect(screen).toHavePathname('/room/preview'));
  expect(await screen.findByText('Đã tạo phòng mẫu')).toBeOnTheScreen();
  expect(screen.getByText('Đã nhận yêu cầu mô phỏng')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(await screen.findByRole('button', { name: 'Quay lại phòng mô phỏng' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tạo phòng' })).toBeDisabled();
});

test('a warm route parameter updates the code without joining or keeping the previous confirmation', async () => {
  await renderRouter(routes, { initialUrl: '/room/join?code=GCD234' });
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Tên của bạn'));
  await user.type(screen.getByLabelText('Tên của bạn'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Vào phòng →' }));
  expect(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' })).toBeOnTheScreen();
  await act(async () => router.setParams({ code: 'xyz789' }));
  await waitFor(() => expect(screen.getByLabelText('Mã phòng (6 ký tự)').props.value).toBe('XYZ789'));
  expect(screen.getByLabelText('Tên của bạn').props.value).toBe('Tuấn');
  expect(screen.queryByRole('button', { name: 'Xác nhận vào phòng mô phỏng' })).toBeNull();
  expect(screen.queryByText('Đã nhận yêu cầu mô phỏng')).toBeNull();
  expect(screen).toHavePathname('/room/join');
});

test('changing fixture on join renders full error and can reset for retry', async () => {
  await renderRouter(routes, { initialUrl: '/room/join' });
  const user = userEvent.setup();
  expect(screen.queryByRole('button', { name: 'Đầy phòng' })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Công cụ kiểm thử' }));
  await user.press(screen.getByRole('button', { name: 'Đầy phòng' }));
  await user.type(screen.getByLabelText('Tên của bạn'), 'Tuấn');
  await user.press(screen.getByRole('button', { name: 'Điền mã mẫu GCD234' }));
  await user.press(screen.getByRole('button', { name: 'Vào phòng →' }));
  await user.press(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' }));
  expect(await screen.findByText(/Phòng đã đủ người/)).toBeOnTheScreen();
  expect(screen).toHavePathname('/room/join');
  await user.press(screen.getByRole('button', { name: 'Công cụ kiểm thử' }));
  await user.press(screen.getByRole('button', { name: 'Bình thường' }));
  expect(screen.queryByText(/Phòng đã đủ người/)).toBeNull();
});

test('receipt deep link without memory offers safe recovery instead of inventing room', async () => {
  await renderRouter(routes, { initialUrl: '/room/preview' });
  expect(screen.getByText('Phiên mẫu chỉ lưu trong bộ nhớ')).toBeOnTheScreen();
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: '‹ Quay lại' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
});

test.each(['/room/create', '/room/join'])('active receipt guards direct navigation to %s', async initialUrl => {
  rememberPreviewRoom({ roomId: 'room_mock_001', code: 'GCD234', version: 1, role: 'host' });
  await renderRouter(routes, { initialUrl });
  expect(screen.getByText('Đã nhận yêu cầu mô phỏng')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Tên của bạn (chủ phòng)')).toBeNull();
  expect(screen.queryByLabelText('Tên của bạn')).toBeNull();
});

test('shell navigates to vote route and renders voting screen', async () => {
  await renderRouter(routes, { initialUrl: '/dev/shell' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Mở bình chọn GM-12' }));
  await waitFor(() => expect(screen).toHavePathname('/room/vote'));
  expect(screen.getByText('GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)')).toBeOnTheScreen();
});

test('successful lobby start continues directly to round-one voting', async () => {
  await renderRouter(routes, { initialUrl: '/room/lobby' });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await screen.findByRole('button', { name: 'Bắt đầu chọn món' });
  await user.press(screen.getByRole('button', { name: 'Bắt đầu chọn món' }));
  await waitFor(() => expect(screen).toHavePathname('/room/vote'));
  expect(await screen.findByRole('button', { name: 'Gửi phiếu' })).toBeOnTheScreen();
});
