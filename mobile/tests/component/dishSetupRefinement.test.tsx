import { useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { DishSetupCasePicker } from '../fixtures/setup/DishSetupCasePicker';
import { createDishSetupPreview } from '../fixtures/setup/dishSetupPreview';
import { SetupConfirmDialog } from '../../src/features/context/components/SetupConfirmDialog';
import { DishSetupFlow } from '../../src/features/context/screens/DishSetupFlow';
import { emptyPreferences, initialSetupDraft } from '../../src/features/context/services/dishSetup';
import { PreferenceAdvancedPanel } from '../../src/features/preferences/components/PreferenceAdvancedPanel';
import { isAnything, setFlavorDetail } from '../../src/features/preferences/services/dishPreferences';
import type { FlavorProfile } from '../../src/data/api/contracts';

const clock = () => Date.parse('2026-11-02T21:45:00+07:00');
test('meal manual override survives rendering and Now recomputes it', async () => {
  await render(<DishSetupFlow gateway={createDishSetupPreview('default', { settings: initialSetupDraft(clock()) }, clock())} onExit={jest.fn()} now={clock} />);
  await screen.findByText('Buổi ăn');
  await fireEvent.press(screen.getByRole('button', { name: 'Ăn sáng' }));
  expect(screen.getByRole('button', { name: 'Ăn sáng', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Ăn ngay' }));
  expect(screen.getByRole('button', { name: 'Ăn tối', selected: true })).toBeOnTheScreen();
});

test('opening schedule starts fifteen minutes ahead and displays a separate edit action', async () => {
  await render(<DishSetupFlow gateway={createDishSetupPreview('default', undefined, clock())} onExit={jest.fn()} now={clock} />);
  await screen.findByText('Buổi ăn');
  await fireEvent.press(screen.getByRole('button', { name: 'Hẹn giờ' }));
  expect(await screen.findByText('Xác nhận · 22:00')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Xác nhận · 22:00'));
  expect(screen.getByText('02/11/2026 · 22:00')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sửa thời gian' })).toBeOnTheScreen();
});

test('changing meal on the form moves an expired meal time to tomorrow', async () => {
  await render(<DishSetupFlow gateway={createDishSetupPreview('default', { settings: { timeMode: 'scheduled', desiredAt: '2026-11-02T22:00:00+07:00' } }, clock())} onExit={jest.fn()} now={clock} />);
  await screen.findByText('Buổi ăn');
  await fireEvent.press(screen.getByRole('button', { name: 'Ăn trưa' }));
  expect(screen.getByText('03/11/2026 · 12:00')).toBeOnTheScreen();
});

test('QA picker starts collapsed, limits rows, searches only the active screen and hides after completion', async () => {
  const select = jest.fn();
  const view = await render(<DishSetupCasePicker stage="setup" selectedId="R01" locked={false} onSelect={select} />);
  expect(screen.queryByText('Thiết lập ban đầu')).toBeNull();
  await fireEvent.press(screen.getByText('Tình huống kiểm thử'));
  expect(screen.getAllByRole('button').filter(button => /^R\d/.test(button.props.accessibilityLabel ?? ''))).toHaveLength(6);
  await fireEvent.changeText(screen.getByLabelText('Tìm tình huống kiểm thử'), 'P02');
  expect(screen.queryByText('Một khẩu vị')).toBeNull();
  await view.rerender(<DishSetupCasePicker stage="preferences" selectedId="P01" locked={false} onSelect={select} />);
  await fireEvent.press(screen.getByRole('button', { name: 'P02 · Một khẩu vị' }));
  expect(select).toHaveBeenCalledWith('P02');
  await view.rerender(<DishSetupCasePicker stage="complete" selectedId="P02" locked={false} onSelect={select} />);
  expect(screen.queryByText('Tình huống kiểm thử')).toBeNull();
});

test('advanced flavor controls include sweetness, preserve other flavors and distinguish unknown from absent', async () => {
  function Harness() {
    const [flavor, setFlavor] = useState<FlavorProfile>(() => setFlavorDetail(undefined, 'spicy', 'high'));
    return <PreferenceAdvancedPanel flavor={flavor} onFlavorChange={setFlavor} onChange={jest.fn()} />;
  }
  await render(<Harness />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tùy chọn nâng cao' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Chỉnh vị ngọt' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Ngọt: Vừa' }));
  expect(screen.getByRole('radio', { name: 'Ngọt: Vừa' })).toBeChecked();
  await fireEvent.press(screen.getByRole('button', { name: 'Chỉnh vị cay' }));
  expect(screen.getByRole('radio', { name: 'Cay: Đậm' })).toBeChecked();
  const unknown = setFlavorDetail(undefined, 'sweet', 'any'), absent = setFlavorDetail(unknown, 'sweet', 'none');
  expect(isAnything({ ...emptyPreferences(true), flavor: unknown })).toBe(true);
  expect(isAnything({ ...emptyPreferences(true), flavor: absent })).toBe(false);
  expect(absent.sweet).toEqual({ present: false, intensity: 'none' });
  expect(setFlavorDetail(absent, 'sweet', 'present').sweet).toEqual({ present: true, intensity: 'unknown' });
});

test('confirmation animates the backdrop separately and finishes closing before invoking an action once', async () => {
  const starts: ((result: { finished: boolean }) => void)[] = [];
  const parallel = jest.spyOn(Animated, 'parallel').mockImplementation(() => ({ start: callback => { if (callback) starts.push(callback); }, stop: jest.fn(), reset: jest.fn() }));
  const stay = jest.fn();
  try {
    await render(<SetupConfirmDialog title="Hủy phòng mẫu?" message="Xác nhận" confirmLabel="Hủy phòng mẫu" continueLabel="Ở lại phòng" onConfirm={jest.fn()} onContinue={stay} />);
    expect(screen.getByTestId('sheet-dialog').props.animationType).toBe('none');
    const backdrop = StyleSheet.flatten(screen.getByTestId('dialog-backdrop').props.style), panel = StyleSheet.flatten(screen.getByTestId('dialog-panel').props.style);
    expect(backdrop.opacity).toBeDefined(); expect(backdrop.transform).toBeUndefined(); expect(panel.transform).toHaveLength(1);
    await fireEvent.press(screen.getByText('Ở lại phòng'));
    await fireEvent.press(screen.getByText('Ở lại phòng'));
    expect(stay).not.toHaveBeenCalled(); expect(starts).toHaveLength(1);
    await act(async () => { starts[0]!({ finished: true }); starts[0]!({ finished: true }); });
    expect(stay).toHaveBeenCalledTimes(1);
  } finally { parallel.mockRestore(); }
});

test('host completion offers cancellation and Home is shown only after confirmed closure', async () => {
  const gateway = createDishSetupPreview('default', { room: { id: 'ui-room', code: 'MCK234', version: 1, state: 'LOBBY' }, preferences: emptyPreferences() }), exit = jest.fn();
  await render(<DishSetupFlow gateway={gateway} initialStage="preferences" onExit={exit} />);
  await screen.findByText('Loại món');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu thay đổi →' }));
  await screen.findByRole('button', { name: 'Hủy phòng' });
  expect(screen.queryByRole('button', { name: 'Về trang chủ' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Hủy phòng' }));
  expect(exit).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Xác nhận hủy phòng'));
  await waitFor(() => expect(screen.getByText('Phòng đã bị hủy')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Về trang chủ' }));
  expect(exit).toHaveBeenCalledTimes(1);
});
