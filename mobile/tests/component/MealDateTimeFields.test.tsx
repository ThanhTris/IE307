import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MealDateTimeFields } from '../../src/features/context/components/MealDateTimeFields';

const press = async (name: string) => { await fireEvent.press(screen.getByRole('button', { name })); };
function Fields({ date = '2030-10-15', today = '2030-10-15', disabled = false, onDate = jest.fn(), onTime = jest.fn() }) {
  const [selectedDate, setDate] = useState(date);
  const [time, setTime] = useState('19:30');
  return <MealDateTimeFields date={selectedDate} time={time} getToday={() => today} disabled={disabled}
    onDateChange={value => { setDate(value); onDate(value); }} onTimeChange={value => { setTime(value); onTime(value); }} />;
}

test('date and time are separate and tomorrow follows the provided server day across year end', async () => {
  const onDate = jest.fn(), onTime = jest.fn();
  await render(<Fields date="2030-12-31" today="2030-12-31" onDate={onDate} onTime={onTime} />);
  expect(screen.getByLabelText('Giờ ăn (UTC+7)').props.value).toBe('19:30');
  await press('Chọn ngày ăn'); await press('Ngày mai');
  expect(screen.getByRole('button', { name: 'Chọn ngày ăn' }).props.accessibilityValue.text).toBe('2031-01-01');
  expect(screen.getByLabelText('Giờ ăn (UTC+7)').props.value).toBe('19:30');
  expect(onDate).toHaveBeenLastCalledWith('2031-01-01'); expect(onTime).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Ngày ăn (YYYY-MM-DD)')).toBeNull();
});

test('day pages are navigable by buttons and closing the picker does not change the selection', async () => {
  const onDate = jest.fn();
  await render(<Fields onDate={onDate} />);
  await press('Chọn ngày ăn');
  expect(screen.getByRole('button', { name: '‹ 7 ngày trước' })).toBeDisabled();
  await press('7 ngày tiếp ›');
  expect(onDate).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Chọn ngày 2030-10-22' })).toBeEnabled();
  await press('Xong chọn ngày'); expect(onDate).not.toHaveBeenCalled();
  await press('Chọn ngày ăn'); await press('7 ngày tiếp ›'); await press('Chọn ngày 2030-10-23');
  expect(onDate).toHaveBeenCalledWith('2030-10-23');
});

test('previous page clamps to today so near future days remain selectable', async () => {
  const onDate = jest.fn();
  await render(<Fields date="2030-10-18" onDate={onDate} />);
  await press('Chọn ngày ăn'); await press('‹ 7 ngày trước');
  expect(screen.getByRole('button', { name: 'Chọn ngày 2030-10-15' })).toBeOnTheScreen();
  await press('Chọn ngày 2030-10-17'); expect(onDate).toHaveBeenCalledWith('2030-10-17');
});

test('partial manual date input never corrupts the independent time field', async () => {
  await render(<Fields />);
  await press('Chọn ngày ăn');
  await fireEvent.changeText(screen.getByLabelText('Ngày ăn (YYYY-MM-DD)'), '2030-');
  expect(screen.getByLabelText('Giờ ăn (UTC+7)').props.value).toBe('19:30');
  await fireEvent.changeText(screen.getByLabelText('Ngày ăn (YYYY-MM-DD)'), '2032-02-29');
  await press('Xong chọn ngày');
  await fireEvent.changeText(screen.getByLabelText('Giờ ăn (UTC+7)'), '07:05');
  expect(screen.getByRole('button', { name: 'Chọn ngày ăn' }).props.accessibilityValue.text).toBe('2032-02-29');
  expect(screen.getByLabelText('Giờ ăn (UTC+7)').props.value).toBe('07:05');
});

test('disabled context prevents opening the picker or editing time', async () => {
  const onDate = jest.fn();
  await render(<Fields disabled onDate={onDate} />);
  expect(screen.getByRole('button', { name: 'Chọn ngày ăn' })).toBeDisabled();
  expect(screen.getByLabelText('Giờ ăn (UTC+7)')).toBeDisabled();
  await press('Chọn ngày ăn');
  expect(screen.queryByText('Chọn ngày phù hợp')).toBeNull(); expect(onDate).not.toHaveBeenCalled();
});
