import { act } from 'react';
import * as ReactNative from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NoConsensusScreen, ResultScreen, type ExternalActionHandler, type ResultScreenProps } from '../../src/features/result';
import { noConsensusFixture, offeringFixture, resultContext, winnerFixture } from '../../src/bootstrap/resultFixtures';

function props(): ResultScreenProps {
  const result = winnerFixture();
  return { result, context: resultContext, offerings: offeringFixture(result), onHome: jest.fn(), onNewSession: jest.fn(),
    onRefetch: jest.fn(), onExternalAction: jest.fn(() => ({ ok: true })) };
}
const press = async (label: string) => { await fireEvent.press(screen.getByRole('button', { name: label })); };

test.each([
  ['PERFECT', 'Cả nhóm cùng muốn ăn món này.'], ['CONSENSUS', 'Đa số muốn ăn và mọi người đều giữ món này.'],
  ['COMPROMISE', 'Phương án cả nhóm ăn được, ưu tiên theo mức muốn ăn.'],
] as const)('renders %s with correct public reason and no mock fallback in reusable screen', async (tier, reason) => {
  const p = props();
  await render(<ResultScreen {...p} result={winnerFixture(tier)} />);
  expect(screen.getByText(/Hôm nay ăn/)).toHaveTextContent(/Phở bò mẫu/);
  expect(screen.getByText(reason)).toBeOnTheScreen();
  expect(screen.getByText(/650 m đường chim bay/)).toBeOnTheScreen();
  expect(screen.getByText(/chưa xác nhận còn món hoặc chỗ ngồi/)).toBeOnTheScreen();
  expect(screen.getByText(/Nguồn nơi bán: Fixture/)).toBeOnTheScreen();
  expect(screen.getByText(/45.000–65.000 VND/)).toBeOnTheScreen();
  expect(screen.queryByText('Mô phỏng · GM-13')).toBeNull();
});
test.each(['stale', 'closed', 'changed', 'empty', 'unknown', 'loading-initial', 'loading-refresh', 'error-initial', 'error-refresh'] as const)('refetch %s keeps finalized winner and scopes callback to refresh only', async scenario => {
  const p = props();
  const offerings = offeringFixture(p.result!, scenario);
  const { rerender } = await render(<ResultScreen {...p} offerings={offerings} />);
  const before = JSON.stringify(p.result);
  const button = screen.getByRole('button', { name: 'Cập nhật nơi bán' });
  if (offerings.status === 'loading') expect(button).toBeDisabled();
  else { await fireEvent.press(button); expect(p.onRefetch).toHaveBeenCalledTimes(1); }
  await rerender(<ResultScreen {...p} offerings={offeringFixture(p.result!, 'changed', true)} />);
  expect(screen.getByText(/Hôm nay ăn/)).toHaveTextContent(/Phở bò mẫu/);
  expect(screen.getByText('24 Đường Minh Họa, điểm bán mẫu mới')).toBeOnTheScreen();
  expect(JSON.stringify(p.result)).toBe(before);
  expect(p.onNewSession).not.toHaveBeenCalled();
});

test.each([
  ['loading-initial', 'Đang tải nơi bán'], ['error-initial', 'Chưa tải được nơi bán'],
] as const)('%s has no invented venue, fetch time or successful-empty message', async (scenario, title) => {
  const p = props();
  await render(<ResultScreen {...p} offerings={offeringFixture(p.result!, scenario)} />);
  expect(screen.getByText(title)).toBeOnTheScreen();
  expect(screen.getByText(/Hôm nay ăn/)).toHaveTextContent(/Phở bò mẫu/);
  expect(screen.queryByText('Quán phở mẫu')).toBeNull();
  expect(screen.queryByRole('button', { name: /Maps ·/ })).toBeNull();
  expect(screen.queryByText(/Lấy thông tin lúc:|Dữ liệu lần tải trước:/)).toBeNull();
  expect(screen.queryByText('Chưa có nơi bán phù hợp')).toBeNull();
});

test.each([
  ['loading-refresh', 'Đang cập nhật nơi bán'], ['error-refresh', 'Chưa cập nhật được nơi bán'],
] as const)('%s clearly marks previous data and keeps public actions usable', async (scenario, title) => {
  const p = props();
  const { rerender } = await render(<ResultScreen {...p} offerings={offeringFixture(p.result!, scenario)} />);
  expect(screen.getByText(title)).toBeOnTheScreen();
  expect(screen.getByText('Quán phở mẫu')).toBeOnTheScreen();
  expect(screen.getByText('Dữ liệu cũ · Lịch dự kiến')).toBeOnTheScreen();
  expect(screen.getByText(/Dữ liệu lần tải trước:/)).toHaveTextContent(/11:31/);
  expect(screen.queryByText(/Lấy thông tin lúc:/)).toBeNull();
  await press('Maps · Quán phở mẫu');
  expect(p.onExternalAction).toHaveBeenCalledWith('maps', expect.objectContaining({
    resultId: p.result!.resultId, address: '12 Đường Minh Họa, địa chỉ mẫu',
  }));
  await rerender(<ResultScreen {...p} offerings={offeringFixture(p.result!, 'ready', true)} />);
  expect(screen.queryByText(/Dữ liệu cũ|Dữ liệu lần tải trước:/)).toBeNull();
  expect(screen.getByText(/Lấy thông tin lúc:/)).toHaveTextContent(/11:32/);
});

test('successful empty and failed refresh of empty cache have distinct notices', async () => {
  const p = props();
  const empty = offeringFixture(p.result!, 'empty');
  const { rerender } = await render(<ResultScreen {...p} offerings={empty} />);
  expect(screen.getByText('Chưa có nơi bán phù hợp')).toBeOnTheScreen();
  await rerender(<ResultScreen {...p} offerings={{ ...empty, status: 'error' }} />);
  expect(screen.getByText('Chưa cập nhật được nơi bán')).toBeOnTheScreen();
  expect(screen.getByText(/Dữ liệu lần tải trước:/)).toHaveTextContent(/11:31/);
  expect(screen.queryByText('Chưa có nơi bán phù hợp')).toBeNull();
  expect(screen.queryByText('Quán phở mẫu')).toBeNull();
  await press('Cập nhật nơi bán');
  expect(p.onRefetch).toHaveBeenCalledTimes(1);
});

test('retained venue with an unknown fetch time stays explicitly unknown', async () => {
  const p = props();
  await render(<ResultScreen {...p} offerings={{ ...p.offerings, status: 'error', fetchedAt: null }} />);
  expect(screen.getByText('Chưa cập nhật được nơi bán')).toBeOnTheScreen();
  expect(screen.getByText('Dữ liệu lần tải trước: Chưa rõ')).toBeOnTheScreen();
  expect(screen.getByText('Dữ liệu cũ · Lịch dự kiến')).toBeOnTheScreen();
});
test('missing data uses unknown labels and disables external actions rather than inventing a target', async () => {
  const p = props();
  await render(<ResultScreen {...p} offerings={offeringFixture(p.result!, 'unknown')} />);
  expect(screen.getByText('Chưa có giá')).toBeOnTheScreen();
  expect(screen.getByText('Chưa rõ khoảng cách')).toBeOnTheScreen();
  expect(screen.getByText('Lịch dự kiến: Chưa rõ giờ phục vụ')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Maps · Nơi bán' })).toBeDisabled();
  expect(p.onExternalAction).not.toHaveBeenCalled();
});
test('mismatched offering is omitted while winner and refetch remain', async () => {
  const p = props();
  const item = p.offerings.items[0]!;
  await render(<ResultScreen {...p} offerings={{ ...p.offerings, items: [{ ...item, dish: { ...item.dish, dishId: 'other-dish' } }] }} />);
  expect(screen.getByText('Thông tin nơi bán không khớp kết quả')).toBeOnTheScreen();
  expect(screen.queryByText('Quán phở mẫu')).toBeNull();
  expect(screen.getByText(/Hôm nay ăn/)).toHaveTextContent(/Phở bò mẫu/);
});
test('external callbacks receive only the selected public offering and can fail with browser/copy fallback', async () => {
  const p = props();
  const action = jest.fn<ReturnType<ExternalActionHandler>, Parameters<ExternalActionHandler>>(() => ({ ok: false }));
  await render(<ResultScreen {...p} onExternalAction={action} />);
  for (const [label, expected] of [['Maps', 'maps'], ['Xem review', 'review'], ['Mở bằng trình duyệt', 'browser'], ['Sao chép địa chỉ', 'copy']]) {
    await press(`${label} · Quán phở mẫu`);
    await waitFor(() => expect(action).toHaveBeenLastCalledWith(expected, expect.objectContaining({
      offeringId: 'offering_fixture_gm13', address: '12 Đường Minh Họa, địa chỉ mẫu', anchorId: resultContext.anchorId,
      resultId: p.result!.resultId, dishId: p.result!.winnerDish!.dishId,
    })));
  }
  expect(screen.getByText(/Không thực hiện được thao tác/)).toBeOnTheScreen();
  expect(Object.keys(action.mock.calls[0]![1])).not.toEqual(expect.arrayContaining(['votes', 'latitude', 'longitude', 'token']));
});
test('pending external action cannot be sent twice and rejection is caught', async () => {
  const p = props();
  let reject!: (error: Error) => void;
  const handler = jest.fn(() => new Promise<{ ok: boolean }>((_, rejectPromise) => { reject = rejectPromise; }));
  await render(<ResultScreen {...p} onExternalAction={handler} />);
  await press('Maps · Quán phở mẫu');
  expect(screen.getByRole('button', { name: 'Sao chép địa chỉ · Quán phở mẫu' })).toBeDisabled();
  await act(async () => reject(new Error('provider failed')));
  await screen.findByText(/Không thực hiện được thao tác/);
  expect(handler).toHaveBeenCalledTimes(1);
});

test('two queued presses dispatch an external action only once before the disabled state renders', async () => {
  const p = props();
  let finish!: (value: { ok: boolean }) => void;
  const response = new Promise<{ ok: boolean }>(resolve => { finish = resolve; });
  const handler = jest.fn(() => response);
  await render(<ResultScreen {...p} onExternalAction={handler} />);
  // Queue two accessibility click events before React commits disabled=true.
  const button = screen.getByRole('button', { name: 'Maps · Quán phở mẫu' });
  const click = { nativeEvent: {}, currentTarget: 1, target: 1 };
  await act(async () => { button.props.onClick(click); button.props.onClick(click); });
  const calls = handler.mock.calls.length;
  await act(async () => { finish({ ok: true }); });
  expect(calls).toBe(1);
  await press('Maps · Quán phở mẫu');
  expect(handler).toHaveBeenCalledTimes(2);
});

test('result retry remains available when an unrelated offering request is still loading', async () => {
  const p = props();
  await render(<ResultScreen {...p} result={null} readState="error" offerings={offeringFixture(p.result!, 'loading-initial')} />);
  expect(screen.getByRole('button', { name: 'Tải lại kết quả' })).toBeEnabled();
  await press('Tải lại kết quả');
  expect(p.onRefetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Hôm nay ăn/)).toBeNull();
});
test.each(['loading', 'error'] as const)('result read %s never shows a guessed winner', async readState => {
  const p = props();
  await render(<ResultScreen {...p} result={null} readState={readState} />);
  expect(screen.queryByText(/Hôm nay ăn/)).toBeNull();
  expect(screen.queryByText('Quán phở mẫu')).toBeNull();
  if (readState === 'loading') expect(screen.getByRole('button', { name: 'Tải lại kết quả' })).toBeDisabled();
  else expect(screen.getByRole('button', { name: 'Tải lại kết quả' })).toBeEnabled();
});
test.each(['EMPTY_INTERSECTION', 'ALL_REMOVED'] as const)('no consensus %s exposes neutral new/end actions without old votes', async reason => {
  const onHome = jest.fn(); const onNewSession = jest.fn();
  await render(<NoConsensusScreen result={noConsensusFixture(reason)} onHome={onHome} onNewSession={onNewSession} />);
  expect(screen.getByText('Chưa chọn được món chung')).toBeOnTheScreen();
  expect(screen.queryByText(/Phở bò/)).toBeNull();
  expect(screen.queryByRole('button', { name: /Gửi|Vòng 3|Chọn lại món/ })).toBeNull();
  await press('＋ Tạo phiên mới');
  expect(onNewSession).toHaveBeenCalledWith();
  await press('Kết thúc · Về trang chủ');
  await press('Về trang chủ');
  expect(onHome).toHaveBeenCalledTimes(2);
});
test('Android Back from either terminal screen goes Home instead of the ballot route', async () => {
  const spy = jest.spyOn(ReactNative.BackHandler, 'addEventListener');
  const p = props();
  const view = await render(<ResultScreen {...p} />);
  const listener = spy.mock.calls.at(-1)![1];
  expect(listener({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
  expect(p.onHome).toHaveBeenCalledTimes(1);
  await view.unmount();
  await render(<NoConsensusScreen result={noConsensusFixture()} onHome={p.onHome} onNewSession={p.onNewSession} />);
  expect(spy.mock.calls.at(-1)![1]({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
  expect(p.onHome).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});
test('dark scheme uses semantic colors and keeps textual states', async () => {
  const spy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
  const p = props();
  await render(<ResultScreen {...p} offerings={offeringFixture(p.result!, 'closed')} />);
  expect(screen.getByText('Đóng cửa theo lịch mới.')).toHaveStyle({ color: '#F0F4F8' });
  spy.mockRestore();
});
test('two offerings keep independent prices, sources and external target identities', async () => {
  const p = props();
  const first = p.offerings.items[0]!;
  const second = { ...first, offeringId: 'offering-second', source: 'Menu quán thứ hai', dish: { ...first.dish, venueId: 'venue-second',
    venueName: 'Quán thứ hai', venueAddress: 'Địa chỉ thứ hai', price: { priceMin: 100000, priceMax: 100000, currency: 'VND' as const, unit: 'group' as const, servingSize: '2 người' } } };
  await render(<ResultScreen {...p} offerings={{ ...p.offerings, items: [first, second] }} />);
  expect(screen.getByText(/100.000 VND \/ phần nhóm/)).toBeOnTheScreen();
  await press('Maps · Quán thứ hai');
  expect(p.onExternalAction).toHaveBeenCalledWith('maps', expect.objectContaining({ offeringId: 'offering-second', venueId: 'venue-second', address: 'Địa chỉ thứ hai' }));
});
test('a winner result cannot be presented as a no-consensus outcome', async () => {
  await render(<NoConsensusScreen result={winnerFixture()} onHome={jest.fn()} onNewSession={jest.fn()} />);
  expect(screen.getByText('Chưa đọc được kết quả')).toBeOnTheScreen();
  expect(screen.queryByText('Chưa chọn được món chung')).toBeNull();
});
