import { useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

/** Endless wheel: the list is repeated so 59 flows into 00 and 23 into 00 in both directions. */
const COPIES = 5, MIDDLE = 2;
export function ScheduleWheel({ label, value, count, onChange, rowHeight = 48, rows = 5 }: {
  label: string; value: number; count: number; onChange: (value: number) => void; rowHeight?: number; rows?: number;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null), padding = Math.floor(rows / 2) * rowHeight;
  const wrap = (next: number) => ((next % count) + count) % count;
  const centre = (number: number) => (MIDDLE * count + number) * rowHeight;
  const select = (next: number) => { const wrapped = wrap(next); onChange(wrapped); scroll.current?.scrollTo({ y: centre(wrapped), animated: false }); };
  const indexAt = (event: NativeSyntheticEvent<NativeScrollEvent>) => Math.max(0, Math.round(event.nativeEvent.contentOffset.y / rowHeight));
  const track = (event: NativeSyntheticEvent<NativeScrollEvent>) => onChange(wrap(indexAt(event)));
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = indexAt(event), wrapped = wrap(index);
    onChange(wrapped);
    if (index < count || index >= (COPIES - 1) * count) scroll.current?.scrollTo({ y: centre(wrapped), animated: false });
  };
  return <View style={styles.column}>
    <Text style={[styles.heading, { color: colors.text }, textStyle(600)]}>{label}</Text>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: count - 1, now: value, text: String(value).padStart(2, '0') }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={event => select(value + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}>
      <ScrollView ref={scroll} testID={`schedule-wheel-${count}`} style={{ height: rowHeight * rows }} nestedScrollEnabled showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: padding }} contentOffset={{ x: 0, y: centre(value) }} onLayout={() => scroll.current?.scrollTo({ y: centre(value), animated: false })}
        snapToInterval={rowHeight} decelerationRate="fast" scrollEventThrottle={32} onScroll={track} onMomentumScrollEnd={settle} onScrollEndDrag={settle} keyboardShouldPersistTaps="handled">
        {Array.from({ length: COPIES * count }, (_, index) => {
          const number = index % count, middle = Math.floor(index / count) === MIDDLE;
          return <Pressable key={index} accessible={middle} importantForAccessibility={middle ? 'auto' : 'no-hide-descendants'} accessibilityRole="button" accessibilityLabel={`${label} ${number}`} onPress={() => select(number)}
            style={[styles.item, { minHeight: rowHeight, backgroundColor: value === number ? colors.warm : 'transparent' }]}>
            <Text style={[styles.value, { color: colors.text, opacity: Math.min(Math.abs(value - number), count - Math.abs(value - number)) > 1 ? 0.5 : 1 }, textStyle(value === number ? 600 : 400)]}>{String(number).padStart(2, '0')}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </View>
  </View>;
}
const styles = StyleSheet.create({ column: { flex: 1, minWidth: 0, gap: 8 }, heading: { fontSize: 14, lineHeight: 21, textAlign: 'center' }, item: { alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, value: { fontSize: 20, lineHeight: 28 } });
