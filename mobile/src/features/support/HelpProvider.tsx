import { useMemo, useState, type PropsWithChildren } from 'react';
import { HelpContext, type HelpApi } from '../../shared/help/HelpContext';
import type { ReportContext } from '../../shared/errors/errorReport';
import { peekLastFailure } from '../../shared/errors/incident';
import { ReportErrorSheet } from './components/ReportErrorSheet';

/**
 * Stable screen id from the route file names, never from the address: `join/[code]` becomes `join/code`, so a room code
 * can never end up in a report.
 */
export function screenIdFromSegments(segments: readonly string[]): string {
  const id = segments
    .filter(segment => !segment.startsWith('('))
    .map(segment => segment.replace(/\[(?:\.\.\.)?([^\]]*)\]/g, '$1').toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/')
    .slice(0, 60);
  return /^[a-z0-9]/.test(id) ? id : 'home';
}

export function HelpProvider({ segments, children }: PropsWithChildren<{ segments: readonly string[] }>) {
  const [context, setContext] = useState<ReportContext>();
  const [recentFailure, setRecentFailure] = useState<ReportContext>();
  const screen = screenIdFromSegments(segments);
  const api = useMemo<HelpApi>(() => ({
    open: next => {
      setRecentFailure(next ? undefined : peekLastFailure());
      setContext(next ?? { errorCode: 'USER_FEEDBACK', screen, occurredAt: new Date().toISOString() });
    },
  }), [screen]);
  return <HelpContext.Provider value={api}>
    {children}
    <ReportErrorSheet
      context={context}
      recentFailure={recentFailure}
      onClose={() => { setContext(undefined); setRecentFailure(undefined); }}
    />
  </HelpContext.Provider>;
}
