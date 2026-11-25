import { useSyncExternalStore } from 'react';
import type { Incident } from './failure';

/**
 * Why the person was moved to another screen. Kept in memory, not in the address, so nothing about the failed room
 * travels in a route. It stays until the person closes it or starts something new.
 */
let current: Incident | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function setIncident(incident: Incident): void {
  current = incident;
  emit();
}

export function clearIncident(): void {
  if (!current) return;
  current = undefined;
  emit();
}

export const peekIncident = (): Incident | undefined => current;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function useIncident(destination: Incident['destination']): Incident | undefined {
  const incident = useSyncExternalStore(subscribe, peekIncident, peekIncident);
  return incident?.destination === destination ? incident : undefined;
}
