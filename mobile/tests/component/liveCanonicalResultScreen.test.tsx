import { act, render, screen, waitFor } from '@testing-library/react-native';
import { LiveCanonicalResultScreen } from '../../src/features/result/screens/LiveCanonicalResultScreen';
import { DishResultFlow } from '../../src/features/result/screens/DishResultFlow';
import type { RoomRepository } from '../../src/features/rooms/services/roomRepository';
import { isRoomSnapshot } from '../../src/data/api/responseGuards';

jest.mock('../../src/features/result/screens/DishResultFlow', () => ({ DishResultFlow: jest.fn(() => null) }));

function terminalSnapshot(roomId: string, resultId: string) {
  const finalizedAt = '2026-11-07T00:00:00.000Z';
  return {
    roomId, code: 'ABC123', state: 'NO_CONSENSUS', version: 4, hostUserId: 'host-1',
    context: { anchorId: 'anchor-1', radiusM: 1000, desiredAt: finalizedAt, serviceMode: 'dine_in', mealSlot: 'lunch', avoidRecent: false },
    members: [{ userId: 'host-1', displayName: 'Host', isHost: true, ready: true, joinedAt: finalizedAt }],
    round: 1, poolVersion: 1, pool: [], expiresAt: '2027-11-07T00:00:00.000Z',
    result: {
      resultId, roomId, round: 1, winnerRoundDishId: null, winnerDish: null,
      reasonCode: resultId === 'result-B' ? 'ALL_REMOVED' : 'EMPTY_INTERSECTION',
      matchTier: 'NO_CONSENSUS', finalizedAt, policyVersion: 'decision-v2',
    },
  };
}

test('late result response from room A cannot replace the newer room B result', async () => {
  expect(isRoomSnapshot(terminalSnapshot('room-B', 'result-B'))).toBe(true);
  let resolveA: ((value: any) => void) | undefined;
  const pendingA = new Promise<any>(resolve => { resolveA = resolve; });
  const repository = {
    getRoomSnapshot: jest.fn((roomId: string) => roomId === 'room-A'
      ? pendingA
      : Promise.resolve({ ok: true, data: terminalSnapshot('room-B', 'result-B') })),
  } as unknown as RoomRepository;
  const view = await render(<LiveCanonicalResultScreen repository={repository} roomId="room-A" onHome={jest.fn()} onNewSession={jest.fn()} />);
  await waitFor(() => expect(repository.getRoomSnapshot).toHaveBeenCalledWith('room-A'));
  await view.rerender(<LiveCanonicalResultScreen repository={repository} roomId="room-B" expectedResultId="result-B" onHome={jest.fn()} onNewSession={jest.fn()} />);
  await waitFor(() => expect((DishResultFlow as jest.Mock).mock.calls.at(-1)?.[0].input.result.resultId).toBe('result-B'));
  await act(async () => { resolveA?.({ ok: true, data: terminalSnapshot('room-A', 'result-A') }); });
  const lastProps = (DishResultFlow as jest.Mock).mock.calls.at(-1)?.[0];
  expect(lastProps.input.result.resultId).toBe('result-B');
  expect(screen.queryByText('Chưa thể mở kết quả')).toBeNull();
});
