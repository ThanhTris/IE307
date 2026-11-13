import { lobbyMealSummary, lobbyPreferenceRows } from '../../src/features/rooms/services/lobbyPresentation';
import { dishSetupCatalogue } from '../../src/features/context/services/dishSetupCatalogue';
import type { RoomSnapshot, UserPreferences } from '../../src/data/api/contracts';

const base = { roomId: 'r', code: 'GCD999', state: 'LOBBY', version: 1, hostUserId: 'h', members: [], round: 1, poolVersion: 1, pool: [] } as unknown as RoomSnapshot;
const anything: UserPreferences = { cuisineIds: [], categoryIds: [], historyConsent: false };

test('meal card shows meal, "Ăn ngay" without a time, own budget and dish count', () => {
  const summary = lobbyMealSummary({ ...base, settings: { mealSlot: 'lunch', dishCount: 15, desiredAt: null }, ownPreferences: { ...anything, budget: { maximum: 100000, currency: 'VND', unit: 'person' } } as unknown as UserPreferences });
  expect(summary.meal.label).toBe('Ăn trưa');
  expect(summary.timeLabel).toBe('Ăn ngay');
  expect(summary.budgetLabel).toBe('50–100K/người');
  expect(summary.dishCount).toBe(15);
});

test('scheduled meal shows the local time and no budget when unlimited', () => {
  const at = new Date(2026, 10, 10, 12, 30).toISOString();
  const summary = lobbyMealSummary({ ...base, settings: { mealSlot: 'dinner', dishCount: 10, desiredAt: at }, ownPreferences: anything });
  expect(summary.meal.label).toBe('Ăn tối');
  expect(summary.timeLabel).toBe('12:30');
  expect(summary.budgetLabel).toBeNull();
});

test('preferences card groups chosen labels and is empty for "Ăn gì cũng được"', () => {
  expect(lobbyPreferenceRows(anything)).toEqual([]);
  expect(lobbyPreferenceRows(undefined)).toEqual([]);
  const rice = dishSetupCatalogue.categories[0]!, vi = dishSetupCatalogue.cuisines[0]!;
  const rows = lobbyPreferenceRows({ ...anything, categoryIds: [rice.id, 'unknown-id'], cuisineIds: [vi.id], flavor: { salty: { present: true, intensity: 'low' }, spicy: { present: null, intensity: 'unknown' }, sour: { present: null, intensity: 'unknown' }, sweet: { present: null, intensity: 'unknown' } } } as UserPreferences);
  expect(rows).toEqual([
    { label: 'Loại món', values: [rice.label] },
    { label: 'Ẩm thực', values: [vi.label] },
    { label: 'Hương vị', values: ['Thanh đạm'] },
  ]);
});
