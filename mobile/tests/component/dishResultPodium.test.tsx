import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { scoredResultFixture } from '../../src/bootstrap/dishResultFixtures';
import { DishResultScreen } from '../../src/features/result/screens/DishResultScreen';
import { getThemeColors } from '../../src/shared/theme/tokens';

test.each(['one', 'two', 'top3', 'tie-two', 'tie-first', 'tie-last', 'tie-all'] as const)('podium %s preserves supplied scores and equal-rank heights without truncating labels', async id => {
  const result = scoredResultFixture(id), before = JSON.stringify(result);
  await render(<DishResultScreen result={result} onHome={jest.fn()} onNewSession={jest.fn()} members={[{ id: 'own', label: 'Bạn' }]} />);
  const heights = new Map<number, unknown>();
  for (const entry of result.topDishes) {
    const bar = screen.getByTestId(`podium-bar-${entry.dish.roundDishId}`);
    const height = bar.props.style.flat().find((value: { height?: number }) => value.height)?.height;
    if (heights.has(entry.rank)) expect(height).toBe(heights.get(entry.rank)); else heights.set(entry.rank, height);
    expect(screen.getByText(entry.dish.name)).toBeOnTheScreen();
    const artwork = StyleSheet.flatten(screen.getByLabelText(`${entry.dish.name} · Chưa có ảnh`).props.style);
    expect(artwork.borderColor).toBe(entry.isWinner ? getThemeColors('light').primary : getThemeColors('light').line);
  }
  expect(screen.getByText(`Món được chọn · ${result.winner!.name}`)).toBeOnTheScreen();
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
