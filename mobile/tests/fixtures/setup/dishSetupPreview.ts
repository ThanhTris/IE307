import type { UserPreferences } from '../../../src/data/api/contracts';
import { emptyPreferences, initialSetupDraft, type SetupDraft, type SetupRoom } from '../../../src/features/context/services/dishSetup';
import type { DishSetupGateway, SetupIntent, SetupReply } from '../../../src/features/context/services/dishSetupGateway';
import { dishSetupCatalogue } from '../../../src/features/context/services/dishSetupCatalogue';

export const dishSetupScenarios = ['default', 'loading', 'load-error', 'shortage15', 'shortage7', 'shortage3', 'offline', 'create-error', 'save-error', 'timeout', 'ack-read-error', 'stale', 'closed', 'taxonomy-empty', 'member'] as const;
export type DishSetupScenario = typeof dishSetupScenarios[number];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function createDishSetupPreview(scenario: DishSetupScenario = 'default', seed?: {
  room?: SetupRoom; preferences?: UserPreferences; accountDefaults?: UserPreferences; settings?: Partial<SetupDraft>;
}, at = Date.now()): DishSetupGateway {
  let room: SetupRoom | undefined = scenario === 'closed' || scenario === 'member' ? { id: 'ui-room', code: 'MCK234', version: 1, state: scenario === 'closed' ? 'CLOSED' : 'LOBBY' } : seed?.room;
  let preferences: UserPreferences | undefined = seed?.preferences, lostReply = false, rejected = false, failRead = false, stale = false, cancelled = false;
  let settings = { ...initialSetupDraft(at), dishCount: scenario === 'shortage15' ? 20 : 15, ...seed?.settings };
  const cache = new Map<string, { body: string; reply: SetupReply }>();
  const delay = async () => { if (scenario === 'loading') await new Promise(resolve => setTimeout(resolve, 600)); };
  return {
    read: async () => {
      await delay();
      if (scenario === 'load-error' || failRead) { failRead = false; throw new Error('Synthetic read failure'); }
      return { catalogue: scenario === 'taxonomy-empty' ? { categories: [], cuisines: [] } : dishSetupCatalogue,
        friends: [{ id: 'ui-friend-linh', label: 'Linh' }, { id: 'ui-friend-nam', label: 'Nam' }, { id: 'ui-friend-minh', label: 'Minh' }],
        connected: scenario !== 'offline', canEditSettings: scenario !== 'member', hasRecentHistory: false, closedReason: cancelled ? 'cancelled' : 'closed', settings: clone(settings), accountDefaults: clone(seed?.accountDefaults ?? emptyPreferences()), ownRoomPreferences: preferences ? clone(preferences) : undefined, room: room ? { ...room } : undefined };
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
        if (scenario === 'member') return { ok: false, code: 'REJECTED' };
        if (scenario === 'create-error' && !rejected) { rejected = true; return { ok: false, code: 'REJECTED' }; }
        const available = scenario === 'shortage15' ? 15 : scenario === 'shortage7' ? 7 : scenario === 'shortage3' ? 3 : 20;
        if (intent.draft.dishCount > available) return { ok: false, code: 'SHORTAGE', available, requested: intent.draft.dishCount };
        settings = clone(intent.draft);
      } else if (intent.kind === 'preferences') {
        if (!room) return { ok: false, code: 'CLOSED' };
        if (scenario === 'save-error' && !rejected) { rejected = true; return { ok: false, code: 'REJECTED' }; }
        preferences = clone(intent.preferences);
      } else {
        if (!room || scenario === 'member') return { ok: false, code: 'REJECTED' };
        cancelled = true;
      }
      room = { id: 'ui-room', code: 'MCK234', version: (room?.version ?? 0) + 1, state: cancelled ? 'CLOSED' : 'LOBBY' };
      const reply: SetupReply = { ok: true, room: { ...room } };
      cache.set(intent.requestId, { body, reply: clone(reply) });
      if (scenario === 'ack-read-error' && !lostReply) { lostReply = true; failRead = true; }
      if (scenario === 'timeout' && !lostReply) { lostReply = true; return { ok: false, code: 'UNKNOWN' }; }
      return reply;
    },
  };
}
