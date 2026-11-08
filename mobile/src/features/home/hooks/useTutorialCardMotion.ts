import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, type GestureResponderEvent } from 'react-native';
import type { VoteValue } from '../../../shared/ui';

/** Feedback for a local practice card only; never submits or advances a ballot. */
export function useTutorialCardMotion({ enabled, vote, onVote }: { enabled: boolean; vote?: VoteValue; onVote: (value: VoteValue) => void }) {
  const [position] = useState(() => new Animated.ValueXY());
  const [flash] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [wantPulse, setWantPulse] = useState(0);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); position.stopAnimation(); flash.stopAnimation(); };
  }, [position, flash]);
  useEffect(() => {
    flash.stopAnimation();
    flash.setValue(0);
    if (!enabled || vote !== 'WANT' || reduceMotion) return;
    const animation = Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [enabled, flash, reduceMotion, vote, wantPulse]);
  const center = useCallback(() => {
    if (reduceMotion) { position.setValue({ x: 0, y: 0 }); return; }
    Animated.spring(position, { toValue: { x: 0, y: 0 }, speed: 20, bounciness: 7, useNativeDriver: true }).start();
  }, [position, reduceMotion]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => enabled && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
    onPanResponderGrant: () => { setLastTap(null); position.stopAnimation(); },
    onPanResponderMove: (_, gesture) => {
      if (enabled && !reduceMotion) position.setValue({ x: Math.max(-120, Math.min(120, gesture.dx)), y: Math.max(-24, Math.min(24, gesture.dy * 0.2)) });
    },
    onPanResponderRelease: (_, gesture) => {
      if (enabled && Math.abs(gesture.dx) >= 40 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) onVote(gesture.dx < 0 ? 'NO' : 'OK');
      center();
    },
    onPanResponderTerminate: center,
    onPanResponderTerminationRequest: () => true,
  }), [center, enabled, onVote, position, reduceMotion]);
  const tap = (event?: GestureResponderEvent) => {
    if (!enabled) return;
    const now = event?.nativeEvent.timestamp ?? Date.now();
    if (lastTap !== null && now >= lastTap && now - lastTap <= 350) {
      setLastTap(null); setWantPulse(value => value + 1); onVote('WANT');
    } else setLastTap(now);
  };
  const rotate = position.x.interpolate({ inputRange: [-120, 0, 120], outputRange: ['-8deg', '0deg', '8deg'], extrapolate: 'clamp' });
  return { panHandlers: pan.panHandlers, tap, position, rotate, reduceMotion,
    flashOpacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }),
    noOpacity: position.x.interpolate({ inputRange: [-80, -20, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
    okOpacity: position.x.interpolate({ inputRange: [0, 20, 80], outputRange: [0, 0, 1], extrapolate: 'clamp' }),
  };
}
