import { queueReady } from '../../src/features/rooms/services/readyQueue';

test('ready requests for a room are sent one at a time, in the order asked', async () => {
  const sent: boolean[] = [];
  let release: () => void = () => undefined;
  const repository = {
    dispatchDishSession: jest.fn(async (_command: string, payload: Record<string, unknown>) => {
      if (sent.length === 0) await new Promise<void>(resolve => { release = resolve; });
      sent.push(payload.ready as boolean);
      return { ok: true as const, data: undefined as never };
    }),
  };
  const first = queueReady(repository as never, 'room-1', false);
  const second = queueReady(repository as never, 'room-1', true);
  await Promise.resolve();
  expect(repository.dispatchDishSession).toHaveBeenCalledTimes(1);
  release();
  await Promise.all([first, second]);
  expect(sent).toEqual([false, true]);
});

test('a failed request does not block the next one', async () => {
  const repository = { dispatchDishSession: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, data: undefined }) };
  await queueReady(repository as never, 'room-2', false);
  await queueReady(repository as never, 'room-2', true);
  expect(repository.dispatchDishSession).toHaveBeenCalledTimes(2);
});
