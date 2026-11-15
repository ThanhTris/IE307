import { View } from 'react-native';
import type { ComponentThemeProps } from '../types';
import { LoadingState } from './LoadingState';
import { StatusNotice } from './StatusNotice';

export type ProcessStateKind =
  | 'loading'
  | 'submitting'
  | 'unknown'
  | 'finalizing'
  | 'error'
  | 'success'
  | 'closed';

/** Busy states render a skeleton; the title/message always goes out as a toast. */
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
    <View accessibilityLiveRegion="polite">
      {busy ? <LoadingState label={title} rows={1} colors={colors} /> : null}
      <StatusNotice title={title} message={message} tone={tone} actionLabel={retryLabel} onAction={onRetry} colors={colors} />
    </View>
  );
}
