import { useSyncExternalStore } from 'react';
import type { ReportContext } from './errorReport';
import type { Incident } from './failure';

const LAST_FAILURE_TTL_MS = 30 * 60 * 1000;

/**
 * Why the person was moved to another screen. Kept in memory, not in the address, so nothing about the failed room
 * travels in a route. It stays until the person closes it or starts something new.
 */
let current: Incident | undefined;
let lastFailure: { context: ReportContext; recordedAt: number } | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function setIncident(incident: Incident): void {
  current = incident;
  if (incident.report) recordLastFailure(incident.report);
  emit();
}

export function clearIncident(): void {
  if (!current) return;
  current = undefined;
  emit();
}

export const peekIncident = (): Incident | undefined => current;

/** Remembers the latest reportable failure context (allowlisted fields only) for "Cá nhân → Trợ giúp & Báo lỗi". */
export function recordLastFailure(context: ReportContext): void {
  if (context.errorCode === 'USER_FEEDBACK') return;
  lastFailure = {
    context: { ...context, occurredAt: context.occurredAt ?? new Date().toISOString() },
    recordedAt: Date.now(),
  };
}

export function peekLastFailure(): ReportContext | undefined {
  if (!lastFailure) return undefined;
  if (Date.now() - lastFailure.recordedAt > LAST_FAILURE_TTL_MS) {
    lastFailure = undefined;
    return undefined;
  }
  return lastFailure.context;
}

export function clearLastFailure(): void {
  lastFailure = undefined;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function useIncident(destination: Incident['destination']): Incident | undefined {
  const incident = useSyncExternalStore(subscribe, peekIncident, peekIncident);
  return incident?.destination === destination ? incident : undefined;
}
