import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

/** Pulsing placeholder rectangle for skeleton loading layouts. */
export function SkeletonBlock({ width = '100%', height = 16, radius = radii.md, style, colors }: ComponentThemeProps & {
  width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const [pulse] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors?.soft, opacity: pulse }, style]} />;
}
