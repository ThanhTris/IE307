import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReadResult, RoomSnapshot } from '../../src/data/api/contracts';
import { useLobby, type LobbyRepository } from '../../src/features/rooms/hooks/useLobby';
import { RoomUpdatesContext } from '../../src/features/rooms/hooks/useRoomUpdates';
import type { RoomSubscription } from '../../src/features/rooms/services/roomRealtime';

const room: RoomSnapshot = {
  roomId: '11111111-1111-4111-8111-111111111111', code: 'GCD234', version: 2, state: 'LOBBY', hostUserId: 'host',
  members: [
    { userId: 'host', displayName: 'Host', isHost: true, ready: true, joinedAt: '2026-11-18T01:00:00Z' },
    { userId: 'guest', displayName: 'Khách', isHost: false, ready: true, joinedAt: '2026-11-18T01:01:00Z' },
  ],
  round: 1, poolVersion: 1, pool: [], expiresAt: '2026-11-18T02:00:00Z',
};
const ok = (data: RoomSnapshot): ReadResult<RoomSnapshot> => ({ ok: true, data });
const fail = (messageKey: 'ROOM_NOT_FOUND' | 'TIMEOUT'): ReadResult<RoomSnapshot> => ({ ok: false, error: { messageKey } });

async function renderLobby(options: { read?: ReadResult<RoomSnapshot>; userId?: string; write?: Partial<LobbyRepository> } = {}) {
  let syncError!: (code: 'NOT_MEMBER' | 'NETWORK_ERROR') => void;
  const repository: LobbyRepository = {
    getRoomSnapshot: jest.fn().mockResolvedValue(options.read ?? ok(room)),
    listFriends: jest.fn(), startRound: jest.fn(), updateContext: jest.fn(), leaveRoom: jest.fn(),
    cancelRoom: jest.fn(), inviteToRoom: jest.fn(), ...options.write,
  };
  const subscribe: RoomSubscription = (_id, _signal, _status, onError) => {
    syncError = messageKey => onError({ messageKey });
    return () => {};
  };
  const wrapper = ({ children }: PropsWithChildren) => <RoomUpdatesContext.Provider value={subscribe}>{children}</RoomUpdatesContext.Provider>;
  const onExit = jest.fn(), onHome = jest.fn();
  const view = await renderHook(() => useLobby({
    repository, roomId: room.roomId, currentUserId: options.userId ?? 'host', onHome, onExit,
  }), { wrapper });
  return { view, repository, onExit, onHome, syncError: (code: 'NOT_MEMBER' | 'NETWORK_ERROR') => syncError(code) };
}

test('a room that no longer exists is left once', async () => {
  const lobby = await renderLobby({ read: fail('ROOM_NOT_FOUND') });
  await waitFor(() => expect(lobby.onExit).toHaveBeenCalledWith({ code: 'ROOM_NOT_FOUND' }));
  await act(async () => { lobby.syncError('NOT_MEMBER'); });
  expect(lobby.onExit).toHaveBeenCalledTimes(1);
});

test('a first load that only timed out stays with a retry', async () => {
  const lobby = await renderLobby({ read: fail('TIMEOUT') });
  await waitFor(() => expect(lobby.view.result.current.loadState).toBe('error'));
  expect(lobby.onExit).not.toHaveBeenCalled();
});

test('a passing sync problem keeps the room on screen', async () => {
  const lobby = await renderLobby();
  await waitFor(() => expect(lobby.view.result.current.loadState).toBe('ready'));
  await act(async () => { lobby.syncError('NETWORK_ERROR'); });
  expect(lobby.view.result.current.snapshot).toEqual(room);
  expect(lobby.onExit).not.toHaveBeenCalled();
});

test.each([
  ['CANCELLED', 'guest', { code: 'ROOM_TERMINAL', title: 'Chủ phòng đã hủy phòng' }],
  ['CANCELLED', 'host', { code: 'ROOM_TERMINAL', title: 'Phòng đã bị hủy' }],
  ['EXPIRED', 'host', { code: 'ROOM_EXPIRED', title: 'Phòng đã hết hạn' }],
] as const)('a %s room takes the %s home with the reason', async (state, userId, exit) => {
  const lobby = await renderLobby({ read: ok({ ...room, state }), userId });
  await waitFor(() => expect(lobby.onExit).toHaveBeenCalledWith(exit));
  expect(lobby.onExit).toHaveBeenCalledTimes(1);
});

test('someone removed from the room is taken home', async () => {
  const lobby = await renderLobby({ userId: 'removed' });
  await waitFor(() => expect(lobby.onExit).toHaveBeenCalledWith({ code: 'NOT_MEMBER' }));
});

test('cancelling your own room is not reported to you as a failure', async () => {
  const cancelRoom = jest.fn().mockResolvedValue({ ok: true, requestId: 'r', data: undefined });
  const lobby = await renderLobby({ write: { cancelRoom } });
  await waitFor(() => expect(lobby.view.result.current.loadState).toBe('ready'));
  (lobby.repository.getRoomSnapshot as jest.Mock).mockResolvedValue(ok({ ...room, state: 'CANCELLED', version: 3 }));
  await act(async () => { await lobby.view.result.current.runWrite('cancel'); });
  expect(lobby.onHome).toHaveBeenCalledTimes(1);
  expect(lobby.onExit).not.toHaveBeenCalled();
});

test('a server error on an action stays, shows plain words and can be reported', async () => {
  const startRound = jest.fn().mockResolvedValue({ ok: false, requestId: 'r', error: { messageKey: 'NETWORK_ERROR' } });
  const lobby = await renderLobby({ write: { startRound } });
  await waitFor(() => expect(lobby.view.result.current.loadState).toBe('ready'));
  await act(async () => { await lobby.view.result.current.runWrite('start'); });
  expect(lobby.view.result.current.notice).toContain('Không kết nối được máy chủ');
  expect(lobby.view.result.current.notice).not.toMatch(/[A-Z_]{6,}|snapshot/);
  expect(lobby.view.result.current.actionFailure).toMatchObject({ errorCode: 'NETWORK_ERROR', screen: 'room/lobby', action: 'start' });
  expect(lobby.onExit).not.toHaveBeenCalled();
});

test('an action refused because the room ended leaves the lobby', async () => {
  const startRound = jest.fn().mockResolvedValue({ ok: false, requestId: 'r', error: { messageKey: 'ROOM_TERMINAL' } });
  const lobby = await renderLobby({ write: { startRound } });
  await waitFor(() => expect(lobby.view.result.current.loadState).toBe('ready'));
  await act(async () => { await lobby.view.result.current.runWrite('start'); });
  expect(lobby.onExit).toHaveBeenCalledWith({ code: 'ROOM_TERMINAL' });
});
