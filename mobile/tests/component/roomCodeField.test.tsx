import { useState } from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RoomCodeField } from '../../src/features/rooms/components/RoomCodeField';
import { lightColors } from '../../src/shared/theme/tokens';

function Harness({ initial = '', disabled = false }: { initial?: string; disabled?: boolean }) {
  const [value, setValue] = useState(initial);
  return <RoomCodeField value={value} onChange={setValue} disabled={disabled} />;
}
const cell = (index: number) => screen.getByLabelText(`Ký tự ${index + 1} của mã phòng`);
const code = () => Array.from({ length: 6 }, (_, index) => cell(index).props.value).join('');
beforeEach(() => { jest.replaceProperty(Platform, 'OS', 'android'); });
afterEach(() => { jest.restoreAllMocks(); });

test('native cells expose a visible caret and highlight the focused cell without duplicate text', async () => {
  await render(<Harness />);
  await fireEvent(cell(0), 'focus');
  expect(cell(0)).toHaveStyle({ borderColor: lightColors.primary, backgroundColor: lightColors.warm });
  expect(cell(0).props.caretHidden).toBe(false);
  await fireEvent.changeText(cell(0), 'g');
  await fireEvent(cell(1), 'focus');
  expect(code()).toBe('G');
  expect(cell(1)).toHaveStyle({ borderColor: lightColors.primary });
  expect(screen.queryByText('G')).toBeNull(); // Only the native TextInput paints the character.
  expect(cell(0).props.autoCorrect).toBe(false);
  expect(cell(0).props.keyboardType).toBe('visible-password');
});

test('pasting a whole code fills all cells once, including when replacing from a middle cell', async () => {
  await render(<Harness initial="XYZ789" />);
  await fireEvent.changeText(cell(2), 'gcd234');
  expect(code()).toBe('GCD234');
  expect(screen.queryByText('GCD234')).toBeNull();
  for (let index = 0; index < 6; index++) expect(cell(index).props.value).toHaveLength(1);
});

test('individual editing and deleting retain the rest of the code', async () => {
  await render(<Harness initial="GCD234" />);
  await fireEvent.changeText(cell(2), 'x');
  expect(code()).toBe('GCX234');
  await fireEvent.changeText(cell(2), '');
  expect(code()).toBe('GC234');
});

test('Backspace on the next empty cell deletes the previous character', async () => {
  await render(<Harness initial="ABC" />);
  await fireEvent(cell(3), 'keyPress', { nativeEvent: { key: 'Backspace' } });
  expect(code()).toBe('AB');
});

test('disabled cells cannot edit a frozen join intent', async () => {
  await render(<Harness initial="GCD234" disabled />);
  await fireEvent.changeText(cell(0), 'XYZ789');
  await fireEvent(cell(5), 'keyPress', { nativeEvent: { key: 'Backspace' } });
  expect(code()).toBe('GCD234');
  for (let index = 0; index < 6; index++) expect(cell(index).props.editable).toBe(false);
});
