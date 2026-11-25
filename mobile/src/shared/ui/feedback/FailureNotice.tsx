import { useEffect } from 'react';
import type { ComponentThemeProps } from '../types';
import { useHelp } from '../../help/HelpContext';
import { clearIncident, useIncident } from '../../errors/incident';
import type { Incident } from '../../errors/failure';
import { ToastNotice, useToast } from './Toast';

/**
 * Shown on the screen the person was sent to (Home or Sign-in) as a floating Toast (0px layout footprint)
 * so it never pushes the page content down. Falls back to inline ToastNotice in isolated tests without ToastProvider.
 */
export function FailureNotice({ destination }: ComponentThemeProps & { destination: Incident['destination'] }) {
  const incident = useIncident(destination);
  const help = useHelp();
  const toast = useToast();

  useEffect(() => {
    if (!toast || !incident) return;
    const tone = incident.tone ?? (incident.report ? 'error' : 'info');
    const report = incident.report;
    toast.show({
      title: incident.title,
      message: incident.message,
      tone,
      ...(report && help ? {
        actionLabel: 'Báo lỗi',
        actionAccessibilityLabel: 'Báo lỗi hoặc cần trợ giúp',
        onAction: () => help.open(report),
      } : {}),
    });
    clearIncident();
  }, [toast, incident, help]);

  if (toast || !incident) return null;
  const tone = incident.tone ?? (incident.report ? 'error' : 'info');
  const report = incident.report;
  return <ToastNotice
    title={incident.title}
    message={incident.message}
    tone={tone}
    actionLabel={report && help ? 'Báo lỗi' : undefined}
    actionAccessibilityLabel={report && help ? 'Báo lỗi hoặc cần trợ giúp' : undefined}
    onAction={report && help ? () => { clearIncident(); help.open(report); } : undefined}
  />;
}
