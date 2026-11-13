import { dishCardFacts } from '../../src/features/voting/services/dishCardFacts';
import type { PoolDish } from '../../src/data/api';

const base: PoolDish = { roundDishId: 'r1', choiceId: 'c1', dishId: 'd1', name: 'Bún chả', cuisineIds: [], categoryIds: [] };

test('shows every fact the server sent, using catalogue labels when the server sends only ids', () => {
  const facts = dishCardFacts({
    ...base,
    categoryIds: ['14bc9d6f-c43e-5c1d-9c13-eddc5cc80dcc'],
    cuisineIds: [],
    mealSlots: ['lunch', 'dinner'],
    temperature: 'hot',
    origin: 'north',
    flavor: { spicy: { present: true, intensity: 'medium' }, salty: { present: null, intensity: 'unknown' }, sweet: { present: false, intensity: 'none' }, sour: { present: true, intensity: 'unknown' } },
  });
  expect(facts.map(fact => fact.label)).toEqual(['Bún / Phở', 'Miền Bắc', 'Trưa · Tối', 'Món nóng', 'Cay', 'Chua / Chua cay']);
});

test('server labels win over the catalogue, and missing data adds nothing', () => {
  expect(dishCardFacts({ ...base, categoryLabels: ['Món cuốn'] } as never).map(fact => fact.label)).toEqual(['Món cuốn']);
  expect(dishCardFacts({ ...base, categoryIds: ['unknown-id'], temperature: 'unknown', origin: 'unknown' })).toEqual([]);
});

test('regions, six flavours and the snack groups use the preferences vocabulary', () => {
  const labels = (dish: Record<string, unknown>) => dishCardFacts({ ...base, ...dish } as never).map(fact => fact.label);
  expect(labels({ origin: 'west', categoryIds: ['97c011b2-3d0b-5d4c-92fb-7d05eb6a6538'], mealSlots: ['snack'] })).toEqual(['Chè & Kem', 'Miền Tây', 'Ăn vặt']);
  expect(labels({ flavor: { spicy: { present: false, intensity: 'none' }, salty: { present: true, intensity: 'low' }, sweet: { present: true, intensity: 'low' }, sour: { present: false, intensity: 'none' } } })).toEqual(['Ngọt', 'Thanh đạm']);
  expect(labels({ flavor: { spicy: { present: false, intensity: 'none' }, salty: { present: true, intensity: 'high' }, sweet: { present: false, intensity: 'none' }, sour: { present: false, intensity: 'none' } } })).toEqual(['Mặn / Đậm đà']);
  // A region sent as a cuisine id and as an origin is shown once.
  expect(labels({ cuisineIds: ['f3e57f22-1cc1-51c8-ad0d-5448436e2f85'], origin: 'north' })).toEqual(['Miền Bắc']);
});
