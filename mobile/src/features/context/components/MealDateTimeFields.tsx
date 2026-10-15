import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { AppButton, Chip, FormField } from '../../../shared/ui';
import { mealDateLabel, parseLocalTime, shiftLocalDate } from '../services/roomSetup';

type Props = {
  date: string; time: string; disabled: boolean; getToday: () => string;
  onDateChange: (value: string) => void; onTimeChange: (value: string) => void;
};

export function MealDateTimeFields({ date, time, disabled, getToday, onDateChange, onTimeChange }: Props) {
  const { colors } = useShellTheme();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(date);
  const [start, setStart] = useState(date);
  const previous = shiftLocalDate(start, -7);
  const next = shiftLocalDate(start, 7);
  const choose = (value: string) => { onDateChange(value); setOpen(false); };
  return <View style={styles.section}>
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>Ngày ăn</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Chọn ngày ăn" accessibilityValue={{ text: date }} accessibilityHint="Mở lựa chọn ngày hoặc nhập ngày khác" accessibilityState={{ disabled, expanded: open && !disabled }} disabled={disabled}
        onPress={() => {
          const current = getToday(); setToday(current);
          setStart(parseLocalTime(`${date} 00:00`) && date >= current ? date : current);
          setOpen(value => !value);
        }} style={({ pressed }) => [styles.dateButton, { backgroundColor: colors.soft, borderColor: colors.border, opacity: disabled || pressed ? 0.65 : 1 }]}>
        <Text accessible={false} style={styles.icon}>📅</Text>
        <Text style={[styles.dateLabel, { color: colors.text }]}>{mealDateLabel(date)}</Text>
        <Text accessible={false} style={[styles.body, { color: colors.muted }]}>{open && !disabled ? '▴' : '▾'}</Text>
      </Pressable>
    </View>
    {open && !disabled ? <View style={[styles.calendar, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.label, { color: colors.text }]}>Chọn ngày phù hợp</Text>
      <View style={styles.row}>
        <Chip label="Hôm nay" selected={date === today} colors={colors} onPress={() => choose(getToday())} />
        <Chip label="Ngày mai" selected={date === shiftLocalDate(today, 1)} colors={colors} onPress={() => { const value = shiftLocalDate(getToday(), 1); if (value) choose(value); }} />
      </View>
      <Text style={[styles.caption, { color: colors.muted }]}>Chọn một ngày bên dưới hoặc nhập ngày khác. Giờ ăn giữ nguyên khi đổi ngày.</Text>
      <View style={styles.row}>
        <AppButton label="‹ 7 ngày trước" variant="secondary" style={styles.pageButton} disabled={start <= today} onPress={() => setStart(previous && previous > today ? previous : today)} colors={colors} />
        <AppButton label="7 ngày tiếp ›" variant="secondary" style={styles.pageButton} disabled={!next} onPress={() => { if (next) setStart(next); }} colors={colors} />
      </View>
      {Array.from({ length: 7 }, (_, index) => shiftLocalDate(start, index)).filter((value): value is string => !!value).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Chọn ngày ${value}`} accessibilityState={{ selected: date === value }} onPress={() => choose(value)}
        style={({ pressed }) => [styles.day, { backgroundColor: date === value ? colors.warm : colors.surface, borderColor: date === value ? colors.primary : colors.border, opacity: pressed ? 0.65 : 1 }]}>
        <Text style={[styles.dateLabel, { color: colors.text }]}>{mealDateLabel(value)}</Text>
        <Text accessible={false} style={[styles.label, { color: colors.text }]}>{date === value ? '✓' : '›'}</Text>
      </Pressable>)}
      <FormField label="Ngày ăn (YYYY-MM-DD)" value={date} autoCapitalize="none" autoCorrect={false} placeholder="YYYY-MM-DD" onChangeText={onDateChange} helperText="Ví dụ 2030-10-15. Ngày và giờ cần ở tương lai khi xác nhận." colors={colors} />
      <AppButton label="Xong chọn ngày" variant="quiet" onPress={() => setOpen(false)} colors={colors} />
    </View> : null}
    <FormField label="Giờ ăn (UTC+7)" value={time} editable={!disabled} autoCapitalize="none" autoCorrect={false} placeholder="HH:mm" onChangeText={onTimeChange} helperText="Giờ 24 tiếng, ví dụ 19:00. Giờ cụ thể không cộng thêm 15 phút khi lưu hoặc thử lại." colors={colors} />
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.md }, field: { gap: spacing.xs },
  label: { ...typography.bodyBold }, body: { ...typography.body }, caption: { ...typography.caption }, icon: { fontSize: 22 },
  dateButton: { minHeight: 56, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateLabel: { ...typography.body, flex: 1, flexShrink: 1 },
  calendar: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, pageButton: { flexGrow: 1, flexBasis: 120 },
  day: { minHeight: 48, borderRadius: radii.sm, borderWidth: 1, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
