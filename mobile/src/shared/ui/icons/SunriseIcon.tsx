import Svg, { Line, Path } from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';

/**
 * Sun peeking over the horizon, without the arrow of Lucide's `Sunrise`. Same props as a Lucide icon so it
 * can sit in the AppIcon map.
 */
export const SunriseIcon = (({ size = 24, color = 'currentColor', strokeWidth = 2, ...rest }: { size?: number | string; color?: string; strokeWidth?: number | string } & Record<string, unknown>) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <Path d="M7 17a5 5 0 0 1 10 0" />
    <Line x1="2" y1="21" x2="22" y2="21" />
    <Line x1="12" y1="6" x2="12" y2="8" />
    <Line x1="4.6" y1="10.6" x2="6" y2="12" />
    <Line x1="19.4" y1="10.6" x2="18" y2="12" />
    <Line x1="1.5" y1="17" x2="3.5" y2="17" />
    <Line x1="20.5" y1="17" x2="22.5" y2="17" />
  </Svg>
)) as unknown as LucideIcon;
