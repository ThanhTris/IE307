import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../buttons/AppButton';
import { AppIcon } from '../icons/AppIcon';
import type { ComponentThemeProps } from '../types';
import { ToastNotice, toastPalette } from './Toast';

/**
 * A state of the page.
 * - `tone="error"` (the API / server failed): shown as a red toast, with the retry button left on the page.
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
  const button = actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={colors} /> : null;
  if (tone === 'error') return <><ToastNotice title={title} message={message} tone="error" />{button}</>;
  const accent = tone ? toastPalette[tone].accent : colors?.muted;
  return <View accessibilityRole="summary" accessibilityLiveRegion="polite" style={styles.root}>
    {tone ? <AppIcon name={tone} size={22} color={accent} /> : null}
    <Text accessibilityRole="header" style={[styles.title, { color: colors?.text }]}>{title}</Text>
    {message ? <Text style={[styles.message, { color: colors?.muted }]}>{message}</Text> : null}
    {button ? <View style={styles.action}>{button}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  title: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  message: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: 6 },
});
