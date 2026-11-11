import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CreateRoomScreen } from '../../src/features/rooms/screens/CreateRoomScreen';

test('entry is honest about a missing setup artifact and never asks for GPS or creates a room', async () => {
  const onBack = jest.fn();
  await render(<CreateRoomScreen displayName="Minh" onBack={onBack} />);
  expect(screen.getByText('Chủ phòng: Minh')).toBeOnTheScreen();
  expect(screen.getByText('Thiết lập phòng đang được cập nhật')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Tiếp tục thiết lập' })).toBeDisabled();
  expect(screen.queryByLabelText('Giờ hẹn (UTC+7)')).toBeNull();
  expect(screen.queryByText('Điểm ăn chung')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('received setup callback is locked while opening, fails visibly and retries without losing summary', async () => {
  let resolve!: (value: boolean) => void;
  const pending = new Promise<boolean>(done => { resolve = done; });
  const open = jest.fn().mockReturnValueOnce(pending).mockResolvedValue(true), back = jest.fn();
  await render(<CreateRoomScreen displayName="Minh" summary={{ meal: 'Bữa trưa', dishCount: 15 }} onOpenSetup={open} onBack={back} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục thiết lập' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục thiết lập' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(open).toHaveBeenCalledTimes(1); expect(back).not.toHaveBeenCalled();
  await act(async () => resolve(false));
  expect(screen.getByText('Chưa mở được thiết lập')).toBeOnTheScreen();
  expect(screen.getByText('Bữa trưa · 15 món')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử mở lại thiết lập' }));
  expect(open).toHaveBeenCalledTimes(2);
});
