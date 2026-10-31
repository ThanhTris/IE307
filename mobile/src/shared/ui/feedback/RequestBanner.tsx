import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import { StatusNotice } from './StatusNotice';

export type RequestBannerState = 'offline' | 'stale' | 'error' | 'info';

export function RequestBanner({
  state,
  title,
  message,
  fetchedAtLabel,
  actionLabel,
  onAction,
  colors,
}: ComponentThemeProps & {
  state: RequestBannerState;
  title: string;
  message?: string;
  fetchedAtLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const tone = state === 'error' ? 'error' : state === 'offline' ? 'warning' : 'info';
  return (
    <View style={styles.requestBanner}>
      <StatusNotice
        title={title}
        message={message}
        tone={tone}
        actionLabel={actionLabel}
        onAction={onAction}
        colors={colors}
      />
      {state === 'stale' && fetchedAtLabel ? (
        <Text style={[styles.helper, { color: colors?.muted }]}>
          Bản lưu lúc {fetchedAtLabel} · có thể đã cũ
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  requestBanner: { gap: spacing.xs },
  helper: { ...typography.caption },
});
