import { AccessibilityInfo, Animated, PanResponder, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { VoteValue } from '../../src/shared/ui';
import { useTutorialCardMotion } from '../../src/features/home/hooks/useTutorialCardMotion';

const event = {} as GestureResponderEvent;
const gesture = (dx: number, dy = 0): PanResponderGestureState => ({ stateID: 1, dx, dy, vx: 0, vy: 0, moveX: dx, moveY: dy, x0: 0, y0: 0, numberActiveTouches: 1 });
beforeEach(() => { jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false); });
afterEach(() => { jest.restoreAllMocks(); });

test.each([[-70, 'NO'], [75, 'OK']] as const)('card follows horizontal drag %s and applies %s only on release', async (dx, choice) => {
  const create = jest.spyOn(PanResponder, 'create'), onVote = jest.fn();
  const { result, unmount } = await renderHook(() => useTutorialCardMotion({ enabled: true, onVote }));
  const callbacks = create.mock.calls.at(-1)![0];
  let translated = 0;
  result.current.position.x.addListener(state => { translated = state.value; });
  expect(callbacks.onMoveShouldSetPanResponder?.(event, gesture(dx, 4))).toBe(true);
  await act(() => callbacks.onPanResponderGrant?.(event, gesture(0)));
  await act(() => callbacks.onPanResponderMove?.(event, gesture(dx, 4)));
  expect(translated).toBe(dx); expect(onVote).not.toHaveBeenCalled();
  await act(() => callbacks.onPanResponderRelease?.(event, gesture(dx, 4)));
  expect(onVote).toHaveBeenCalledTimes(1); expect(onVote).toHaveBeenCalledWith(choice);
  await unmount();
});

test('vertical scrolling, short drags and cancelled gestures do not choose a vote', async () => {
  const create = jest.spyOn(PanResponder, 'create'), onVote = jest.fn();
  const { unmount } = await renderHook(() => useTutorialCardMotion({ enabled: true, onVote }));
  const callbacks = create.mock.calls.at(-1)![0];
  expect(callbacks.onMoveShouldSetPanResponder?.(event, gesture(20, 80))).toBe(false);
  await act(() => callbacks.onPanResponderRelease?.(event, gesture(30)));
  await act(() => callbacks.onPanResponderGrant?.(event, gesture(0)));
  await act(() => callbacks.onPanResponderMove?.(event, gesture(-80)));
  await act(() => callbacks.onPanResponderTerminate?.(event, gesture(-80)));
  expect(onVote).not.toHaveBeenCalled();
  await unmount();
});

test('reduced motion keeps gesture choices without moving the card', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const create = jest.spyOn(PanResponder, 'create'), onVote = jest.fn();
  const { result, unmount } = await renderHook(() => useTutorialCardMotion({ enabled: true, onVote }));
  await waitFor(() => expect(result.current.reduceMotion).toBe(true));
  const callbacks = create.mock.calls.at(-1)![0], moved = jest.fn();
  result.current.position.x.addListener(moved);
  await act(() => callbacks.onPanResponderMove?.(event, gesture(-80)));
  expect(moved).not.toHaveBeenCalled();
  await act(() => callbacks.onPanResponderRelease?.(event, gesture(-80)));
  expect(onVote).toHaveBeenCalledWith('NO');
  await unmount();
});

test('double tap selects WANT and requests a finite native glow; one tap does not vote', async () => {
  const onVote = jest.fn(), timing = jest.spyOn(Animated, 'timing');
  const { result, rerender, unmount } = await renderHook(({ vote }: { vote?: VoteValue }) => useTutorialCardMotion({ enabled: true, vote, onVote }), { initialProps: { vote: undefined as VoteValue | undefined } });
  await act(() => result.current.tap({ nativeEvent: { timestamp: 1000 } } as GestureResponderEvent));
  expect(onVote).not.toHaveBeenCalled();
  await act(() => result.current.tap({ nativeEvent: { timestamp: 1100 } } as GestureResponderEvent));
  expect(onVote).toHaveBeenCalledWith('WANT');
  await rerender({ vote: 'WANT' });
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, useNativeDriver: true }));
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, useNativeDriver: true }));
  await unmount();
});
