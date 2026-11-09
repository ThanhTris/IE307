import type { InboxItem } from '../../src/data/api/contracts';
import { findInboxEventById } from '../../src/features/inbox/services/notificationInboxResolver';

const eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const item: InboxItem = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  eventId,
  type: 'room_result',
  title: 'Kết quả phòng',
  body: 'Đã có kết quả',
  read: true,
  metadata: { roomId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', resultId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
  createdAt: '2026-11-08T00:00:00Z',
};

describe('findInboxEventById', () => {
  test('paginates the authenticated inbox and returns only an exact server eventId match', async () => {
    const repository = {
      list: jest.fn()
        .mockResolvedValueOnce({ ok: true, data: { items: [], nextCursor: 'cursor-1', fetchedAt: '2026-11-08T00:00:00Z' } })
        .mockResolvedValueOnce({ ok: true, data: { items: [item], nextCursor: undefined, fetchedAt: '2026-11-08T00:00:00Z' } }),
    };

    expect(await findInboxEventById(repository as any, eventId)).toEqual({ ok: true, data: item });
    expect(repository.list).toHaveBeenNthCalledWith(1, undefined);
    expect(repository.list).toHaveBeenNthCalledWith(2, 'cursor-1');
  });

  test('preserves transient API errors for retry and rejects malformed event IDs before calling the API', async () => {
    const repository = { list: jest.fn().mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } }) };
    expect(await findInboxEventById(repository as any, eventId)).toEqual({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    expect(await findInboxEventById(repository as any, 'not-an-event-id')).toEqual({ ok: false, error: { messageKey: 'INVALID_INPUT' } });
    expect(repository.list).toHaveBeenCalledTimes(1);
  });

  test('fails closed when the server repeats a pagination cursor', async () => {
    const repository = { list: jest.fn().mockResolvedValue({
      ok: true,
      data: { items: [], nextCursor: 'stuck-cursor', fetchedAt: '2026-11-08T00:00:00Z' },
    }) };
    expect(await findInboxEventById(repository as any, eventId)).toEqual({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
    expect(repository.list).toHaveBeenCalledTimes(2);
  });
});
