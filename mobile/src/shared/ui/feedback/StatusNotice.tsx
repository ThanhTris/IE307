import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';
import { ToastNotice } from './Toast';

/**
 * Messages are shown as toasts only; the app has no inline notice cards.
 * When recovery needs a tap, a plain button stays on screen (no card around it).
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
  return (
    <>
      <ToastNotice title={title} message={message} tone={tone} />
      {actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={colors} /> : null}
    </>
  );
}
