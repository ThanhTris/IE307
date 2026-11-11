import { AccessibilityInfo, Animated } from 'react-native';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { useWinnerCelebration } from '../../src/features/result/hooks/useWinnerCelebration';
import { WinnerCelebration } from '../../src/features/result/components/WinnerCelebration';
import { scoredResultFixture } from '../fixtures/result/dishResultFixtures';
import { completeNativeAnimations } from '../helpers/completeNativeAnimations';

beforeEach(completeNativeAnimations);
afterEach(() => jest.restoreAllMocks());
test('same result opens once through dismissal and refetch, a new result can celebrate', async () => {
  const { result, rerender } = await renderHook(({ id }: { id?: string }) => useWinnerCelebration(id), { initialProps: { id: undefined as string | undefined } });
  expect(result.current.visible).toBe(false);
  await rerender({ id: 'first' }); expect(result.current.visible).toBe(true);
  await act(() => result.current.dismiss()); expect(result.current.visible).toBe(false);
  await rerender({ id: undefined }); await rerender({ id: 'first' }); expect(result.current.visible).toBe(false);
  await rerender({ id: 'second' }); expect(result.current.visible).toBe(true);
});
test('celebration displays the supplied winner and score and closes through the explicit action', async () => {
  const close = jest.fn(), winner = scoredResultFixture('one').topDishes[0]!;
  await render(<WinnerCelebration winner={winner} onDismiss={close} />);
  expect(screen.getByText(winner.dish.name)).toBeOnTheScreen(); expect(screen.getByText('4 điểm')).toBeOnTheScreen();
  expect(screen.getByTestId('sheet-dialog').props.animationType).toBe('none');
  await fireEvent.press(screen.getByRole('button', { name: 'Chạm để bỏ qua' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});
test('Reduce Motion requests zero-duration native animations', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const timing = jest.spyOn(Animated, 'timing');
  await render(<WinnerCelebration winner={scoredResultFixture().topDishes[0]!} onDismiss={jest.fn()} />);
  await waitFor(() => expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 0, useNativeDriver: true })));
});
