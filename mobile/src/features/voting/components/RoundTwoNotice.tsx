import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, SheetDialog } from '../../../shared/ui';
import { getRoundTwoEliminationCap } from '../services/votingRules';

/** Seconds before the notice moves on to round 2 by itself. */
export const ROUND_TWO_NOTICE_SECONDS = 5;

/**
 * Round 1 found no dish everyone could accept, so the dishes that survived go to round 2. Says so before the screen
 * changes, then continues by itself after a short countdown (the button goes now).
 */
export function RoundTwoNotice({ remaining, onContinue, seconds = ROUND_TWO_NOTICE_SECONDS }: { remaining: number; onContinue: () => void; seconds?: number }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [left, setLeft] = useState(seconds);
  const cap = getRoundTwoEliminationCap(remaining);

  useEffect(() => {
    if (left <= 0) { onContinue(); return; }
    const timer = setTimeout(() => setLeft(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, onContinue]);

  return <SheetDialog visible title="Chưa chốt được món" presentation="dialog" showHandle={false} showClose={false} showTitle={false} onClose={onContinue} colors={colors}>
    <View style={styles.body}>
      <View style={[styles.badge, { backgroundColor: colors.warm }]}><AppIcon name="hourglass" size={28} color={colors.primary} /></View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Chưa chốt được món</Text>
      <Text style={[styles.text, { color: colors.muted }, textStyle(400)]}>{`Còn ${remaining} món vào vòng 2.`}</Text>
      <Text style={[styles.text, { color: colors.muted }, textStyle(400)]}>{`Mỗi người loại tối đa ${cap} món.`}</Text>
      <AppButton label={`Vào vòng 2 (${Math.max(0, left)})`} onPress={onContinue} colors={colors} singleLine style={styles.button} />
    </View>
  </SheetDialog>;
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 10 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 28, textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 4 },
});
