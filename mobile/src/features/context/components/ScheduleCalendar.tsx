import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';

export function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00Z`), leading = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => index < leading || index >= leading + count ? null : `${month}-${String(index - leading + 1).padStart(2, '0')}`);
}
export function ScheduleCalendar({ initial, today, onConfirm, onBack }: { initial: string; today: string; onConfirm: (date: string) => void; onBack: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), { width } = useWindowDimensions();
  const [month, setMonth] = useState(initial.slice(0, 7)), [selected, setSelected] = useState(initial);
  const shift = (delta: number) => { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + delta); setMonth(date.toISOString().slice(0, 7)); };
  const arrow = (delta: number) => <Pressable accessibilityRole="button" accessibilityLabel={delta < 0 ? 'Tháng trước' : 'Tháng sau'} onPress={() => shift(delta)} style={styles.monthArrow}>
    <Image source={require('../../../../assets/brand/home/back.png')} accessible={false} resizeMode="contain" style={[styles.arrow, { tintColor: colors.text }, delta > 0 && { transform: [{ rotate: '180deg' }] }]} />
  </Pressable>;
  const calendarWidth = Math.max(336, Math.min(440, width - 40));
  return <>
    <View style={styles.monthBar}>
      {arrow(-1)}
      <Text accessibilityRole="header" style={[styles.month, { color: colors.text }, textStyle(600)]}>{`Tháng ${Number(month.slice(5))}, ${month.slice(0, 4)}`}</Text>
      {arrow(1)}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={width < 376} contentContainerStyle={{ alignSelf: 'center' }}>
      <View style={{ width: calendarWidth }}>
        <View style={styles.grid}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Text key={day} style={[styles.weekday, { width: calendarWidth / 7, color: colors.muted }, textStyle(500)]}>{day}</Text>)}</View>
        <View style={styles.grid}>{monthCells(month).map((day, index) => day ? <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Ngày ${day}`} accessibilityState={{ selected: day === selected, disabled: day < today }} disabled={day < today} onPress={() => setSelected(day)} style={[styles.day, { width: calendarWidth / 7, backgroundColor: selected === day ? colors.primary : 'transparent', opacity: day < today ? 0.35 : 1 }]}>
          <Text style={[styles.dayText, { color: selected === day ? colors.onPrimary : colors.text }, textStyle(600)]}>{Number(day.slice(-2))}</Text>
        </Pressable> : <View key={`empty-${index}`} style={{ width: calendarWidth / 7, minHeight: 48 }} />)}</View>
      </View>
    </ScrollView>
    <AppButton label={`Chọn ngày ${selected.slice(8, 10)}/${selected.slice(5, 7)}`} disabled={selected < today} onPress={() => onConfirm(selected)} colors={colors} />
    <AppButton label="Quay lại giờ hẹn" variant="secondary" onPress={onBack} colors={colors} />
  </>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { textAlign: 'center', fontSize: 12, paddingVertical: 8 }, day: { minHeight: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, dayText: { fontSize: 14, lineHeight: 21 }, monthBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center' }, month: { flex: 1, fontSize: 16, lineHeight: 24, textAlign: 'center' }, monthArrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, arrow: { width: 20, height: 20 } });
