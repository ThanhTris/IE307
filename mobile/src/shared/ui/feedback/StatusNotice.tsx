import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';

export function StatusNotice({
  title,
  message,
  tone = 'info',
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
  const toneColor =
    tone === 'success'
      ? colors?.green
      : tone === 'warning'
        ? colors?.warning
        : tone === 'error'
          ? colors?.danger
          : colors?.primary;
  return (
    <View
      accessibilityRole="summary"
      style={[styles.notice, { backgroundColor: colors?.soft, borderColor: toneColor }]}
    >
      <Text style={[styles.noticeTitle, { color: toneColor }]}>{title}</Text>
      {message ? <Text style={[styles.body, { color: colors?.text }]}>{message}</Text> : null}
      {actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={colors} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { padding: spacing.lg, borderRadius: radii.lg, borderLeftWidth: 4, gap: spacing.sm },
  noticeTitle: { ...typography.bodyBold },
  body: { ...typography.body },
});
