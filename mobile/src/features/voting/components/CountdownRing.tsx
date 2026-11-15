import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Palette } from '../../../shared/ui';

/** Countdown clock: a ring that empties as the seconds run out, the number in the middle. */
export function CountdownRing({ seconds, total = 60, size = 96, colors }: { seconds: number | null; total?: number; size?: number; colors: Palette }) {
  const stroke = 8, radius = (size - stroke) / 2, circumference = 2 * Math.PI * radius;
  const left = seconds === null ? total : Math.max(0, Math.min(total, seconds));
  const urgent = left <= 10;
  return <View accessibilityRole="timer" accessibilityLabel={`Còn ${left} giây`} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={styles.ring}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.soft} strokeWidth={stroke} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={urgent ? colors.danger : colors.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - left / total)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
    <Text style={[styles.text, { color: urgent ? colors.danger : colors.text }]}>{seconds === null ? '…' : left}</Text>
    <Text style={[styles.unit, { color: colors.muted }]}>giây</Text>
  </View>;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  text: { fontFamily: 'InterBold', fontSize: 26, lineHeight: 30 },
  unit: { fontFamily: 'InterRegular', fontSize: 11, lineHeight: 14 },
});
