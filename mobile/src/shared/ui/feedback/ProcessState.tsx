import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { spacing } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import { StatusNotice } from './StatusNotice';

export type ProcessStateKind =
  | 'loading'
  | 'submitting'
  | 'unknown'
  | 'finalizing'
  | 'error'
  | 'success'
  | 'closed';

export function ProcessState({
  state,
  title,
  message,
  retryLabel,
  onRetry,
  colors,
}: ComponentThemeProps & {
  state: ProcessStateKind;
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const busy =
    state === 'loading' || state === 'submitting' || state === 'unknown' || state === 'finalizing';
  const tone =
    state === 'error' ? 'error' : state === 'closed' ? 'warning' : state === 'success' ? 'success' : 'info';
  return (
    <View accessibilityLiveRegion="polite" style={styles.processState}>
      {busy ? <ActivityIndicator accessibilityLabel={title} color={colors?.primary} /> : null}
      <StatusNotice
        title={title}
        message={message}
        tone={tone}
        actionLabel={retryLabel}
        onAction={onRetry}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  processState: { gap: spacing.sm },
});
