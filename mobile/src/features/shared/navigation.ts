import type { DemoDestination } from './components/MockDemo';

export function pathForDemoDestination(destination: DemoDestination) {
  if (destination === 'lobby') return '/room/lobby' as const;
  if (destination === 'room-status') return '/room/status' as const;
  if (destination === 'friends') return '/friends' as const;
  if (destination === 'inbox') return '/inbox' as const;
  return '/history' as const;
}
