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
  expect(labels({ origin: 'west', categoryIds: ['8e994207-5c7b-524e-97aa-e4a5f7679071'], mealSlots: ['snack'] })).toEqual(['Chè & Kem', 'Miền Tây', 'Ăn vặt']); // a dish of the group through its second family (ice cream)
  expect(labels({ flavor: { spicy: { present: false, intensity: 'none' }, salty: { present: true, intensity: 'low' }, sweet: { present: true, intensity: 'low' }, sour: { present: false, intensity: 'none' } } })).toEqual(['Ngọt', 'Thanh đạm']);
  expect(labels({ flavor: { spicy: { present: false, intensity: 'none' }, salty: { present: true, intensity: 'high' }, sweet: { present: false, intensity: 'none' }, sour: { present: false, intensity: 'none' } } })).toEqual(['Mặn / Đậm đà']);
  // A region sent as a cuisine id and as an origin is shown once.
  expect(labels({ cuisineIds: ['0cc4d0c4-4692-5098-b61f-cdad67ee2d11'], origin: 'north' })).toEqual(['Miền Bắc']);
});

test('a dish with several regions, families and flavours shows all of them', () => {
  const ids = { south: '59eaa370-3b50-57cc-b01e-6691dcbd4be0', west: '93436350-0b00-55c0-9866-adff304ba486' };
  const facts = dishCardFacts({ ...base, cuisineIds: [ids.south, ids.west], categoryIds: ['e69b5f45-580d-5ee3-9e43-360650b4c650', 'bf53ba6f-c4fc-536b-a932-b7cb18cb7e60'],
    mealSlots: ['breakfast', 'lunch', 'dinner'],
    flavor: { spicy: { present: true, intensity: 'high' }, salty: { present: null, intensity: 'unknown' }, sweet: { present: null, intensity: 'unknown' }, sour: { present: null, intensity: 'unknown' }, fatty: { present: true, intensity: 'medium' } } } as never)
    .map(fact => fact.label);
  expect(facts).toEqual(['Cơm', 'Cháo / Súp', 'Miền Nam', 'Miền Tây', 'Sáng · Trưa · Tối', 'Cay', 'Béo / Ngậy']);
});
