import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { DishSetupFlow } from '../../src/features/context/screens/DishSetupFlow';
import { createDishSetupPreview } from '../fixtures/setup/dishSetupPreview';

// Members join an existing room and skip room settings: /room/setup?roomId=…&stage=preferences.
async function openAsMember() {
  const gateway = createDishSetupPreview('member');
  const write = jest.spyOn(gateway, 'write');
  const onExit = jest.fn(), onLobby = jest.fn();
  await render(<DishSetupFlow gateway={gateway} initialStage="preferences" onExit={onExit} onLobby={onLobby} />);
  await screen.findByText('Loại món');
  return { write, onExit, onLobby };
}

test('member starts on preferences, saves once and reaches the lobby without touching room settings', async () => {
  const { write, onLobby } = await openAsMember();
  expect(screen.queryByText('Buổi ăn')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Cơm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng chờ →' }));
  await screen.findByText('Đã lưu khẩu vị');
  expect(write).toHaveBeenCalledTimes(1);
  expect(write.mock.calls[0]![0]).toMatchObject({ kind: 'preferences' });
  expect(screen.queryByRole('button', { name: 'Sửa thiết lập' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Hủy phòng' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Mở phòng chờ' }));
  expect(onLobby).toHaveBeenCalledWith(expect.objectContaining({ id: 'ui-room', code: 'MCK234' }));
});

test('member leaving the first preferences pass exits instead of showing room settings', async () => {
  const { write, onExit } = await openAsMember();
  await fireEvent.press(screen.getByLabelText('Quay lại'));
  await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Buổi ăn')).toBeNull();
  expect(write).not.toHaveBeenCalled();
});

test('member with unsaved choices confirms discarding before leaving', async () => {
  const { onExit } = await openAsMember();
  await fireEvent.press(screen.getByRole('button', { name: 'Cơm' }));
  await fireEvent.press(screen.getByLabelText('Quay lại'));
  expect(await screen.findByText('Bỏ thay đổi khẩu vị?')).toBeOnTheScreen();
  expect(onExit).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Bỏ thay đổi'));
  await waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Buổi ăn')).toBeNull();
});
