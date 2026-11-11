import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { scoredResultFixture } from '../fixtures/result/dishResultFixtures';
import { DishResultScreen } from '../../src/features/result/screens/DishResultScreen';
import { getThemeColors } from '../../src/shared/theme/tokens';

test.each(['one', 'two', 'top3', 'tie-two', 'tie-first', 'tie-last', 'tie-all'] as const)('podium %s uses one pedestal per rank and preserves the server result', async id => {
  const fixture = scoredResultFixture(id);
  const result = id === 'tie-all'
    ? {
        ...fixture,
        winner: fixture.topDishes[2]!.dish,
        topDishes: fixture.topDishes.map((entry, index) => ({ ...entry, isWinner: index === 2 })),
      }
    : fixture;
  const before = JSON.stringify(result);
  await render(<DishResultScreen result={result} onHome={jest.fn()} onNewSession={jest.fn()} members={[{ id: 'own', label: 'Bạn' }]} />);
  const ranks = new Set(result.topDishes.map(entry => entry.rank));
  expect(screen.getAllByTestId(/^podium-bar-/)).toHaveLength(3);
  const slots = screen.getAllByTestId(/^podium-slot-/);
  expect(slots.map(slot => slot.props.testID)).toEqual(['podium-slot-2', 'podium-slot-1', 'podium-slot-3']);
  const columnWidth = StyleSheet.flatten(slots[1]!.props.style).width;
  for (const [index, rank] of [2, 1, 3].entries()) {
    expect(StyleSheet.flatten(slots[index]!.props.style).width).toBe(columnWidth);
    const slot = within(slots[index]!);
    const pedestal = slot.getByTestId(`podium-bar-${rank}`);
    expect(pedestal).toBeOnTheScreen();
    if (ranks.has(rank)) {
      const dishes = slot.getByTestId(`podium-dishes-${rank}`);
      const rankedDishes = result.topDishes.filter(entry => entry.rank === rank);
      const scoreLabel = `${rankedDishes[0]!.score} điểm`;
      expect(within(pedestal!).getAllByText(scoreLabel)).toHaveLength(1);
      expect(within(dishes).queryByText(scoreLabel)).toBeNull();
      const rows = within(dishes).getAllByTestId(`podium-dish-row-${rank}`);
      const rowSizes = rows.map(row => {
        const rowStyle = StyleSheet.flatten(row.props.style);
        const items = within(row).getAllByTestId(/^podium-\d/);
        const occupiedWidth = items.reduce((sum, item) => sum + StyleSheet.flatten(item.props.style).width, 0);
        expect(rowStyle.flexDirection).toBe('row');
        expect(rowStyle.justifyContent).toBe('center');
        expect(occupiedWidth + (items.length - 1) * rowStyle.gap).toBeLessThanOrEqual(columnWidth);
        return items.length;
      });
      expect(rowSizes).toEqual(rankedDishes.length === 3 ? [1, 2] : [rankedDishes.length]);
      expect(within(dishes).getAllByTestId(/^podium-\d/).map(dish => dish.props.testID)).toEqual(
        rankedDishes.map(entry => `podium-${entry.dish.roundDishId}`),
      );
    } else {
      expect(within(pedestal).getByText(String(rank))).toBeOnTheScreen();
      expect(pedestal.props.accessibilityLabel).toBe(`Hạng ${rank}`);
      expect(slot.queryByTestId(`podium-dishes-${rank}`)).toBeNull();
    }
  }
  for (const entry of result.topDishes) {
    const group = within(screen.getByTestId(`podium-group-${entry.rank}`));
    expect(group.getByText(entry.dish.name)).toBeOnTheScreen();
    const label = `${entry.dish.name} · Chưa có ảnh${entry.isWinner ? ' · Món chiến thắng' : ''}`;
    const artwork = StyleSheet.flatten(screen.getByLabelText(label).props.style);
    expect(artwork.borderColor).toBe(entry.isWinner ? getThemeColors('light').primary : getThemeColors('light').line);
    if (result.topDishes.filter(dish => dish.rank === entry.rank).length > 1) {
      expect(artwork.width).toBeLessThan(columnWidth / 2);
    }
  }
  expect(screen.queryByText('Món được chọn')).toBeNull();
  expect(screen.getByText('Cùng ăn')).toBeOnTheScreen();
  expect(screen.getAllByText('Chưa có ảnh')).toHaveLength(result.topDishes.length);
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
