import { resumePathForRoom } from '../../src/features/home/services/resumeRoom';
import { acceptedRoomPath, roomDestinationPath } from '../../src/features/inbox/services/notificationInboxResolver';
import type { RoomState } from '../../src/data/api/contracts';

describe('resume active room from Home', () => {
  test.each<[RoomState, string]>([
    ['LOBBY', '/room/lobby'],
    ['ROUND_1', '/room/vote'],
    ['WAITING_1', '/room/vote'],
    ['VOTING', '/room/vote'],
    ['ROUND_2', '/room/final-round'],
    ['WAITING_2', '/room/final-round'],
    ['DECIDED', '/room/result'],
    ['FINALIZED', '/room/result'],
    ['COMPLETED', '/room/result'],
    ['NO_CONSENSUS', '/room/no-consensus'],
    ['CANCELLED', '/room/lobby'],
  ])('%s opens %s', (state, path) => {
    expect(resumePathForRoom({ state })).toBe(path);
  });
});

describe('accepted room invite', () => {
  const roomId = 'c0a80101-0000-4000-8000-000000000001';

  test('a member still in the lobby goes to own preferences first', () => {
    expect(acceptedRoomPath({ roomId, destination: 'lobby' })).toBe(`/room/setup?roomId=${roomId}&stage=preferences`);
  });

  test('a room already voting opens the matching round', () => {
    expect(acceptedRoomPath({ roomId, destination: 'vote' })).toBe(roomDestinationPath({ roomId, destination: 'vote' }));
    expect(acceptedRoomPath({ roomId, destination: 'final-round' })).toBe(`/room/final-round?roomId=${roomId}`);
  });
});
