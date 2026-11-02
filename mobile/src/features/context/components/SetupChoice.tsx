import { Image, Pressable, StyleSheet, Text, type ImageSourcePropType } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

export function SetupChoice({ label, selected, onPress, disabled, icon, stacked = false, checkbox = false, columns = 2 }: {
  label: string; selected: boolean; onPress: () => void; disabled?: boolean;
  icon?: ImageSourcePropType; stacked?: boolean; checkbox?: boolean; columns?: 1 | 2 | 3;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <Pressable accessibilityRole={checkbox ? 'checkbox' : 'button'} accessibilityLabel={label}
    accessibilityState={{ selected, checked: checkbox ? selected : undefined, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.choice, stacked && styles.stacked, { flexBasis: columns === 3 ? '28%' : columns === 1 ? '100%' : '44%', borderColor: selected ? colors.green : colors.line, backgroundColor: selected ? colors.warm : colors.surface, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    {icon ? <Image source={icon} accessible={false} resizeMode="contain" style={[styles.icon, { tintColor: colors.text }]} /> : null}
    <Text style={[styles.label, { color: colors.text }, textStyle(600)]}>{label}</Text>
    {checkbox ? <Text accessible={false} style={[styles.check, { color: selected ? colors.primary : colors.muted }]}>{selected ? '✓' : '□'}</Text> : null}
  </Pressable>;
}
const styles = StyleSheet.create({
  choice: { flexGrow: 1, flexShrink: 1, flexBasis: '44%', minHeight: 52, padding: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stacked: { flexDirection: 'column', minHeight: 76 }, icon: { width: 26, height: 26 },
  label: { fontSize: 14, lineHeight: 21, flexShrink: 1, textAlign: 'center' }, check: { fontSize: 22 },
});
