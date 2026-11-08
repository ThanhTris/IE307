import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DishPreferencesScreen } from '../../src/features/preferences/screens/DishPreferencesScreen';
import { dishSetupCatalogue } from '../../src/bootstrap/dishSetupCatalogue';
import { emptyPreferences } from '../../src/features/context/services/dishSetup';

function Preferences() {
  const [value, change] = useState(() => emptyPreferences(true));
  return <DishPreferencesScreen preferences={value} catalogue={dishSetupCatalogue} onChange={change} onSave={() => {}} onBack={() => {}} />;
}
test('Anything clears soft selections while consent stays independent; multi-selection is reversible', async () => {
  await render(<Preferences />);
  await fireEvent.press(screen.getByRole('button', { name: 'Cơm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Việt' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cay' }));
  expect(screen.getByRole('checkbox', { name: 'Ăn gì cũng được' })).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Cơm' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Ăn gì cũng được' }));
  expect(screen.getByRole('checkbox', { name: 'Ăn gì cũng được' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Cho phép lưu lịch sử cá nhân cho tài khoản này' })).toBeChecked();
});
test('unknown taxonomy is disabled; skip is explicit and does not expose another member', async () => {
  const save = jest.fn();
  await render(<DishPreferencesScreen preferences={emptyPreferences()} catalogue={{ categories: [{ id: 'unknown', label: 'Chưa phân loại', unknown: true }], cuisines: [] }} onChange={jest.fn()} onBack={jest.fn()} onSave={save} />);
  expect(screen.getByRole('button', { name: 'Chưa phân loại · Chưa rõ' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Bỏ qua' }));
  expect(save).toHaveBeenCalledWith(true);
  expect(screen.getByText('Lựa chọn này áp dụng cho lịch sử cá nhân của tài khoản. Lưu lịch sử nhóm là quyền riêng, không bị thay đổi ở đây. Khẩu vị chỉ áp dụng cho phòng này.')).toBeOnTheScreen();
});
