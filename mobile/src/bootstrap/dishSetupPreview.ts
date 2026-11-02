import type { UserPreferences } from '../data/api/contracts';
import { emptyPreferences, initialSetupDraft, type SetupRoom } from '../features/context/services/dishSetup';
import type { DishSetupGateway, SetupIntent, SetupReply } from '../features/context/services/dishSetupGateway';
import { dishSetupCatalogue } from './dishSetupCatalogue';

export const dishSetupScenarios = ['default', 'loading', 'load-error', 'shortage15', 'shortage7', 'offline', 'save-error', 'timeout', 'ack-read-error', 'stale', 'closed', 'taxonomy-empty'] as const;
export type DishSetupScenario = typeof dishSetupScenarios[number];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function createDishSetupPreview(scenario: DishSetupScenario = 'default'): DishSetupGateway {
  let room: SetupRoom | undefined = scenario === 'closed' ? { id: 'ui-room', code: 'MCK234', version: 1, state: 'CLOSED' } : undefined;
  let preferences: UserPreferences | undefined, lostReply = false, rejected = false, failRead = false, stale = false;
  let settings = { ...initialSetupDraft(), dishCount: scenario === 'shortage15' ? 20 : 15 };
  const cache = new Map<string, { body: string; reply: SetupReply }>();
  const delay = async () => { if (scenario === 'loading') await new Promise(resolve => setTimeout(resolve, 600)); };
  return {
    read: async () => {
      await delay();
      if (scenario === 'load-error' || failRead) { failRead = false; throw new Error('Synthetic read failure'); }
      return { catalogue: scenario === 'taxonomy-empty' ? { categories: [], cuisines: [] } : dishSetupCatalogue,
        friends: [{ id: 'ui-friend-linh', label: 'Linh' }, { id: 'ui-friend-nam', label: 'Nam' }, { id: 'ui-friend-minh', label: 'Minh' }],
        connected: scenario !== 'offline', settings: clone(settings), accountDefaults: emptyPreferences(), ownRoomPreferences: preferences ? clone(preferences) : undefined, room: room ? { ...room } : undefined };
    },
    write: async (intent: SetupIntent) => {
      await delay();
      const old = cache.get(intent.requestId), body = JSON.stringify(intent);
      if (old) return old.body === body ? clone(old.reply) : { ok: false, code: 'REJECTED' };
      if (room?.state === 'CLOSED') return { ok: false, code: 'CLOSED' };
      if (scenario === 'offline') return { ok: false, code: 'REJECTED' };
      if (scenario === 'stale' && !stale) { stale = true; return { ok: false, code: 'STALE' }; }
      if (intent.room && (intent.room.id !== room?.id || intent.room.version !== room.version)) return { ok: false, code: 'STALE' };
      if (intent.kind === 'settings') {
        const available = scenario === 'shortage15' ? 15 : scenario === 'shortage7' ? 7 : 20;
        if (intent.draft.dishCount > available) return { ok: false, code: 'SHORTAGE', available, requested: intent.draft.dishCount };
        settings = clone(intent.draft);
      } else {
        if (!room) return { ok: false, code: 'CLOSED' };
        if (scenario === 'save-error' && !rejected) { rejected = true; return { ok: false, code: 'REJECTED' }; }
        preferences = clone(intent.preferences);
      }
      room = { id: 'ui-room', code: 'MCK234', version: (room?.version ?? 0) + 1, state: 'LOBBY' };
      const reply: SetupReply = { ok: true, room: { ...room } };
      cache.set(intent.requestId, { body, reply: clone(reply) });
      if (scenario === 'ack-read-error' && !lostReply) { lostReply = true; failRead = true; }
      if (scenario === 'timeout' && !lostReply) { lostReply = true; return { ok: false, code: 'UNKNOWN' }; }
      return reply;
    },
  };
}
