import { shortageStep, emptyPreferences } from '../../src/features/context/services/dishSetup';
import { dishSetupCatalogue, PLACEHOLDER_IDS } from '../../src/features/context/services/dishSetupCatalogue';
import { knownPreferences } from '../../src/features/preferences/services/dishPreferences';

test('after a shortage the dish stepper keeps the reduced count or jumps back to 10', () => {
  expect(shortageStep(7, 8)).toBe(10);
  expect(shortageStep(7, 9)).toBe(10);
  expect(shortageStep(7, 7)).toBe(7);
  expect(shortageStep(10, 11)).toBe(11);
  expect(shortageStep(15, 14)).toBe(14);
});

test('saved ids with no tile any more are dropped; known groups, regions and Béo / Ngậy stay', () => {
  const rice = dishSetupCatalogue.categories[0]!.id;
  const oldVietnamese = 'd7bf6ad7-596c-5ee0-bf45-ccedfcf6460b';
  const oldHotpot = '7d4b93cd-665d-5ef3-bde6-9d2f1a721f40';
  const prefs = { ...emptyPreferences(), categoryIds: [rice, oldHotpot, PLACEHOLDER_IDS.flavorFatty], cuisineIds: [oldVietnamese, PLACEHOLDER_IDS.regionNorth] };
  const clean = knownPreferences(prefs, dishSetupCatalogue);
  expect(clean.categoryIds).toEqual([rice, PLACEHOLDER_IDS.flavorFatty]);
  expect(clean.cuisineIds).toEqual([PLACEHOLDER_IDS.regionNorth]);
  // Nothing to clean: the same object comes back (no needless re-render or dirty draft).
  expect(knownPreferences(clean, dishSetupCatalogue)).toBe(clean);
});

test('a reduced count belongs to one meal and time: changing either brings back 10', () => {
  const { withMealChange } = jest.requireActual('../../src/features/context/services/dishSetup') as typeof import('../../src/features/context/services/dishSetup');
  const draft = { mealSlot: 'dinner' as const, dishCount: 7, timeMode: 'now' as const, desiredAt: null, budget: null, avoidRecent: true, inviteeIds: [] };
  expect(withMealChange(draft, { mealSlot: 'lunch' })).toEqual({ mealSlot: 'lunch', dishCount: 10 });
  expect(withMealChange(draft, { timeMode: 'scheduled', desiredAt: '2026-11-14T05:00:00.000Z' }).dishCount).toBe(10);
  expect(withMealChange(draft, { budget: 'under50' })).toEqual({ budget: 'under50' });
  expect(withMealChange({ ...draft, dishCount: 15 }, { mealSlot: 'lunch' })).toEqual({ mealSlot: 'lunch' });
});

test('a group lights up when any of its ids is saved, and pressing it clears them all', () => {
  const { optionSelected, togglePreference } = jest.requireActual('../../src/features/preferences/services/dishPreferences') as typeof import('../../src/features/preferences/services/dishPreferences');
  const noodles = dishSetupCatalogue.categories.find(option => option.label === 'Mì / Miến / Hủ tiếu')!;
  const oldSave = { ...emptyPreferences(), categoryIds: [noodles.id] };
  expect(optionSelected(oldSave.categoryIds, noodles)).toBe(true);
  expect(togglePreference(oldSave, 'categoryIds', noodles).categoryIds).toEqual([]);
});
