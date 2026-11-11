import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon } from '../../../shared/ui';

export function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00Z`), leading = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => index < leading || index >= leading + count ? null : `${month}-${String(index - leading + 1).padStart(2, '0')}`);
}
/** Weeks the month needs (4-6): empty edge cells show the neighbouring months' days; a row with no day of this month is not drawn. */
export function monthGrid(month: string): { date: string; inMonth: boolean }[] {
  const first = new Date(`${month}-01T00:00:00Z`), leading = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => {
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), index - leading + 1)).toISOString().slice(0, 10);
    return { date, inMonth: date.startsWith(month) };
  });
}
export function ScheduleCalendar({ initial, today, onConfirm, onBack }: { initial: string; today: string; onConfirm: (date: string) => void; onBack: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), { width } = useWindowDimensions();
  const [month, setMonth] = useState(initial.slice(0, 7)), [selected, setSelected] = useState(initial);
  const shift = (delta: number) => { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + delta); setMonth(date.toISOString().slice(0, 7)); };
  const arrow = (delta: number) => <Pressable accessibilityRole="button" accessibilityLabel={delta < 0 ? 'Tháng trước' : 'Tháng sau'} onPress={() => shift(delta)} style={styles.monthArrow}>
    <AppIcon name={delta < 0 ? 'back' : 'next'} size={24} color={colors.text} />
  </Pressable>;
  const calendarWidth = Math.floor((Math.min(width, 480) - 40) / 7) * 7, cell = calendarWidth / 7;
  return <>
    <View style={styles.monthBar}>
      {arrow(-1)}
      <Text accessibilityRole="header" style={[styles.month, { color: colors.text }, textStyle(600)]}>{`Tháng ${Number(month.slice(5))}, ${month.slice(0, 4)}`}</Text>
      {arrow(1)}
    </View>
    <View style={{ width: calendarWidth, alignSelf: 'center' }}>
      <View style={styles.grid}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Text key={day} style={[styles.weekday, { width: cell, color: colors.muted }, textStyle(500)]}>{day}</Text>)}</View>
      <View style={[styles.grid, { height: 6 * 44 }]}>{monthGrid(month).map(({ date: day, inMonth }) => inMonth ? <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Ngày ${day}`} accessibilityState={{ selected: day === selected, disabled: day < today }} disabled={day < today} onPress={() => setSelected(day)} style={[styles.day, { width: cell, backgroundColor: selected === day ? colors.primary : 'transparent', opacity: day < today ? 0.35 : 1 }]}>
        <Text style={[styles.dayText, { color: selected === day ? colors.onPrimary : colors.text }, textStyle(600)]}>{Number(day.slice(-2))}</Text>
      </Pressable> : <View key={day} accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.day, { width: cell, opacity: 0.28 }]}>
        <Text style={[styles.dayText, { color: colors.text }, textStyle(400)]}>{Number(day.slice(-2))}</Text>
      </View>)}</View>
    </View>
    <View style={styles.actions}>
      <AppButton label="Quay lại" accessibilityHint="Quay lại giờ hẹn" variant="secondary" onPress={onBack} style={styles.action} colors={colors} />
      <AppButton label={`Chọn ngày ${selected.slice(8, 10)}/${selected.slice(5, 7)}`} disabled={selected < today} onPress={() => onConfirm(selected)} style={styles.action} colors={colors} />
    </View>
  </>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { textAlign: 'center', fontSize: 12, paddingVertical: 6 }, day: { height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, dayText: { fontSize: 14, lineHeight: 21 }, monthBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center' }, month: { flex: 1, fontSize: 16, lineHeight: 24, textAlign: 'center' }, monthArrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, actions: { flexDirection: 'row', gap: 12 }, action: { flex: 1 } });
