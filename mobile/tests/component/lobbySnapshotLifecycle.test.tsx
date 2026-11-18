import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import type { ReadResult, RoomSnapshot } from '../../src/data/api/contracts';
import { useLobby, type LobbyRepository } from '../../src/features/rooms/hooks/useLobby';
import { RoomUpdatesContext } from '../../src/features/rooms/hooks/useRoomUpdates';
import type { RoomSubscription } from '../../src/features/rooms/services/roomRealtime';

const snapshot: RoomSnapshot = {
  roomId: '11111111-1111-4111-8111-111111111111',
  code: 'GCD234',
  version: 2,
  state: 'LOBBY',
  hostUserId: 'host',
  members: [{ userId: 'host', displayName: 'Host', isHost: true, ready: true, joinedAt: '2026-11-18T01:00:00Z' }],
  round: 1,
  poolVersion: 1,
  pool: [],
  expiresAt: '2026-11-18T02:00:00Z',
};

const timeoutResult = { ok: false, error: { messageKey: 'TIMEOUT' } } as const;

async function renderLobby() {
  let resolveInitial!: (result: ReadResult<RoomSnapshot>) => void;
  let rejectInitial!: (error: Error) => void;
  let connect!: () => void;
  let loseMembership!: () => void;
  const initial = new Promise<ReadResult<RoomSnapshot>>((resolve, reject) => {
    resolveInitial = resolve;
    rejectInitial = reject;
  });
  const getRoomSnapshot = jest.fn()
    .mockReturnValueOnce(initial)
    .mockResolvedValue({ ok: true, data: snapshot });
  const repository: LobbyRepository = {
    getRoomSnapshot,
    listFriends: jest.fn(),
    startRound: jest.fn(),
    updateContext: jest.fn(),
    leaveRoom: jest.fn(),
    cancelRoom: jest.fn(),
    inviteToRoom: jest.fn(),
  };
  const subscribe: RoomSubscription = (_roomId, _onSignal, onStatus, onError) => {
    connect = () => onStatus('live');
    loseMembership = () => onError({ messageKey: 'NOT_MEMBER' });
    return () => {};
  };
  const wrapper = ({ children }: PropsWithChildren) => (
    <RoomUpdatesContext.Provider value={subscribe}>{children}</RoomUpdatesContext.Provider>
  );
  const { result } = await renderHook(() => useLobby({
    repository, roomId: snapshot.roomId, currentUserId: snapshot.hostUserId, onHome: jest.fn(),
  }), { wrapper });
  return { result, getRoomSnapshot, connect, loseMembership, resolveInitial, rejectInitial };
}

test.each(['API timeout result', 'transport rejection'] as const)(
  'keeps the lobby ready when the initial load settles with a late %s',
  async failure => {
    const lobby = await renderLobby();
    expect(lobby.result.current.loadState).toBe('loading');
    expect(lobby.getRoomSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => { lobby.connect(); });
    expect(lobby.result.current.loadState).toBe('ready');
    expect(lobby.result.current.snapshot).toBe(snapshot);

    await act(async () => {
      if (failure === 'API timeout result') lobby.resolveInitial(timeoutResult);
      else lobby.rejectInitial(new Error('transport timed out'));
    });

    expect(lobby.getRoomSnapshot).toHaveBeenCalledTimes(2);
    expect(lobby.result.current.loadState).toBe('ready');
    expect(lobby.result.current.loadError).toBe('');
    expect(lobby.result.current.snapshot).toBe(snapshot);
  },
);

test('reports an initial failure before a background snapshot is accepted', async () => {
  const lobby = await renderLobby();
  await act(async () => { lobby.resolveInitial(timeoutResult); });
  expect(lobby.result.current.loadState).toBe('error');
  expect(lobby.result.current.loadError).toBe('TIMEOUT');
  expect(lobby.result.current.snapshot).toBeNull();
});

test('a late initial snapshot cannot restore the lobby after confirmed membership loss', async () => {
  const lobby = await renderLobby();
  await act(async () => { lobby.loseMembership(); });
  expect(lobby.result.current.loadError).toBe('NOT_MEMBER');

  await act(async () => { lobby.resolveInitial({ ok: true, data: snapshot }); });
  expect(lobby.result.current.loadState).toBe('error');
  expect(lobby.result.current.loadError).toBe('NOT_MEMBER');
  expect(lobby.result.current.snapshot).toBeNull();
});
