import { ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SheetDialog } from '../../../shared/ui';

export function SetupConfirmDialog({ title, message, confirmLabel, continueLabel, onConfirm, onContinue }: {
  title: string; message: string; confirmLabel: string; continueLabel: string; onConfirm: () => void; onContinue: () => void;
}) {
  const { colors, dark } = useShellTheme(), { textStyle } = useAppFonts(), { height } = useWindowDimensions();
  return <SheetDialog visible title={title} onClose={onContinue} colors={colors} presentation="dialog" showClose={false} showHandle={false} backdropColor={dark ? undefined : 'rgba(70,195,79,0.22)'}>
    <ScrollView style={{ maxHeight: height * 0.65 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{message}</Text>
      <AppButton label={confirmLabel} onPress={onConfirm} colors={colors} />
      <AppButton label={continueLabel} onPress={onContinue} variant="secondary" colors={colors} />
    </ScrollView>
  </SheetDialog>;
}
const styles = StyleSheet.create({ content: { gap: 16 }, body: { fontSize: 14, lineHeight: 21 } });
