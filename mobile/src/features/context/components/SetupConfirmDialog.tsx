import { ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SheetDialog } from '../../../shared/ui';
import { useConfirmationMotion } from '../hooks/useConfirmationMotion';

export function SetupConfirmDialog({ title, message, confirmLabel, continueLabel, onConfirm, onContinue }: {
  title: string; message: string; confirmLabel: string; continueLabel: string; onConfirm: () => void; onContinue: () => void;
}) {
  const { colors, dark } = useShellTheme(), { textStyle } = useAppFonts(), { height } = useWindowDimensions();
  const motion = useConfirmationMotion(height);
  return <SheetDialog visible title={title} onClose={() => motion.dismiss(onContinue)} colors={colors} presentation="dialog" showClose={false} showHandle={false} backdropColor={dark ? undefined : 'rgba(70,195,79,0.22)'} nativeAnimation="none" backdropAnimation={{ opacity: motion.opacity }} panelAnimation={{ transform: [{ translateY: motion.translation }] }}>
    <ScrollView style={{ maxHeight: height * 0.65 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{message}</Text>
      <AppButton label={confirmLabel} disabled={motion.closing} onPress={() => motion.dismiss(onConfirm)} colors={colors} />
      <AppButton label={continueLabel} disabled={motion.closing} onPress={() => motion.dismiss(onContinue)} variant="secondary" colors={colors} />
    </ScrollView>
  </SheetDialog>;
}
const styles = StyleSheet.create({ content: { gap: 16 }, body: { fontSize: 14, lineHeight: 21 } });
