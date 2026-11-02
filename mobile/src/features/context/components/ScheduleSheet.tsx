import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { parseSchedule, scheduleParts } from '../services/dishSetup';

/** Native controls and explicit buttons; no new native picker dependency. */
export function ScheduleSheet({ initial, now, onConfirm, onClose, initialCalendar = false }: {
  initial: string; now: () => number; onConfirm: (iso: string) => void; onClose: () => void; initialCalendar?: boolean;
}) {
  const { colors } = useShellTheme();
  const initialParts = scheduleParts(initial);
  const [date, setDate] = useState(initialParts.date), [hour, setHour] = useState(initialParts.hour), [minute, setMinute] = useState(initialParts.minute);
  const [calendar, setCalendar] = useState(initialCalendar), [month, setMonth] = useState(initialParts.date.slice(0, 7)), [error, setError] = useState<string>();
  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  const shiftMonth = (offset: number) => { const next = new Date(monthStart); next.setUTCMonth(next.getUTCMonth() + offset); setMonth(next.toISOString().slice(0, 7)); };
  const confirm = () => {
    const iso = parseSchedule(date, hour, minute);
    if (!iso || Date.parse(iso) <= now()) { setError('Ngày và giờ phải hợp lệ, ở tương lai (UTC+7).'); return; }
    onConfirm(iso);
  };
  return <SheetDialog visible title="Hẹn giờ ăn" onClose={onClose} colors={colors}>
    <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={{ color: colors.muted }}>Ngày YYYY-MM-DD · giờ UTC+7</Text>
      <TextInput accessibilityLabel="Ngày hẹn" value={date} onChangeText={setDate} autoCorrect={false} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.line }]} />
      <AppButton label={calendar ? 'Ẩn lịch' : 'Chọn ngày trên lịch'} variant="secondary" onPress={() => setCalendar(value => !value)} colors={colors} />
      {calendar ? <View style={styles.calendar}>
        <AppButton label="Tháng trước" variant="quiet" onPress={() => shiftMonth(-1)} colors={colors} />
        <Text accessibilityRole="header" style={{ color: colors.text }}>{month}</Text>
        <AppButton label="Tháng sau" variant="quiet" onPress={() => shiftMonth(1)} colors={colors} />
        <View style={styles.days}>{Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`).map(day => <AppButton key={day} label={`Ngày ${Number(day.slice(-2))}`} variant={date === day ? 'primary' : 'secondary'} style={styles.day} onPress={() => { setDate(day); setCalendar(false); }} colors={colors} />)}</View>
      </View> : null}
      <View style={styles.row}><View style={styles.column}><Text style={{ color: colors.text }}>Giờ</Text><TextInput accessibilityLabel="Giờ hẹn" value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={[styles.input, { color: colors.text, borderColor: colors.line }]} /></View>
      <View style={styles.column}><Text style={{ color: colors.text }}>Phút</Text><TextInput accessibilityLabel="Phút hẹn" value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} selectTextOnFocus style={[styles.input, { color: colors.text, borderColor: colors.line }]} /></View></View>
      {error ? <StatusNotice title={error} colors={colors} /> : null}
      <AppButton label="Xác nhận giờ hẹn" onPress={confirm} colors={colors} />
      <AppButton label="Hủy hẹn giờ" variant="secondary" onPress={onClose} colors={colors} />
    </ScrollView>
  </SheetDialog>;
}
const styles = StyleSheet.create({ content: { maxHeight: 420 }, input: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, marginVertical: 8 }, row: { flexDirection: 'row', gap: 16 }, column: { flex: 1 }, calendar: { gap: 8 }, days: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, day: { minWidth: 64, flexGrow: 1, flexBasis: '27%' } });
