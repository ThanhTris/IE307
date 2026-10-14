import type { DemoDestination } from './components/MockDemo';

export function pathForDemoDestination(destination: DemoDestination) {
  if (destination === 'lobby') return '/gm11/lobby' as const;
  if (destination === 'room-status') return '/gm11/status' as const;
  if (destination === 'friends') return '/gm14/friends' as const;
  if (destination === 'inbox') return '/gm14/inbox' as const;
  return '/gm14/history' as const;
}
