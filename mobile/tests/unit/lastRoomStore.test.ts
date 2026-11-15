import { clearLastRoom, readLastRoom, saveLastRoom } from '../../src/features/rooms/services/lastRoomStore';
import { resumableRoom } from '../../src/features/home/hooks/useHomeRoom';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: async (k: string, v: string) => { store.set(k, v); },
    getItemAsync: async (k: string) => store.get(k) ?? null,
    deleteItemAsync: async (k: string) => { store.delete(k); },
  };
});

test('the last room is kept per account and can be cleared', async () => {
  await saveLastRoom('user-a', 'room-1');
  await saveLastRoom('user-b', 'room-2');
  expect(await readLastRoom('user-a')).toBe('room-1');
  expect(await readLastRoom('user-b')).toBe('room-2');
  await clearLastRoom('user-a');
  expect(await readLastRoom('user-a')).toBeUndefined();
  expect(await readLastRoom('user-b')).toBe('room-2');
});

test('only the lobby and round 1 can be entered again; round 2 cannot', () => {
  for (const state of ['LOBBY', 'ROUND_1', 'WAITING_1', 'VOTING'] as const) expect(resumableRoom({ state } as never)).toBe(true);
  for (const state of ['ROUND_2', 'WAITING_2', 'DECIDED', 'NO_CONSENSUS', 'EXPIRED'] as const) expect(resumableRoom({ state } as never)).toBe(false);
});
