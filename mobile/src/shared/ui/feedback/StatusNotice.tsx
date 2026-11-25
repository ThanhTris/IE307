import { StyleSheet, View } from 'react-native';
import { Text } from '../forms/ScaledText';
import { useShellTheme } from '../../lib/useShellTheme';
import { spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import { AppIcon } from '../icons/AppIcon';
import type { ComponentThemeProps } from '../types';
import { ToastNotice, toastPalette, useToast } from './Toast';

/**
 * A state of the page.
 * - `tone="error"` without `actionLabel`: transient red toast.
 * - `tone="error"` with `actionLabel`: shows a red toast AND keeps a friendly centered Empty-Error state
 *   on the page so the screen never looks blank after the toast fades.
 * - anything else (empty, loading, closed, needs a step): plain centred text on the page, no card and no toast.
 */
export function StatusNotice({
  title,
  message,
  tone,
  actionLabel,
  onAction,
  colors,
}: ComponentThemeProps & {
  title: string;
  message?: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toast = useToast();
  const { colors: themeColors } = useShellTheme();
  const activeColors = colors ?? themeColors;
  const button = actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={activeColors} /> : null;
  if (tone === 'error') {
    if (!button) return <ToastNotice title={title} message={message} tone="error" />;
    return <View accessibilityRole="summary" accessibilityLiveRegion="polite" style={styles.emptyError}>
      {toast ? <ToastNotice title={title} message={message} tone="error" /> : null}
      <View style={[styles.badge, { backgroundColor: activeColors.warm }]}>
        <AppIcon name="warning" size={26} color={activeColors.warning} />
      </View>
      <Text accessibilityRole="header" style={[typography.titleMedium, styles.title, { color: activeColors.text }]}>{title}</Text>
      {message ? <Text style={[typography.body, styles.message, { color: activeColors.muted }]}>{message}</Text> : null}
      <View style={styles.action}>{button}</View>
    </View>;
  }
  const accent = tone ? toastPalette[tone].accent : activeColors.muted;
  return <View accessibilityRole="summary" accessibilityLiveRegion="polite" style={styles.root}>
    {tone ? <AppIcon name={tone} size={22} color={accent} /> : null}
    <Text accessibilityRole="header" style={[styles.plainTitle, { color: activeColors.text }]}>{title}</Text>
    {message ? <Text style={[styles.plainMessage, { color: activeColors.muted }]}>{message}</Text> : null}
    {button ? <View style={styles.action}>{button}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  emptyError: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  badge: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', maxWidth: 320 },
  plainTitle: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  plainMessage: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: 6 },
});
