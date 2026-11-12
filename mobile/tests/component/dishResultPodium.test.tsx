import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { scoredResultFixture } from '../fixtures/result/dishResultFixtures';
import { DishResultScreen } from '../../src/features/result/screens/DishResultScreen';
import { getThemeColors } from '../../src/shared/theme/tokens';

test.each(['one', 'two', 'top3', 'tie-two', 'tie-first', 'tie-last', 'tie-all'] as const)('podium %s shows one dish on each pedestal, in server order', async id => {
  const result = scoredResultFixture(id);
  const before = JSON.stringify(result);
  await render(<DishResultScreen result={result} onHome={jest.fn()} onNewSession={jest.fn()} members={[{ id: 'own', label: 'Bạn' }]} />);
  expect(screen.getAllByTestId(/^podium-bar-/)).toHaveLength(3);
  const slots = screen.getAllByTestId(/^podium-slot-/);
  expect(slots.map(slot => slot.props.testID)).toEqual(['podium-slot-2', 'podium-slot-1', 'podium-slot-3']);
  const columnWidth = StyleSheet.flatten(slots[1]!.props.style).width;
  for (const [index, position] of [2, 1, 3].entries()) {
    expect(StyleSheet.flatten(slots[index]!.props.style).width).toBe(columnWidth);
    const slot = within(slots[index]!);
    const pedestal = slot.getByTestId(`podium-bar-${position}`);
    const entry = result.topDishes[position - 1];
    if (entry) {
      // The position follows the server order even when two dishes share a score.
      const dishes = within(slot.getByTestId(`podium-dishes-${position}`));
      expect(dishes.getAllByTestId(/^podium-\d/).map(dish => dish.props.testID)).toEqual([`podium-${entry.dish.roundDishId}`]);
      expect(dishes.getByText(entry.dish.name)).toBeOnTheScreen();
      expect(within(pedestal).getByText(`${entry.score} điểm`)).toBeOnTheScreen();
      expect(within(pedestal).getByText(String(position))).toBeOnTheScreen();
      const label = `${entry.dish.name} · Chưa có ảnh${entry.isWinner ? ' · Món chiến thắng' : ''}`;
      const artwork = StyleSheet.flatten(screen.getByLabelText(label).props.style);
      expect(artwork.borderColor).toBe(entry.isWinner ? getThemeColors('light').primary : getThemeColors('light').line);
    } else {
      expect(within(pedestal).getByText(String(position))).toBeOnTheScreen();
      expect(pedestal.props.accessibilityLabel).toBe(`Hạng ${position}`);
      expect(slot.queryByTestId(`podium-dishes-${position}`)).toBeNull();
    }
  }
  const tied = result.topDishes.some((entry, index) => index > 0 && entry.score === result.topDishes[index - 1]!.score);
  expect(screen.queryByText(/Đồng điểm: xếp theo/) !== null).toBe(tied);
  expect(screen.queryByText('Món được chọn')).toBeNull();
  expect(screen.getByText('Cùng ăn')).toBeOnTheScreen();
  expect(screen.getAllByLabelText(/ · Chưa có ảnh/)).toHaveLength(result.topDishes.length);
  expect(JSON.stringify(result)).toBe(before);
});

test.each(['tie-first', 'tie-last', 'tie-all'] as const)('podium %s reserves equal label heights when one dish wraps', async id => {
  const result = scoredResultFixture(id);
  await render(<DishResultScreen result={result} onHome={jest.fn()} onNewSession={jest.fn()} />);
  await fireEvent(screen.getByText(result.topDishes[0]!.dish.name), 'layout', { nativeEvent: { layout: { height: 42 } } });
  await fireEvent(screen.getByText(result.topDishes[1]!.dish.name), 'layout', { nativeEvent: { layout: { height: 21 } } });
  for (const entry of result.topDishes) {
    expect(StyleSheet.flatten(screen.getByTestId(`podium-name-${entry.dish.roundDishId}`).props.style).minHeight).toBe(42);
    expect(screen.getByText(entry.dish.name).props.numberOfLines).toBeUndefined();
  }
});
