import { Animated } from 'react-native';

/** Navigation tests control native completion; separate motion tests drive completion manually. */
export function completeNativeAnimations() {
  jest.spyOn(Animated, 'parallel').mockImplementation(() => ({ start: callback => callback?.({ finished: true }), stop: jest.fn(), reset: jest.fn() }));
}
