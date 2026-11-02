import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { parseSchedule, scheduleParts } from '../services/dishSetup';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ScheduleWheel } from './ScheduleWheel';

export function ScheduleSheet({ initial, now, onConfirm, onClose, initialCalendar = false }: {
  initial: string; now: () => number; onConfirm: (iso: string) => void; onClose: () => void; initialCalendar?: boolean;
}) {
  const { colors, dark } = useShellTheme(), { textStyle } = useAppFonts(), { height, fontScale } = useWindowDimensions(), insets = useSafeAreaInsets();
  const initialParts = scheduleParts(initial);
  const [date, setDate] = useState(initialParts.date), [hour, setHour] = useState(Number(initialParts.hour)), [minute, setMinute] = useState(Number(initialParts.minute));
  const [calendar, setCalendar] = useState(initialCalendar), [error, setError] = useState<string>();
  const rowHeight = Math.max(48, Math.ceil(30 * fontScale)), rows = height < 840 || fontScale > 1.3 ? 3 : 5;
  const confirm = () => {
    const iso = parseSchedule(date, String(hour), String(minute));
    if (!iso || Date.parse(iso) <= now()) { setError('Ngày và giờ phải hợp lệ, ở tương lai (UTC+7).'); return; }
    onConfirm(iso);
  };
  const weekday = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][new Date(`${date}T00:00:00Z`).getUTCDay()];
  const dateLabel = `${weekday} · ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
  return <SheetDialog visible title={calendar ? 'Chọn ngày hẹn' : 'Hẹn giờ ăn'} onClose={calendar ? () => setCalendar(false) : onClose} colors={colors} showHandle={false} showClose={false} backdropColor={dark ? undefined : 'rgba(70,195,79,0.22)'}>
    <ScrollView style={{ maxHeight: (height - insets.top - insets.bottom) * 0.72 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {calendar ? <ScheduleCalendar initial={date} today={scheduleParts(new Date(now()).toISOString()).date} onConfirm={value => { setDate(value); setCalendar(false); setError(undefined); }} onBack={() => setCalendar(false)} /> : <>
        <Text style={[styles.label, { color: colors.text }, textStyle(600)]}>Ngày hẹn</Text>
        <AppButton label={dateLabel} variant="secondary" onPress={() => setCalendar(true)} colors={colors} />
        <View style={styles.row}>
          <ScheduleWheel label="Giờ" value={hour} count={24} onChange={value => { setHour(value); setError(undefined); }} rowHeight={rowHeight} rows={rows} />
          <ScheduleWheel label="Phút" value={minute} count={60} onChange={value => { setMinute(value); setError(undefined); }} rowHeight={rowHeight} rows={rows} />
        </View>
        <Text accessibilityLiveRegion="polite" style={[styles.zone, { color: colors.muted }, textStyle(400)]}>Giờ Việt Nam · UTC+7</Text>
        {error ? <StatusNotice title={error} colors={colors} /> : null}
        <AppButton label={`Xác nhận · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`} accessibilityHint="Xác nhận giờ hẹn" onPress={confirm} colors={colors} />
        <AppButton label="Hủy" accessibilityHint="Hủy hẹn giờ và giữ thiết lập trước đó" variant="secondary" onPress={onClose} colors={colors} />
      </>}
    </ScrollView>
  </SheetDialog>;
}
const styles = StyleSheet.create({ content: { gap: 12 }, label: { fontSize: 14, lineHeight: 21 }, row: { flexDirection: 'row', gap: 16 }, zone: { fontSize: 12, lineHeight: 18, textAlign: 'center' } });
