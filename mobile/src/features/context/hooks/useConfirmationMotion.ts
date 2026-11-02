import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/** Modal stays mounted through dismissal, so only the panel moves and the backdrop can fade out. */
export function useConfirmationMotion(height: number) {
  const [opacity] = useState(() => new Animated.Value(0)), [translation] = useState(() => new Animated.Value(height));
  const [reduceMotion, setReduceMotion] = useState(false), [closing, setClosing] = useState(false);
  const mounted = useRef(false), pending = useRef(false), completed = useRef(false);
  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted.current) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted.current = false; subscription.remove(); opacity.stopAnimation(); translation.stopAnimation(); };
  }, [opacity, translation]);
  useEffect(() => {
    if (pending.current) return;
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 0 : 160, useNativeDriver: true }),
      Animated.timing(translation, { toValue: 0, duration: reduceMotion ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, translation, reduceMotion]);
  const dismiss = (action: () => void) => {
    if (pending.current) return;
    pending.current = true; setClosing(true); opacity.stopAnimation(); translation.stopAnimation();
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : 160, useNativeDriver: true }),
      Animated.timing(translation, { toValue: reduceMotion ? 0 : height, duration: reduceMotion ? 0 : 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      if (!mounted.current || completed.current) return;
      completed.current = true; opacity.setValue(0); translation.setValue(reduceMotion ? 0 : height); action();
    });
  };
  return { opacity, translation, closing, dismiss };
}
