import { ApiClientImpl } from '../../src/data/api/client';
import { isCanonicalHistoryPage } from '../../src/data/api/responseGuards';

const dish = {
  roundDishId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  dishId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Phở bò',
  description: null,
  mealSlots: ['lunch'],
  cuisineIds: [],
  cuisineLabels: [],
  categoryIds: [],
  categoryLabels: [],
  temperature: null,
  flavor: null,
  artwork: null,
  priceReference: null,
};
const legacyPage = {
  items: [{
    historyId: '11111111-1111-4111-8111-111111111111',
    roomId: '22222222-2222-4222-8222-222222222222',
    resultId: '33333333-3333-4333-8333-333333333333',
    scope: 'personal',
    createdAt: '2026-10-18T12:00:00Z',
    expiresAt: '2027-10-18T12:00:00Z',
    result: { capability: 'legacy-unscored-v1', status: 'DECIDED', winner: dish, finalizedAt: '2026-10-18T11:59:00Z' },
  }],
};

describe('GM-28 canonical history contract', () => {
  test('accepts explicit legacy-unscored projection without fabricated score fields', () => {
    expect(isCanonicalHistoryPage(legacyPage)).toBe(true);
    const invalid = structuredClone(legacyPage);
    (invalid.items[0]!.result as Record<string, unknown>).topDishes = [];
    expect(isCanonicalHistoryPage(invalid)).toBe(false);
  });

  test('requests supplement history command and rejects malformed page before consumers read it', async () => {
    const client = new ApiClientImpl();
    const callRpc = jest.spyOn(client, 'callRpc').mockResolvedValue({ ok: true, data: legacyPage });
    const result = await client.getCanonicalHistory();
    expect(callRpc).toHaveBeenCalledWith('dish_session', {
      command: 'history',
      payload: { contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement' },
    });
    expect(result.ok).toBe(true);
    callRpc.mockResolvedValueOnce({ ok: true, data: { items: [{ ...legacyPage.items[0], resultId: 'bad' }] } });
    expect(await client.getCanonicalHistory()).toEqual({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE', message: 'Read RPC returned invalid envelope or data' } });
  });
});
