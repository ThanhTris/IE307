import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../forms/ScaledText';
import { AppButton } from '../buttons/AppButton';
import { spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import { ToastNotice, useToast } from './Toast';

/** The single entry to "Trợ giúp & báo lỗi". Screens show it after a failure the person cannot fix themselves. */
export function HelpLink({ onPress, colors }: ComponentThemeProps & { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Báo lỗi hoặc cần trợ giúp" onPress={onPress} style={styles.help}>
    <Text style={[typography.bodyBold, styles.helpText, { color: colors?.text }]}>Báo lỗi hoặc cần trợ giúp</Text>
  </Pressable>;
}

/**
 * A failure the person has to act on. No error box on the page: the red toast says what happened (ADR-026) and the page
 * keeps only the next step and the help entry. `note` is for a state that was already there when the screen opened
 * (so no toast explains why a button is disabled).
 */
export function ErrorRecovery({
  title,
  message,
  note,
  actionLabel,
  onAction,
  busy,
  onHelp,
  colors,
}: ComponentThemeProps & {
  /** Toast text; leave `title` out to show no toast. */
  title?: string;
  message?: string;
  note?: string;
  /** Leave out when the screen's own primary button already is the next step. */
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  onHelp?: () => void;
}) {
  const toast = useToast();
  return <View testID="error-recovery" style={styles.root}>
    {title ? <ToastNotice title={title} message={message} tone="error" /> : null}
    {/* Without a toast layer (isolated tests) ToastNotice renders inline, so the text is never lost. */}
    {note ? <Text accessibilityLiveRegion={toast ? 'polite' : 'none'} style={[typography.body, styles.note, { color: colors?.muted }]}>{note}</Text> : null}
    {actionLabel ? <AppButton label={actionLabel} loading={busy} onPress={onAction} colors={colors} /> : null}
    {onHelp ? <HelpLink onPress={onHelp} colors={colors} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  note: { textAlign: 'center' },
  help: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  helpText: { textAlign: 'center', textDecorationLine: 'underline' },
});
