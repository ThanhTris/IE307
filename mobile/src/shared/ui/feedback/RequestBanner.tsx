import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';
import { StatusNotice } from './StatusNotice';
import { ToastNotice } from './Toast';

export type RequestBannerState = 'offline' | 'stale' | 'error' | 'info';

/**
 * Request problems: an API error is a red toast, offline or a stale copy is an amber toast (with the time of the copy),
 * plain information stays on the page. A retry button, when given, stays on the page.
 */
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
  const stale = state === 'stale' && fetchedAtLabel ? `Bản lưu lúc ${fetchedAtLabel} · có thể đã cũ` : undefined;
  const text = [message, stale].filter(Boolean).join('\n') || undefined;
  if (state === 'offline' || state === 'stale') {
    return <>
      <ToastNotice title={title} message={text} tone="warning" />
      {actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={colors} /> : null}
    </>;
  }
  return <StatusNotice title={title} message={text} tone={state === 'error' ? 'error' : undefined} actionLabel={actionLabel} onAction={onAction} colors={colors} />;
}
