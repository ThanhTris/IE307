import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScheduleSheet } from '../../src/features/context/components/ScheduleSheet';
import { parseSchedule, scheduleParts } from '../../src/features/context/services/dishSetup';

test('schedule rejects impossible dates and preserves UTC+7 regardless of local timezone', () => {
  expect(parseSchedule('2028-02-30', '18', '30')).toBeNull();
  expect(parseSchedule('2028-02-29', '24', '00')).toBeNull();
  expect(parseSchedule('2028-02-29', '18', '60')).toBeNull();
  const iso = parseSchedule('2028-02-29', '18', '30')!;
  expect(iso).toBe('2028-02-29T11:30:00.000Z');
  expect(scheduleParts(iso)).toEqual({ date: '2028-02-29', hour: '18', minute: '30' });
});
test('picker edits are staged until confirmation; past time stays open and cancel does not save', async () => {
  const confirm = jest.fn(), close = jest.fn();
  await render(<ScheduleSheet initial="2028-02-29T11:30:00.000Z" now={() => Date.parse('2028-03-01T00:00:00Z')} onConfirm={confirm} onClose={close} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận giờ hẹn' }));
  expect(confirm).not.toHaveBeenCalled();
  expect(screen.getByText('Ngày và giờ phải hợp lệ, ở tương lai (UTC+7).')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Ngày hẹn'), '2028-03-02');
  expect(confirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận giờ hẹn' }));
  expect(confirm).toHaveBeenCalledWith('2028-03-02T11:30:00.000Z');
  await fireEvent.press(screen.getByRole('button', { name: 'Hủy hẹn giờ' }));
  expect(close).toHaveBeenCalledTimes(1);
});
