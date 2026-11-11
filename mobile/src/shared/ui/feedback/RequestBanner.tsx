import type { ComponentThemeProps } from '../types';
import { StatusNotice } from './StatusNotice';

export type RequestBannerState = 'offline' | 'stale' | 'error' | 'info';

/** Request problems are reported by toast; a stale copy adds its timestamp to the toast message. */
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
  const stale = state === 'stale' && fetchedAtLabel ? `Bản lưu lúc ${fetchedAtLabel} · có thể đã cũ` : undefined;
  return (
    <StatusNotice
      title={title}
      message={[message, stale].filter(Boolean).join('\n') || undefined}
      tone={tone}
      actionLabel={actionLabel}
      onAction={onAction}
      colors={colors}
    />
  );
}
