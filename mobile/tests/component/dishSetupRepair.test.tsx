import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { createDishSetupPreview } from '../../src/bootstrap/dishSetupPreview';
import { emptyPreferences, type SetupRoom } from '../../src/features/context/services/dishSetup';
import { DishSetupFlow } from '../../src/features/context/screens/DishSetupFlow';
import { useDishSetupFlow } from '../../src/features/context/hooks/useDishSetupFlow';
import { SetupFriendsSheet } from '../../src/features/context/components/SetupFriendsSheet';
import { SetupInvitees } from '../../src/features/context/components/SetupInvitees';
import { SetupCheckboxRow } from '../../src/features/context/components/SetupCheckboxRow';
import { PreferenceAdvancedPanel } from '../../src/features/preferences/components/PreferenceAdvancedPanel';
import { completeNativeAnimations } from '../helpers/completeNativeAnimations';

beforeEach(completeNativeAnimations);
afterEach(() => jest.restoreAllMocks());

const room: SetupRoom = { id: 'ui-room', code: 'MCK234', version: 1, state: 'LOBBY' };
test('discarding preference and settings edits returns to receipt without a write or room change', async () => {
  const gateway = createDishSetupPreview('default', { room, preferences: emptyPreferences() }), write = jest.spyOn(gateway, 'write');
  const { result } = await renderHook(() => useDishSetupFlow(gateway, undefined, undefined, 'preferences'));
  await waitFor(() => expect(result.current.data).toBeDefined());
  await act(async () => result.current.returnFromEditor());
  expect(result.current.stage).toBe('complete');
  await act(async () => result.current.editPreferences());
  await act(async () => result.current.changePreferences({ ...emptyPreferences(), temperature: 'cold' }));
  expect(result.current.preferencesDirty).toBe(true);
  await act(async () => { result.current.discardPreferences(); result.current.returnFromEditor(); });
  expect(result.current.stage).toBe('complete');
  expect(result.current.preferences.temperature).toBeUndefined();
  await act(async () => result.current.editSettings());
  await act(async () => result.current.change({ mealSlot: 'breakfast' }));
  expect(result.current.dirty).toBe(true);
  await act(async () => { result.current.reset(); result.current.returnFromEditor(); });
  expect(result.current.stage).toBe('complete');
  expect(result.current.draft.mealSlot).toBe((await gateway.read()).settings?.mealSlot);
  expect(write).not.toHaveBeenCalled();
  expect((await gateway.read()).room).toEqual(room);
});
test('saving an existing setup advances to preferences and preserves own choices on the same room', async () => {
  const gateway = createDishSetupPreview('default', { room, preferences: emptyPreferences(true) });
  const { result } = await renderHook(() => useDishSetupFlow(gateway, undefined, undefined, 'preferences'));
  await waitFor(() => expect(result.current.data).toBeDefined());
  await act(async () => result.current.editSettings());
  await act(async () => result.current.change({ dishCount: 18 }));
  await act(async () => result.current.submitSettings());
  expect(result.current.stage).toBe('preferences');
  expect(result.current.dirty).toBe(false);
  const saved = await gateway.read();
  expect(saved.room).toMatchObject({ id: room.id, version: 2 });
  expect(saved.ownRoomPreferences?.historyConsent).toBe(true);
});
test('fresh setup Back always offers discard and continuing keeps the draft', async () => {
  const exit = jest.fn();
  await render(<DishSetupFlow gateway={createDishSetupPreview()} onExit={exit} />);
  await screen.findByText('Buổi ăn');
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(screen.getByRole('header', { name: 'Bỏ thiết lập phòng?' })).toBeOnTheScreen();
  expect(exit).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Tiếp tục thiết lập'));
  await waitFor(() => expect(screen.queryByText('Bỏ thiết lập phòng?')).toBeNull());
});
test('existing-room Back never silently exits or cancels; explicit confirmation shows cancellation result', async () => {
  const gateway = createDishSetupPreview('default', { room, preferences: emptyPreferences() }), write = jest.spyOn(gateway, 'write'), exit = jest.fn();
  await render(<DishSetupFlow gateway={gateway} onExit={exit} />);
  await screen.findByText('Buổi ăn');
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(screen.getByText('Hủy phòng mẫu?')).toBeOnTheScreen();
  expect(write).not.toHaveBeenCalled(); expect(exit).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Hủy phòng mẫu'));
  expect(await screen.findByText('Phòng đã bị hủy')).toBeOnTheScreen();
  expect((await gateway.read()).room).toMatchObject({ id: room.id, state: 'CLOSED', version: 2 });
});
test('friend picker stages choices, supplies avatar rows and can clear an empty search', async () => {
  const confirm = jest.fn(), close = jest.fn();
  await render(<SetupFriendsSheet friends={[{ id: 'linh', label: 'Linh' }, { id: 'nam', label: 'Nam' }]} initial={['linh']} onConfirm={confirm} onClose={close} />);
  expect(screen.getByRole('checkbox', { name: 'Linh' })).toBeChecked();
  await fireEvent.changeText(screen.getByLabelText('Tìm theo tên bạn bè'), 'nobody');
  expect(screen.getByText('Chưa tìm thấy bạn')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Xóa từ khóa'));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Nam' }));
  expect(confirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Chọn 2 người bạn'));
  expect(confirm).toHaveBeenCalledWith(['linh', 'nam']);
});
test('selected friends are named chips, rather than just a count', async () => {
  const edit = jest.fn();
  await render(<SetupInvitees ids={['linh']} friends={[{ id: 'linh', label: 'Linh' }]} onEdit={edit} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Sửa bạn Linh' }));
  expect(edit).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Linh')).toBeOnTheScreen();
});
test('recent-history helper stays in the checkbox row and does not disable the preference', async () => {
  const press = jest.fn();
  await render(<SetupCheckboxRow label="Ưu tiên món khác 3 bữa gần đây" checked helper="Chưa có lịch sử để tránh lặp." onPress={press} />);
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(screen.getByRole('checkbox')).toBeEnabled();
  await fireEvent.press(screen.getByText('Chưa có lịch sử để tránh lặp.'));
  expect(press).toHaveBeenCalledTimes(1);
});
test('advanced disclosure keeps the current temperature and uses explicit radio choices', async () => {
  const change = jest.fn();
  await render(<PreferenceAdvancedPanel value="cold" onChange={change} />);
  expect(screen.getByText('Nhiệt độ · Lạnh')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Tùy chọn nâng cao' }));
  expect(screen.getByRole('radio', { name: 'Lạnh' })).toBeChecked();
  await fireEvent.press(screen.getByRole('radio', { name: 'Nóng' }));
  expect(change).toHaveBeenCalledWith('hot');
});
test('dirty preference Back opens the actual discard dialog with two choices', async () => {
  await render(<DishSetupFlow gateway={createDishSetupPreview('default', { room, preferences: emptyPreferences() })} onExit={jest.fn()} initialStage="preferences" />);
  await screen.findByText('Loại món');
  await fireEvent.press(screen.getByText('Cơm'));
  await fireEvent.press(screen.getByLabelText('Quay lại'));
  expect(screen.getByRole('header', { name: 'Bỏ thay đổi khẩu vị?' })).toBeOnTheScreen();
  expect(screen.getByText('Bỏ thay đổi')).toBeOnTheScreen();
  expect(screen.getByText('Tiếp tục chọn')).toBeOnTheScreen();
});
test('lost cancellation acknowledgement replays the same intent and never cancels twice', async () => {
  const gateway = createDishSetupPreview('default', { room, preferences: emptyPreferences() });
  const original = gateway.write;
  let lost = false;
  const write = jest.spyOn(gateway, 'write').mockImplementation(async intent => {
    const result = await original(intent);
    if (intent.kind === 'cancel' && !lost) { lost = true; return { ok: false, code: 'UNKNOWN' }; }
    return result;
  });
  const { result } = await renderHook(() => useDishSetupFlow(gateway));
  await waitFor(() => expect(result.current.data).toBeDefined());
  await act(async () => result.current.cancelRoom());
  expect(result.current.phase).toBe('unknown');
  await act(async () => result.current.retry());
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[0]![0]).toEqual(write.mock.calls[1]![0]);
  expect(result.current.data?.room).toMatchObject({ state: 'CLOSED', version: 2 });
  expect(result.current.data?.closedReason).toBe('cancelled');
});
