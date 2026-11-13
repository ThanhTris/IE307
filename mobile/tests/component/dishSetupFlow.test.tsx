import { SetupShortageDialog } from '../../src/features/context/components/SetupShortageDialog';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { DishSetupFlow } from '../../src/features/context/screens/DishSetupFlow';
import { createDishSetupPreview, type DishSetupScenario } from '../fixtures/setup/dishSetupPreview';
import type { DishSetupGateway } from '../../src/features/context/services/dishSetupGateway';
import { useDishSetupFlow } from '../../src/features/context/hooks/useDishSetupFlow';

// These flows start from "now": pin it to a lunch hour (UTC+7) so the dish groups shown do not depend on the wall clock.
const NOON_VN = Date.UTC(2026, 10, 12, 5, 0, 0);
beforeEach(() => { jest.spyOn(Date, 'now').mockReturnValue(NOON_VN); });
afterEach(() => { jest.restoreAllMocks(); });

async function open(scenario: DishSetupScenario, gateway?: DishSetupGateway) {
  const port = gateway ?? createDishSetupPreview(scenario);
  await render(<DishSetupFlow gateway={port} onExit={jest.fn()} />);
  await screen.findByRole('header', { name: 'Buổi ăn' });
  return port;
}
test('shortage dialog shows requested/available separately and requires an explicit confirmation', async () => {
  const confirm = jest.fn();
  await render(<SetupShortageDialog available={7} requested={15} onConfirmReduction={confirm} onEdit={jest.fn()} onSchedule={jest.fn()} />);
  expect(screen.getByText('Chỉ có 7/15 món phù hợp.')).toBeOnTheScreen();
  expect(screen.getAllByRole('button').map(button => button.props.accessibilityLabel ?? '')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Đổi giờ hẹn' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Đổi buổi ăn' })).toBeNull();
  expect(confirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Dùng 7 món'));
  expect(confirm).toHaveBeenCalledTimes(1);
});
test('confirmed reduction sends the smaller count straight away', async () => {
  const gateway = createDishSetupPreview('shortage15'), write = jest.spyOn(gateway, 'write');
  const { result } = await renderHook(() => useDishSetupFlow(gateway));
  await waitFor(() => expect(result.current.data).toBeDefined());
  await act(async () => result.current.submitSettings());
  expect(result.current.shortage).toEqual({ available: 15, requested: 20 });
  expect(result.current.draft.dishCount).toBe(20);
  await act(async () => result.current.confirmReduction());
  expect(result.current.draft.dishCount).toBe(15);
  await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.stage).toBe('preferences'));
  expect((await gateway.read()).room?.version).toBe(1);
});
test('below five only offers to change the time and never creates a room', async () => {
  const port = createDishSetupPreview('shortage3');
  await open('shortage3', port);
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  expect(await screen.findByText('Chỉ có 3 món phù hợp, cần ít nhất 5 món. Hãy đổi giờ hẹn.')).toBeOnTheScreen();
  expect(screen.queryByText(/^Dùng \d+ món$/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Đổi giờ hẹn' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Đổi buổi ăn' })).toBeNull();
  expect((await port.read()).room).toBeUndefined();
});
test('7 of 15 dishes: "Dùng 7 món" creates the room with 7 dishes', async () => {
  const port = createDishSetupPreview('shortage7');
  await open('shortage7', port);
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Dùng 7 món' }));
  await waitFor(async () => expect((await port.read()).settings?.dishCount).toBe(7));
});
test('unknown delivery freezes intent and replays the same request once, with no duplicate room', async () => {
  const port = createDishSetupPreview('timeout'), write = jest.spyOn(port, 'write');
  await open('timeout', port);
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  // Recovery is automatic: the form stays frozen, then the SAME request is replayed.
  await screen.findByText('Chưa rõ kết quả lưu. Thử lại cùng yêu cầu; không sửa hoặc tạo phòng khác.');
  expect(screen.getByRole('button', { name: 'Ăn sáng' })).toBeDisabled();
  await screen.findByRole('checkbox', { name: 'Ăn gì cũng được' }, { timeout: 5000 });
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[0]![0]).toEqual(write.mock.calls[1]![0]);
  expect((await port.read()).room?.version).toBe(1);
});
test('read failure after ACK retries only read and skip keeps default consent', async () => {
  const port = createDishSetupPreview('ack-read-error'), write = jest.spyOn(port, 'write');
  await open('ack-read-error', port);
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  // The acknowledged write is re-read automatically; it is never sent again.
  await screen.findByRole('checkbox', { name: 'Ăn gì cũng được' }, { timeout: 5000 });
  expect(write).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Cơm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Bỏ qua' }));
  await screen.findByText('Đã hoàn tất thiết lập');
  expect((await port.read()).ownRoomPreferences).toMatchObject({ categoryIds: [], historyConsent: false });
});
test('save rejection retains own choices for retry; account defaults stay unchanged', async () => {
  const port = await open('save-error');
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Cơm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng chờ →' }));
  await screen.findByText('Chưa lưu được thay đổi. Đã giữ nháp; hãy thử lại.');
  expect(screen.getByRole('button', { name: 'Cơm' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng chờ →' }));
  await screen.findByText('Đã hoàn tất thiết lập');
  expect((await port.read()).accountDefaults.categoryIds).toEqual([]);
});
test('stale must refresh before retry', async () => {
  const port = createDishSetupPreview('stale'); await open('stale', port);
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  // Stale state blocks the form until the automatic reload finishes.
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeDisabled());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Chọn khẩu vị →' })).toBeEnabled(), { timeout: 5000 });
  await fireEvent.press(screen.getByRole('button', { name: 'Chọn khẩu vị →' }));
  await screen.findByRole('checkbox', { name: 'Ăn gì cũng được' });
});
test.each(['offline', 'closed'] as const)('%s blocks writes while retaining the loaded snapshot', async scenario => {
  const gateway = createDishSetupPreview(scenario), write = jest.spyOn(gateway, 'write');
  const { result } = await renderHook(() => useDishSetupFlow(gateway));
  await waitFor(() => expect(result.current.data).toBeDefined());
  await act(async () => result.current.submitSettings());
  expect(result.current.blocked).toBe(true);
  expect(write).not.toHaveBeenCalled();
});
test('rapid duplicate submission is guarded before React renders the disabled control', async () => {
  const gateway = createDishSetupPreview();
  let resolve!: (value: { ok: false; code: 'REJECTED' }) => void;
  const write = jest.spyOn(gateway, 'write').mockImplementation(() => new Promise(done => { resolve = done; }));
  const { result } = await renderHook(() => useDishSetupFlow(gateway));
  await waitFor(() => expect(result.current.data).toBeDefined());
  await act(async () => { result.current.submitSettings(); result.current.submitSettings(); });
  expect(write).toHaveBeenCalledTimes(1);
  expect(result.current.blocked).toBe(true);
  await act(async () => resolve({ ok: false, code: 'REJECTED' }));
  expect(result.current.phase).toBe('idle');
});
test('member advances to own preferences without submitting host settings', async () => {
  const gateway = createDishSetupPreview('member'), write = jest.spyOn(gateway, 'write');
  const { result } = await renderHook(() => useDishSetupFlow(gateway));
  await waitFor(() => expect(result.current.data).toBeDefined());
  await act(async () => result.current.submitSettings());
  expect(result.current.stage).toBe('preferences');
  expect(write).not.toHaveBeenCalled();
});
