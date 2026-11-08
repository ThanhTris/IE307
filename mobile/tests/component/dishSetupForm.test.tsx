import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DishSetupScreen } from '../../src/features/context/screens/DishSetupScreen';
import { initialSetupDraft, setupValidation } from '../../src/features/context/services/dishSetup';

function Form() {
  const [draft, change] = useState(initialSetupDraft);
  return <DishSetupScreen draft={draft} onChange={patch => change(value => ({ ...value, ...patch }))} onBack={() => {}} onContinue={() => {}} />;
}
test('dish count boundaries are disabled and meal/budget selections preserve each other without GPS', async () => {
  await render(<Form />);
  for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByRole('button', { name: 'Giảm số món' }));
  expect(screen.getByRole('button', { name: 'Giảm số món' })).toBeDisabled();
  expect(screen.getByLabelText('10 món')).toBeOnTheScreen();
  for (let i = 0; i < 10; i++) await fireEvent.press(screen.getByRole('button', { name: 'Tăng số món' }));
  expect(screen.getByRole('button', { name: 'Tăng số món' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Ăn tối' }));
  await fireEvent.press(screen.getByRole('button', { name: '50–100K' }));
  expect(screen.getByRole('button', { name: 'Ăn tối' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByLabelText('20 món')).toBeOnTheScreen();
  expect(screen.queryByText('Điểm ăn chung')).toBeNull();
});
test.each([9, 21, 10.5, NaN])('invalid requested dish count %s is rejected, not silently clamped in intent', count => {
  expect(setupValidation({ ...initialSetupDraft(), dishCount: count }, Date.now())).toBeTruthy();
});
