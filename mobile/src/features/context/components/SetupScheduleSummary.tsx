import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppIcon } from '../../../shared/ui/icons/AppIcon';
import { formatSchedule } from '../services/dishSetup';

/** The chosen time. The whole card is the button that reopens the schedule sheet; there is no separate "Sửa". */
export function SetupScheduleSummary({ value, onEdit, disabled }: { value: string; onEdit?: () => void; disabled?: boolean }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const off = disabled || !onEdit;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Đổi giờ hẹn, đang chọn ${formatSchedule(value)}`} accessibilityState={{ disabled: off }} disabled={off} onPress={onEdit}
    style={({ pressed }) => [styles.row, { borderColor: colors.green, backgroundColor: colors.warm, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    <AppIcon name="calendar" size={20} color={colors.primary} />
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.time, { color: colors.text }, textStyle(600)]}>{formatSchedule(value)}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { minHeight: 56, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  time: { fontSize: 15, lineHeight: 22, textAlign: 'center', flexShrink: 1 },
});
