import { localTimeInput, normalizeRoomCode, parseLocalTime, suggestMeal, validDisplayName, validRoomCode } from '../../src/features/rooms/services/roomEntry';

test('room code normalizes casing/edge whitespace and follows server alphabet', () => {
  expect(normalizeRoomCode('  gcd234 ')).toBe('GCD234');
  expect(validRoomCode('  gcd234 ')).toBe(true);
  for (const code of ['123456', 'ABC012', 'ABCI23', 'ABCO23', 'ABCDE', 'ABCDEFG', 'AB C23', 'ABC-23', '']) expect(validRoomCode(code)).toBe(false);
});

test('name validation counts Unicode characters and rejects blank or oversized input', () => {
  expect(validDisplayName('  Tuấn  ')).toBe(true);
  expect(validDisplayName('🍜'.repeat(24))).toBe(true);
  expect(validDisplayName('🍜'.repeat(25))).toBe(false);
  expect(validDisplayName('   ')).toBe(false);
});

test('custom time converts UTC+7 exactly once and rejects overflow dates/times', () => {
  expect(parseLocalTime('2030-10-12 00:30')).toBe('2030-10-11T17:30:00.000Z');
  expect(localTimeInput('2030-10-11T17:30:00.000Z')).toBe('2030-10-12 00:30');
  expect(parseLocalTime('2028-02-29 12:00')).toBe('2028-02-29T05:00:00.000Z');
  for (const time of ['2030-02-29 12:00', '2030-02-31 12:00', '2030-13-01 12:00', '2030-10-12 24:00', '2030-10-12 12:60', '12:30']) expect(parseLocalTime(time)).toBeNull();
});

test.each([
  ['04:59', 'dinner', 'late_night'], ['05:00', 'breakfast', undefined], ['10:59', 'breakfast', undefined],
  ['11:00', 'lunch', undefined], ['15:00', 'snack', undefined], ['18:00', 'dinner', undefined], ['22:00', 'dinner', 'late_night'],
])('meal suggestion respects Vietnam time boundary %s', (time, mealSlot, timeHint) => {
  expect(suggestMeal(`2030-10-12T${time}:00+07:00`)).toMatchObject({ mealSlot });
  expect(suggestMeal(`2030-10-12T${time}:00+07:00`).timeHint).toBe(timeHint);
});
