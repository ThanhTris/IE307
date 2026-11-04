import { MOCK_DISHES } from '../../src/data/api';
import {
  currentServerTime,
  dishDistance,
  dishPrice,
  localTime,
  mealDateLabel,
  nextMealTime,
  parseBudget,
  parseLocalTime,
  previewDishPoolLive,
  previewDishPoolMock,
  shiftLocalDate,
  suggestedMeal,
} from '../../src/features/context/services/roomSetup';

test.each([
  ['2030-10-15 04:59', 'dinner', 'late_night'], ['2030-10-15 05:00', 'breakfast', undefined],
  ['2030-10-15 10:59', 'breakfast', undefined], ['2030-10-15 11:00', 'lunch', undefined],
  ['2030-10-15 14:59', 'lunch', undefined], ['2030-10-15 15:00', 'snack', undefined],
  ['2030-10-15 17:59', 'snack', undefined], ['2030-10-15 18:00', 'dinner', undefined],
  ['2030-10-15 21:59', 'dinner', undefined], ['2030-10-15 22:00', 'dinner', 'late_night'],
])('UTC+7 meal boundary %s', (input, mealSlot, timeHint) => {
  const iso = parseLocalTime(input)!;
  expect(localTime(iso)).toBe(input);
  expect(suggestedMeal(iso)).toEqual({ mealSlot, ...(timeHint ? { timeHint } : {}) });
});

test.each(['2030-02-29 12:00', '2030-04-31 12:00', '2030-13-01 12:00', '2030-01-01 24:00', '2030-01-01 12:60', '2030-1-1 12:00', 'not a date'])('rejects invalid local date %s', value => {
  expect(parseLocalTime(value)).toBeUndefined();
});

test('explicit date is UTC+7 without buffer and leap day survives roundtrip', () => {
  expect(parseLocalTime('2030-10-15 12:00')).toBe('2030-10-15T05:00:00.000Z');
  expect(localTime(parseLocalTime('2032-02-29 00:01')!)).toBe('2032-02-29 00:01');
});

test.each([
  ['breakfast', '2030-10-15 06:59', '2030-10-15 07:00'],
  ['breakfast', '2030-10-15 07:00', '2030-10-16 07:00'],
  ['breakfast', '2030-10-15 23:30', '2030-10-16 07:00'],
  ['lunch', '2030-10-15 11:59', '2030-10-15 12:00'],
  ['lunch', '2030-10-15 12:00', '2030-10-16 12:00'],
  ['lunch', '2030-10-15 12:01', '2030-10-16 12:00'],
  ['dinner', '2030-10-15 18:59', '2030-10-15 19:00'],
  ['dinner', '2030-10-15 19:00', '2030-10-16 19:00'],
  ['dinner', '2030-12-31 20:00', '2031-01-01 19:00'],
  ['breakfast', '2032-02-28 08:00', '2032-02-29 07:00'],
  ['breakfast', '2030-02-28 08:00', '2030-03-01 07:00'],
] as const)('%s suggests next local meal after %s', (meal, now, expected) => {
  const iso = nextMealTime(meal, Date.parse(parseLocalTime(now)!))!;
  expect(localTime(iso)).toBe(expected);
  expect(Date.parse(iso)).toBeGreaterThan(Date.parse(parseLocalTime(now)!));
});

test('snack does not suggest a replacement for the chosen time', () => {
  expect(nextMealTime('snack', Date.parse('2030-10-15T15:00:00Z'))).toBeUndefined();
});

test.each([
  ['2030-12-31', 1, '2031-01-01'], ['2032-02-28', 1, '2032-02-29'],
  ['2030-02-28', 1, '2030-03-01'], ['2030-10-15', -7, '2030-10-08'],
  ['2030-10-15', 7, '2030-10-22'], ['2030-10-15', 0, '2030-10-15'],
] as const)('date selector moves %s by %s days without timezone drift', (value, days, expected) => {
  expect(shiftLocalDate(value, days)).toBe(expected);
});

test('date selector rejects invalid dates and impossible offsets and does not normalize their labels', () => {
  expect(shiftLocalDate('2030-02-30', 1)).toBeUndefined();
  expect(shiftLocalDate('2030-10-15', 0.5)).toBeUndefined();
  expect(shiftLocalDate('2030-10-15', 1e100)).toBeUndefined();
  expect(shiftLocalDate('9999-12-31', 1)).toBeUndefined();
  expect(mealDateLabel('2030-02-30')).toBe('2030-02-30');
  expect(mealDateLabel('2030-10-15')).toContain('15/10/2030');
});

test('server clock accounts for elapsed time without moving backward on a local clock adjustment', () => {
  const stamp = '2030-10-15T05:00:00.000Z';
  expect(currentServerTime(stamp, 1000, 6000)).toBe(Date.parse(stamp) + 5000);
  expect(currentServerTime(stamp, 1000, 500)).toBe(Date.parse(stamp));
});

test('budget nullable does not become zero, negative or imprecise', () => {
  expect(parseBudget('  ')).toBeNull(); expect(parseBudget('0')).toBe(0); expect(parseBudget('70000')).toBe(70000);
  for (const value of ['-1', '1.5', '1e4', '90,000', '99999999999999999999999']) expect(parseBudget(value)).toBeUndefined();
});

test('unknown price remains unknown and a real zero or group price keeps its unit', () => {
  const dish = MOCK_DISHES[0]!;
  expect(dishPrice({ ...dish, price: { priceMin: null, priceMax: null, currency: null, unit: null, servingSize: null } })).toBe('Chưa có giá');
  expect(dishPrice({ ...dish, price: { priceMin: 0, priceMax: 0, currency: 'VND', unit: 'person', servingSize: null } })).toBe('0 đ / người');
  expect(dishPrice({ ...dish, price: { priceMin: 150000, priceMax: 200000, currency: 'VND', unit: 'group', servingSize: '2 người' } })).toBe('150.000–200.000 đ / nhóm');
});

test.each([
  [0, '0 m đường chim bay từ điểm ăn chung'], [650, '650 m đường chim bay từ điểm ăn chung'],
  [1000, '1 km đường chim bay từ điểm ăn chung'], [1500, '1,5 km đường chim bay từ điểm ăn chung'],
] as const)('formats distance %s from public anchor with explicit unit', (input, expected) => {
  expect(dishDistance(input)).toBe(expected);
});

test.each([undefined, null, -1, NaN, Infinity])('missing/invalid distance %s never becomes a real zero', input => {
  expect(dishDistance(input)).toBe('Chưa có khoảng cách đường chim bay từ điểm ăn chung');
});

describe('GM-24 dish pool preview mock and live adapters', () => {
  const serverNow = Date.parse('2026-10-15T11:30:00.000Z');

  test('previewDishPoolMock returns exact dishes for exact_20_lunch', async () => {
    const res = await previewDishPoolMock('exact_20_lunch', {
      mealSlot: 'lunch',
      dishCount: 20,
      timeMode: 'now',
      serverTimeMs: serverNow,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.requested).toBe(20);
      expect(res.dishes.length).toBe(20);
      expect(res.contractVersion).toBe('dish-catalogue/roadmap-v2/GM-18.2');
    }
  });

  test('previewDishPoolMock handles shortage_15_lunch', async () => {
    const res = await previewDishPoolMock('shortage_15_lunch', {
      mealSlot: 'lunch',
      dishCount: 20,
      timeMode: 'now',
      serverTimeMs: serverNow,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('SHORTAGE');
      expect((res as any).available).toBe(15);
      expect((res as any).requested).toBe(20);
    }
  });

  test('previewDishPoolMock handles shortage_7_dinner below minimum 10', async () => {
    const res = await previewDishPoolMock('shortage_7_dinner', {
      mealSlot: 'dinner',
      dishCount: 10,
      timeMode: 'now',
      serverTimeMs: serverNow,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('SHORTAGE');
      expect((res as any).available).toBe(7);
      expect((res as any).requested).toBe(10);
    }
  });

  test('previewDishPoolMock blocks past scheduled time with DESIRED_TIME_PASSED', async () => {
    const res = await previewDishPoolMock('desired_time_passed', {
      mealSlot: 'lunch',
      dishCount: 15,
      timeMode: 'scheduled',
      desiredAt: '2026-10-15T10:00:00.000Z',
      serverTimeMs: serverNow,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('DESIRED_TIME_PASSED');
      expect(res.messageKey).toBe('DESIRED_TIME_PASSED');
    }
  });

  test('previewDishPoolMock returns network error for server_offline', async () => {
    const res = await previewDishPoolMock('server_offline', {
      mealSlot: 'lunch',
      dishCount: 15,
      timeMode: 'now',
      serverTimeMs: serverNow,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('NETWORK_ERROR');
    }
  });

  test('previewDishPoolLive handles 200 success from transport', async () => {
    const mockTransport = {
      invoke: jest.fn().mockResolvedValue({
        ok: true,
        data: {
          contractVersion: 'dish-catalogue/roadmap-v2/GM-18.2',
          available: 20,
          requested: 20,
          dishes: [
            { dishId: 'd1', name: 'Phở bò', priceReference: { amount: 60000, currency: 'VND', unit: 'portion' } },
          ],
        },
      }),
    };

    const res = await previewDishPoolLive(mockTransport as any, {
      mealSlot: 'lunch',
      dishCount: 20,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.dishes.length).toBe(1);
      expect(res.dishes[0]?.name).toBe('Phở bò');
      expect(res.dishes[0]?.priceMin).toBe(60000);
    }
  });

  test('previewDishPoolLive handles 409 INSUFFICIENT_DISHES shortage from transport', async () => {
    const mockTransport = {
      invoke: jest.fn().mockRejectedValue({
        status: 409,
        body: {
          ok: false,
          error: {
            messageKey: 'INSUFFICIENT_DISHES',
            details: { available: 15, requested: 20 },
          },
        },
      }),
    };

    const res = await previewDishPoolLive(mockTransport as any, {
      mealSlot: 'lunch',
      dishCount: 20,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe('SHORTAGE');
      expect((res as any).available).toBe(15);
      expect((res as any).requested).toBe(20);
    }
  });
});
