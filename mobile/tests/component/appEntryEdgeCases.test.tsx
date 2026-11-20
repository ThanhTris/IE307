import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { getThemeColors } from '../../src/shared/theme/tokens';
import { AppButton, Chip } from '../../src/shared/ui';
import { NotFoundScreen } from '../../src/features/home/screens/NotFoundScreen';
import { DishPreferencesScreen } from '../../src/features/preferences/screens/DishPreferencesScreen';
import { dishSetupCatalogue } from '../../src/features/context/services/dishSetupCatalogue';
import { emptyPreferences } from '../../src/features/context/services/dishSetup';

const colors = getThemeColors('light');

test('TC-ENTRY-006 an unknown route shows a not-found page with a way back to the start', async () => {
  const onHome = jest.fn();
  await render(<NotFoundScreen onHome={onHome} />);
  expect(screen.getByRole('header', { name: 'Không tìm thấy trang' })).toBeOnTheScreen();
  expect(screen.getByText('Đường dẫn này chưa có trong ứng dụng.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Về trang đầu' }));
  expect(onHome).toHaveBeenCalledTimes(1);
}, 30000); // the first render in a cold Jest cache is slow on Windows

test('TC-UI-004 shared buttons and chips keep at least a 48dp touch target', async () => {
  await render(<><AppButton label="Tạo phòng" onPress={jest.fn()} colors={colors} /><Chip label="Cơm" onPress={jest.fn()} colors={colors} /></>);
  for (const name of ['Tạo phòng', 'Cơm']) {
    const style = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  }
});

test('TC-PREF-010 saving preferences works without touching any advanced ranking choice', async () => {
  const save = jest.fn();
  await render(<DishPreferencesScreen preferences={emptyPreferences()} catalogue={dishSetupCatalogue} onChange={jest.fn()} onBack={jest.fn()} onSave={save} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng chờ →' }));
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(false);
});
