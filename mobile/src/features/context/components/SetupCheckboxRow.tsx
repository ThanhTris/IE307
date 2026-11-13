import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppIcon } from '../../../shared/ui/icons/AppIcon';
import { ChoiceIconView, type ChoiceIcon } from '../../../shared/ui/icons/ChoiceIcon';

export function SetupCheckboxRow({ label, checked, onPress, disabled, helper, icon, highlight = false }: {
  label: string; checked: boolean; onPress: () => void; disabled?: boolean; helper?: string; icon?: ChoiceIcon; highlight?: boolean;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityHint={helper} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.row, { borderColor: highlight && checked ? colors.green : colors.line, backgroundColor: highlight && checked ? colors.warm : colors.surface, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
    {icon ? <ChoiceIconView icon={icon} size={22} color={highlight && checked ? colors.primary : colors.text} /> : null}
    <View style={styles.copy}><Text style={[styles.label, { color: colors.text }, textStyle(600)]}>{label}</Text>{helper ? <Text style={[styles.helper, { color: colors.muted }, textStyle(400)]}>{helper}</Text> : null}</View>
    <View accessible={false} style={[styles.box, { borderColor: checked ? colors.primary : colors.line, backgroundColor: checked ? colors.primary : colors.surface }]}>{checked ? <AppIcon name="check" size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
  </Pressable>;
}
const styles = StyleSheet.create({ row: { width: '100%', minHeight: 52, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1, minWidth: 0, gap: 4 }, label: { fontSize: 14, lineHeight: 21 }, helper: { fontSize: 12, lineHeight: 18 }, box: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, tick: { fontSize: 15, lineHeight: 18 }, icon: { width: 24, height: 24 } });
