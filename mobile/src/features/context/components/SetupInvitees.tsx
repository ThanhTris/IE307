import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { SetupFriend } from '../services/dishSetup';

export function SetupInvitees({ ids, friends, disabled, onEdit }: { ids: string[]; friends: SetupFriend[]; disabled?: boolean; onEdit?: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <View style={styles.row}>{ids.map(id => {
    const friend = friends.find(item => item.id === id), label = friend?.label ?? 'Bạn đã chọn';
    return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Sửa bạn ${label}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onEdit} style={[styles.chip, { borderColor: colors.green, opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.avatar, { borderColor: colors.line, backgroundColor: colors.warm }]}><Text style={[styles.initial, { color: colors.text }, textStyle(600)]}>{friend?.label.trim().slice(0, 1).toLocaleUpperCase('vi') ?? '?'}</Text></View><Text style={[styles.name, { color: colors.text }, textStyle(500)]}>{label}</Text>
    </Pressable>;
  })}<Pressable accessibilityRole="button" accessibilityLabel="Thêm bạn" accessibilityState={{ disabled: disabled || !onEdit }} disabled={disabled || !onEdit} onPress={onEdit} style={[styles.chip, { borderColor: colors.line, opacity: disabled ? 0.5 : 1 }]}><Text accessible={false} style={[styles.plus, { color: colors.text }]}>+</Text><Text style={[styles.name, { color: colors.text }, textStyle(500)]}>Thêm</Text></Pressable></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 48, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' }, avatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 12 }, name: { fontSize: 13, lineHeight: 20, flexShrink: 1 }, plus: { fontSize: 24, lineHeight: 28 } });
