import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

/** One native input keeps paste, selection, keyboard and TalkBack coherent. */
export function RoomCodeField({ value, onChange, disabled, error }: { value: string; onChange: (value: string) => void; disabled?: boolean; error?: string }) {
  const { colors, dark } = useShellTheme(), { textStyle } = useAppFonts();
  return <View style={styles.field}>
    <Text accessibilityRole="header" style={[styles.label, { color: colors.text }, textStyle(700)]}>Mã phòng</Text>
    <View style={[styles.card, { backgroundColor: dark ? colors.surface : '#FFFFFF', borderColor: error ? colors.danger : colors.line }]}>
      <View style={styles.slots}>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.characters}>
          {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.slot, { borderColor: error ? colors.danger : colors.line, backgroundColor: colors.background }]}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.character, { color: colors.text }, textStyle(700)]}>{value[index] ?? ''}</Text>
          </View>)}
        </View>
        <TextInput accessibilityLabel="Mã phòng (6 ký tự)" accessibilityHint={error ?? 'Nhập 6 ký tự. Nhấn giữ để dán mã phòng.'} value={value} onChangeText={onChange} editable={!disabled} maxLength={6} autoCorrect={false} autoCapitalize="characters" caretHidden selectionColor={colors.primary} style={[StyleSheet.absoluteFill, styles.nativeInput]} />
      </View>
      <Text style={[styles.pasteHint, { color: colors.muted }, textStyle(400)]}>Nhấn giữ ô mã để dán</Text>
    </View>
    {error ? <Text accessibilityRole="alert" style={[styles.helper, { color: colors.text, backgroundColor: colors.warm }, textStyle(400)]}>{error}</Text> : <Text style={[styles.helper, { color: colors.muted }, textStyle(400)]}>Lấy mã từ người tạo phòng.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: 20 }, label: { fontSize: 24, lineHeight: 32 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  slots: { minHeight: 58 }, characters: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1, minWidth: 0, minHeight: 58, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  character: { fontSize: 24, lineHeight: 34 }, nativeInput: { color: 'transparent', backgroundColor: 'transparent', fontSize: 24 },
  pasteHint: { textAlign: 'right', fontSize: 12, lineHeight: 18 }, helper: { fontSize: 14, lineHeight: 21, borderRadius: 8 },
});
