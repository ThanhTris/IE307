import type { ComponentThemeProps } from '../types';
import { useHelp } from '../../help/HelpContext';
import { clearIncident, useIncident } from '../../errors/incident';
import type { Incident } from '../../errors/failure';
import { ErrorRecovery } from './ErrorRecovery';

/**
 * Shown on the screen the person was sent to: why they are here, and "Báo lỗi" when it was not something they did.
 * It is the only place this failure offers reporting.
 */
export function FailureNotice({ destination, colors }: ComponentThemeProps & { destination: Incident['destination'] }) {
  const incident = useIncident(destination);
  const help = useHelp();
  if (!incident) return null;
  const report = incident.report;
  return <ErrorRecovery title={incident.title} message={incident.message} note={`${incident.title}. ${incident.message}`}
    actionLabel="Đã hiểu" onAction={clearIncident}
    onHelp={report && help ? () => help.open(report) : undefined} colors={colors} />;
}
