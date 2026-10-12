import { render, screen, userEvent } from '@testing-library/react-native';
import { getThemeColors } from '../../src/shared/theme/tokens';
import { AppButton, AvatarRow, Chip, ContextSummary, DishCard, FormField, RoomCode, StatusNotice } from '../../src/shared/ui';

const colors = getThemeColors('light');

test('shared controls expose labels, touch actions and selected state', async () => {
  const onPress = jest.fn();
  const onChip = jest.fn();
  const user = userEvent.setup();
  await render(<><AppButton label="Tạo phòng" onPress={onPress} colors={colors} /><Chip label="Món nước" selected onPress={onChip} colors={colors} /></>);
  await user.press(screen.getByRole('button', { name: 'Tạo phòng' }));
  await user.press(screen.getByRole('button', { name: 'Món nước' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onChip).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Món nước' }).props.accessibilityState.selected).toBe(true);
});

test('FormField reports errors and forwards editable input', async () => {
  const onChange = jest.fn();
  const user = userEvent.setup();
  await render(<FormField label="Mã phòng" value="" onChangeText={onChange} error="Mã chưa đủ 6 ký tự" colors={colors} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Mã chưa đủ 6 ký tự');
  await user.type(screen.getByLabelText('Mã phòng'), 'GCD234');
  expect(onChange).toHaveBeenCalled();
});

test('DishCard keeps vote buttons available and falls back when artwork is absent', async () => {
  const onVote = jest.fn();
  const user = userEvent.setup();
  await render(<DishCard dish={{ id: 'dish_1', name: 'Phở bò', tags: ['Món nước'], priceLabel: '~50k' }} onVote={onVote} colors={colors} />);
  expect(screen.getByLabelText('Ảnh dự phòng Phở bò')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Muốn ăn' }));
  expect(onVote).toHaveBeenCalledWith('WANT');
});

test('room/context/status/social components show fallback and state text', async () => {
  await render(<>
    <RoomCode code="GCD234" colors={colors} />
    <ContextSummary anchorName="Hồ Con Rùa" mealLabel="Bữa trưa" desiredAtLabel="12:00" radiusLabel="1 km" colors={colors} />
    <StatusNotice title="Đang chờ thành viên" message="Còn 1 người chưa sẵn sàng." tone="warning" colors={colors} />
    <AvatarRow items={[{ id: 'one', label: 'Minh', initial: 'M', status: 'online' }]} colors={colors} />
  </>);
  expect(screen.getByLabelText('Mã phòng GCD234')).toBeOnTheScreen();
  expect(screen.getByText('Hồ Con Rùa')).toBeOnTheScreen();
  expect(screen.getByText('Còn 1 người chưa sẵn sàng.')).toBeOnTheScreen();
  expect(screen.getByText('Minh')).toBeOnTheScreen();
});
