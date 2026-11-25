import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../forms/ScaledText';
import { AppButton } from '../buttons/AppButton';
import { AppIcon, type AppIconName } from '../icons/AppIcon';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import { ToastNotice, useToast } from './Toast';

/** Subtle pill entry to "Trợ giúp & Báo lỗi", shown only on persistent failures (≥2 retries) or structural errors. */
export function HelpLink({ onPress, colors }: ComponentThemeProps & { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Báo lỗi hoặc cần trợ giúp" onPress={onPress}
    style={({ pressed }) => [styles.help, { backgroundColor: colors?.soft, borderColor: colors?.line, opacity: pressed ? 0.75 : 1 }]}>
    <AppIcon name="help" size={15} color={colors?.muted} />
    <Text style={[typography.caption, styles.helpText, { color: colors?.text }]}>Báo lỗi &amp; trợ giúp</Text>
  </Pressable>;
}

/**
 * Failure recovery component:
 * - `variant="inline"`: red toast + compact action button (plus optional help pill when threshold is met).
 * - `variant="empty"`: centered friendly empty-error state (circular icon badge + calm title & copy + action button)
 *   so when an initial screen load fails, the page never looks blank after the toast dismisses.
 */
export function ErrorRecovery({
  title,
  message,
  heading,
  note,
  icon = 'warning',
  variant = 'inline',
  actionLabel,
  onAction,
  busy,
  onHelp,
  colors,
}: ComponentThemeProps & {
  /** Toast text; leave `title` out to show no toast. */
  title?: string;
  message?: string;
  /** Visible heading inside `variant="empty"` when `title` is used as toast. */
  heading?: string;
  note?: string;
  icon?: AppIconName;
  variant?: 'inline' | 'empty';
  /** Leave out when the screen's own primary button already is the next step. */
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  onHelp?: () => void;
}) {
  const toast = useToast();
  if (variant === 'empty') {
    const visibleTitle = heading ?? title;
    const visibleBody = note ?? message;
    return <View testID="error-recovery" accessibilityRole="summary" style={styles.emptyRoot}>
      {title && toast ? <ToastNotice title={title} message={message} tone="error" /> : null}
      <View style={[styles.emptyBadge, { backgroundColor: colors?.warm }]}>
        <AppIcon name={icon} size={28} color={colors?.warning ?? '#D97706'} />
      </View>
      {visibleTitle ? <Text accessibilityRole="header" style={[typography.titleMedium, styles.emptyTitle, { color: colors?.text }]}>{visibleTitle}</Text> : null}
      {visibleBody ? <Text style={[typography.body, styles.emptyBody, { color: colors?.muted }]}>{visibleBody}</Text> : null}
      {actionLabel ? <AppButton label={actionLabel} loading={busy} onPress={onAction} colors={colors} style={styles.emptyAction} /> : null}
      {onHelp ? <HelpLink onPress={onHelp} colors={colors} /> : null}
    </View>;
  }
  return <View testID="error-recovery" style={styles.root}>
    {title ? <ToastNotice
      title={title}
      message={message}
      tone="error"
      actionLabel={onHelp ? 'Báo lỗi' : undefined}
      actionAccessibilityLabel={onHelp ? 'Báo lỗi hoặc cần trợ giúp' : undefined}
      onAction={onHelp}
    /> : null}
    {/* Without a toast layer (isolated tests) ToastNotice renders inline, so the text is never lost. */}
    {note ? <Text accessibilityLiveRegion={toast ? 'polite' : 'none'} style={[typography.body, styles.note, { color: colors?.muted }]}>{note}</Text> : null}
    {actionLabel ? <AppButton label={actionLabel} loading={busy} onPress={onAction} colors={colors} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  note: { textAlign: 'center' },
  help: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, alignSelf: 'center' },
  helpText: { fontFamily: 'InterSemiBold' },
  emptyRoot: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.md },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center', maxWidth: 320 },
  emptyAction: { alignSelf: 'stretch', marginTop: spacing.xs },
});
