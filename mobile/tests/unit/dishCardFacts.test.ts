import { dishCardFacts } from '../../src/features/voting/services/dishCardFacts';
import type { PoolDish } from '../../src/data/api';

const base: PoolDish = { roundDishId: 'r1', choiceId: 'c1', dishId: 'd1', name: 'Bún chả', cuisineIds: [], categoryIds: [] };

test('shows every fact the server sent, using catalogue labels when the server sends only ids', () => {
  const facts = dishCardFacts({
    ...base,
    categoryIds: ['14bc9d6f-c43e-5c1d-9c13-eddc5cc80dcc'],
    cuisineIds: ['d7bf6ad7-596c-5ee0-bf45-ccedfcf6460b'],
    mealSlots: ['lunch', 'dinner'],
    temperature: 'hot',
    origin: 'north',
    flavor: { spicy: { present: true, intensity: 'medium' }, salty: { present: null, intensity: 'unknown' }, sweet: { present: false, intensity: 'none' }, sour: { present: true, intensity: 'unknown' } },
  });
  expect(facts.map(fact => fact.label)).toEqual(['Bún / Phở', 'Món Việt', 'Trưa · Tối', 'Món nóng', 'Cay vừa', 'Chua', 'Miền Bắc']);
});

test('server labels win over the catalogue, and missing data adds nothing', () => {
  expect(dishCardFacts({ ...base, categoryLabels: ['Món cuốn'] } as never).map(fact => fact.label)).toEqual(['Món cuốn']);
  expect(dishCardFacts({ ...base, categoryIds: ['unknown-id'], temperature: 'unknown', origin: 'unknown' })).toEqual([]);
});
