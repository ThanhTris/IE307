import { render, waitFor } from '@testing-library/react-native';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import { LiveDishResultScreen } from '../../src/features/result/screens/LiveDishResultScreen';
import { LiveResultRepository } from '../../src/features/result/services/resultRepository';
import type { RoomRepository } from '../../src/features/rooms/services/roomRepository';

jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: jest.fn() }));

const rows: Record<string, any>[] = require('../fixtures/gm27/qa-projections.json');
const wire = () => JSON.parse(JSON.stringify(rows[0]));
const user = { id: 'review-synthetic-user' };
const read = (value: unknown) => new LiveResultRepository({
  rpcCaller: jest.fn().mockResolvedValue({ ok: true, data: value }),
}).getResult('review-synthetic-room');

function updateWinnerProjection(raw: Record<string, any>, update: (dish: Record<string, any>) => void) {
  const roundDishId = raw.winner.roundDishId;
  update(raw.winner);
  for (const item of raw.topDishes) if (item.dish.roundDishId === roundDishId) update(item.dish);
}

test('CONTROL: intact captured canonical wire is accepted', async () => {
  expect(await read(wire())).toMatchObject({ ok: true, data: { capability: 'scored-v4' } });
});

test.each(['description', 'mealSlots', 'artwork'])('raw wire missing mandatory dish %s is rejected before presentation mapping', async key => {
  const raw = wire();
  updateWinnerProjection(raw, dish => { delete dish[key]; });
  expect(await read(raw)).toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
});

test('raw wire with a malformed taxonomy field is rejected before it can be dropped', async () => {
  const raw = wire();
  updateWinnerProjection(raw, dish => { dish.mealSlots = 123; });
  expect(await read(raw)).toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
});

test('a canonical wire cannot bypass validation by adding a legacy capability label', async () => {
  const raw = wire();
  delete raw.topDishes;
  raw.capability = 'legacy-unscored-v1';
  expect(await read(raw)).toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
});

test.each(['NOT_READY', 'RESULT_NOT_READY'])('HTTP 409 with explicit %s follows the same waiting policy as an envelope error', async messageKey => {
  const envelope = new LiveResultRepository({
    rpcCaller: jest.fn().mockResolvedValue({ ok: false, error: { messageKey } }),
  });
  const thrown = new LiveResultRepository({
    rpcCaller: jest.fn().mockRejectedValue({ status: 409, body: { ok: false, error: { messageKey } } }),
  });
  expect(await envelope.getResult('review-synthetic-room')).toMatchObject({ ok: false, error: { messageKey: 'NOT_READY' } });
  expect(await thrown.getResult('review-synthetic-room')).toMatchObject({ ok: false, error: { messageKey: 'NOT_READY' } });
});

test('default live screen releases its repository session listener on unmount', async () => {
  const listeners = new Set<() => void>();
  const stop = jest.fn((listener: () => void) => { listeners.delete(listener); });
  const rpc = jest.fn(async (_name: string, params: Record<string, unknown>) =>
    params.command === 'result'
      ? { ok: true, data: wire() }
      : { ok: true, data: { members: [] } });
  const room = {
    getCurrentUser: () => user,
    getRpcCaller: () => rpc,
    subscribeSession: (listener: () => void) => {
      listeners.add(listener);
      return () => stop(listener);
    },
  } as unknown as RoomRepository;
  jest.mocked(useRoomRepository).mockReturnValue({ mode: 'real', user, repository: room } as any);
  const view = await render(<LiveDishResultScreen roomId="review-synthetic-room" onHome={jest.fn()} onNewSession={jest.fn()} />);
  await waitFor(() => expect(rpc).toHaveBeenCalled());
  expect(listeners.size).toBe(1);
  await view.unmount();
  expect(listeners.size).toBe(0);
  expect(stop).toHaveBeenCalledTimes(1);
});
