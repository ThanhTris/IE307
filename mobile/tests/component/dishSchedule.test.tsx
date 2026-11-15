import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScheduleSheet } from '../../src/features/context/components/ScheduleSheet';
import { monthCells, ScheduleCalendar } from '../../src/features/context/components/ScheduleCalendar';
import { ScheduleWheel } from '../../src/features/context/components/ScheduleWheel';
import { formatSchedule, parseSchedule, scheduleParts } from '../../src/features/context/services/dishSetup';

test('schedule rejects impossible dates and preserves UTC+7 without seconds in the UI', () => {
  expect(parseSchedule('2028-02-30', '18', '30')).toBeNull();
  expect(parseSchedule('2028-02-29', '24', '00')).toBeNull();
  expect(parseSchedule('2028-02-29', '18', '60')).toBeNull();
  const iso = parseSchedule('2028-02-29', '18', '30')!;
  expect(iso).toBe('2028-02-29T11:30:00.000Z');
  expect(scheduleParts(iso)).toEqual({ date: '2028-02-29', hour: '18', minute: '30' });
  expect(formatSchedule(iso)).toBe('29/02/2028 · 18:30');
});
test('past time stays open and cancelling the picker does not save', async () => {
  const confirm = jest.fn(), close = jest.fn();
  await render(<ScheduleSheet initial="2028-02-29T11:30:00.000Z" now={() => Date.parse('2028-03-01T00:00:00Z')} onConfirm={confirm} onClose={close} />);
  await fireEvent.press(screen.getByText('Xác nhận · 18:30'));
  expect(confirm).not.toHaveBeenCalled();
  expect(screen.getByText('Ngày và giờ phải hợp lệ, ở tương lai (UTC+7).')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Hủy'));
  expect(close).toHaveBeenCalledTimes(1);
});
test('calendar aligns Monday-first weeks and stages selection until explicit confirmation', async () => {
  const cells = monthCells('2028-02');
  expect(cells[0]).toBeNull();
  expect(cells[1]).toBe('2028-02-01');
  expect(cells.filter(Boolean)).toHaveLength(29);
  expect(cells.length % 7).toBe(0);
  const confirm = jest.fn();
  await render(<ScheduleCalendar initial="2028-02-01" today="2028-02-01" onConfirm={confirm} onBack={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Ngày 2028-02-29' }));
  expect(confirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Chọn 29/02'));
  expect(confirm).toHaveBeenCalledWith('2028-02-29');
});
test('native wheel supports scroll and accessible increment and loops endlessly (23 flows into 00)', async () => {
  const change = jest.fn();
  await render(<ScheduleWheel label="Giờ" value={18} count={24} onChange={change} />);
  await fireEvent(screen.getByRole('adjustable', { name: 'Giờ' }), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(change).toHaveBeenLastCalledWith(19);
  await fireEvent.scroll(screen.getByTestId('schedule-wheel-24'), { nativeEvent: { contentOffset: { x: 0, y: 10 * 48 } } });
  expect(change).toHaveBeenLastCalledWith(10);
  await fireEvent.scroll(screen.getByTestId('schedule-wheel-24'), { nativeEvent: { contentOffset: { x: 0, y: 99 * 48 } } });
  expect(change).toHaveBeenLastCalledWith(3);
});
