import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { formatSchedule } from '../services/dishSetup';

export function SetupScheduleSummary({ value, onEdit, disabled }: { value: string; onEdit?: () => void; disabled?: boolean }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <View style={[styles.row, { borderColor: colors.line, backgroundColor: colors.surface }]}>
    <Text accessibilityLabel={`Giờ hẹn đã chọn: ${formatSchedule(value)}`} style={[styles.time, { color: colors.text }, textStyle(500)]}>{formatSchedule(value)}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Sửa thời gian" accessibilityState={{ disabled: disabled || !onEdit }} disabled={disabled || !onEdit} onPress={onEdit} style={({ pressed }) => [styles.edit, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
      <Text style={[styles.link, { color: colors.primary }, textStyle(700)]}>Sửa</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({ row: { minHeight: 64, borderWidth: 1, borderRadius: 12, paddingLeft: 12, paddingRight: 4, flexDirection: 'row', alignItems: 'center', gap: 16 }, time: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 21, paddingVertical: 12 }, edit: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, link: { fontSize: 14, lineHeight: 21, textDecorationLine: 'underline' } });
