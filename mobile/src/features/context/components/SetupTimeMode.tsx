import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppIcon, type AppIconName } from '../../../shared/ui/icons/AppIcon';

const choices: { label: string; icon: AppIconName }[] = [{ label: 'Ăn ngay', icon: 'lightning' }, { label: 'Hẹn giờ', icon: 'history' }];
const SLIDE_MS = 220, OPEN_DELAY_MS = 260, SETTLE_MS = 700;

/** "Hẹn giờ" first slides the highlight across, then opens the schedule sheet. */
export function SetupTimeMode({ scheduled, disabled, onNow, onSchedule }: { scheduled: boolean; disabled?: boolean; onNow: () => void; onSchedule?: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [pending, setPending] = useState<number | null>(null), [width, setWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const effective = pending ?? (scheduled ? 1 : 0);
  const [slide] = useState(() => new Animated.Value(effective));
  useEffect(() => { Animated.timing(slide, { toValue: effective, duration: SLIDE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [effective, slide]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (run: () => void, ms: number) => { timers.current.push(setTimeout(run, ms)); };
  const press = (index: number) => {
    if (index === 0) { setPending(null); onNow(); return; }
    if (!onSchedule) return;
    setPending(1);
    later(() => onSchedule(), OPEN_DELAY_MS);
    later(() => setPending(null), SETTLE_MS);
  };
  const half = width / 2;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.segment, { borderColor: colors.line, backgroundColor: colors.surface }]}>
    {half > 0 ? <Animated.View pointerEvents="none" style={[styles.indicator, { width: half - 2, backgroundColor: colors.primary, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, half] }) }] }]} /> : null}
    {choices.map((item, index) => {
      const selected = effective === index, unavailable = disabled || (index === 1 && !onSchedule);
      const foreground = selected ? colors.onPrimary : colors.text;
      return <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: scheduled === (index === 1), disabled: unavailable }} disabled={unavailable} onPress={() => press(index)} style={[styles.option, { opacity: unavailable ? 0.5 : 1 }]}>
        <AppIcon name={item.icon} size={20} color={foreground} /><Text style={[styles.label, { color: foreground }, textStyle(600)]}>{item.label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  indicator: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 10 },
  option: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  label: { fontSize: 14, lineHeight: 21, flexShrink: 1 },
});
