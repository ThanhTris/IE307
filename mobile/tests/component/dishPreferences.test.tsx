import { breakLabel } from '../../src/features/context/components/SetupChoice';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DishPreferencesScreen } from '../../src/features/preferences/screens/DishPreferencesScreen';
import { dishSetupCatalogue } from '../../src/features/context/services/dishSetupCatalogue';
import { emptyPreferences } from '../../src/features/context/services/dishSetup';

function Preferences() {
  const [value, change] = useState(() => emptyPreferences(true));
  return <DishPreferencesScreen preferences={value} catalogue={dishSetupCatalogue} onChange={change} onSave={() => {}} onBack={() => {}} />;
}
test('Anything clears soft selections while consent stays independent; multi-selection is reversible', async () => {
  await render(<Preferences />);
  await fireEvent.press(screen.getByRole('button', { name: 'Cơm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Miền Bắc' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cay' }));
  expect(screen.getByRole('checkbox', { name: 'Ăn gì cũng được' })).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Cơm' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Ăn gì cũng được' }));
  expect(screen.getByRole('checkbox', { name: 'Ăn gì cũng được' })).toBeChecked();
  expect(screen.queryByRole('checkbox', { name: 'Cho phép lưu lịch sử cá nhân cho tài khoản này' })).toBeNull();
});
test('main meals show the six dish groups, regions and six flavours', async () => {
  await render(<Preferences />);
  for (const name of ['Cơm', 'Bún / Phở', 'Mì / Miến / Hủ tiếu', 'Lẩu & Nướng', 'Bánh mì / Xôi', 'Cháo / Súp', 'Miền Bắc', 'Miền Trung', 'Miền Nam', 'Miền Tây', 'Cay', 'Chua / Chua cay', 'Ngọt', 'Mặn / Đậm đà', 'Thanh đạm', 'Béo / Ngậy']) {
    expect(screen.getByRole('button', { name })).toBeOnTheScreen();
  }
  expect(screen.queryByRole('button', { name: 'Chè & Kem' })).toBeNull();
});
test('"Ăn vặt" swaps the dish groups for the eight snack groups', async () => {
  await render(<DishPreferencesScreen preferences={emptyPreferences()} catalogue={dishSetupCatalogue} mealSlot="snack" onChange={jest.fn()} onBack={jest.fn()} onSave={jest.fn()} />);
  for (const name of ['Đồ chiên & Xiên que', 'Các loại bánh mặn', 'Món trộn & Cuốn', 'Ốc & Hải sản', 'Bánh ngọt', 'Chè & Kem', 'Trái cây & Đồ chua', 'Đồ ăn vặt khô']) {
    expect(screen.getByRole('button', { name })).toBeOnTheScreen();
  }
  expect(screen.queryByRole('button', { name: 'Cơm' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Miền Tây' })).toBeOnTheScreen();
});
test('Mặn / Đậm đà and Thanh đạm exclude each other; Béo / Ngậy toggles on its own', async () => {
  await render(<Preferences />);
  const selected = (name: string) => screen.getByRole('button', { name }).props.accessibilityState.selected;
  await fireEvent.press(screen.getByRole('button', { name: 'Mặn / Đậm đà' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Thanh đạm' }));
  expect(selected('Thanh đạm')).toBe(true);
  expect(selected('Mặn / Đậm đà')).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Béo / Ngậy' }));
  expect(selected('Béo / Ngậy')).toBe(true);
  expect(selected('Thanh đạm')).toBe(true);
});
test('unknown taxonomy is disabled; skip is explicit and does not expose another member', async () => {
  const save = jest.fn();
  await render(<DishPreferencesScreen preferences={emptyPreferences()} catalogue={{ categories: [{ id: 'unknown', label: 'Chưa phân loại', unknown: true }], cuisines: [] }} onChange={jest.fn()} onBack={jest.fn()} onSave={save} />);
  expect(screen.getByRole('button', { name: 'Chưa phân loại · Chưa rõ' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Bỏ qua' }));
  expect(save).toHaveBeenCalledWith(true);
  expect(screen.queryByText(/Lựa chọn này áp dụng/)).toBeNull();
});

test('long dish-group labels break at their last separator', () => {
  const plain = (label: string) => breakLabel(label).replace(/\u00A0/g, ' ');
  expect(plain('Mì / Miến / Hủ tiếu')).toBe('Mì / Miến\nHủ tiếu');
  expect(plain('Đồ chiên & Xiên que')).toBe('Đồ chiên &\nXiên que');
  expect(plain('Trái cây & Đồ chua')).toBe('Trái cây &\nĐồ chua');
  expect(plain('Cơm')).toBe('Cơm');
  expect(plain('Bún / Phở')).toBe('Bún / Phở');
  // The two words of "Hủ tiếu" can never be split across lines.
  expect(breakLabel('Mì / Miến / Hủ tiếu')).toContain('Hủ\u00A0tiếu');
});
