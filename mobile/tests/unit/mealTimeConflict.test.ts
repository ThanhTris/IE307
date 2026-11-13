import { keepMealChangeTime, keepTimeChangeMeal, mealTimeConflict, initialSetupDraft, type SetupDraft } from '../../src/features/context/services/dishSetup';

const at = (iso: string) => Date.parse(iso);
const scheduled = (mealSlot: SetupDraft['mealSlot'], desiredAt: string): SetupDraft => ({ ...initialSetupDraft(), mealSlot, timeMode: 'scheduled', desiredAt });

test('a scheduled hour inside the meal window has no conflict; snack and "now" never conflict', () => {
  expect(mealTimeConflict(scheduled('lunch', '2026-11-03T12:00:00+07:00'))).toBeNull();
  expect(mealTimeConflict(scheduled('snack', '2026-11-03T03:00:00+07:00'))).toBeNull();
  expect(mealTimeConflict({ ...initialSetupDraft(), mealSlot: 'dinner' })).toBeNull();
});

test('an hour outside the window reports the meal that hour belongs to', () => {
  const conflict = mealTimeConflict(scheduled('breakfast', '2026-11-03T12:00:00+07:00'));
  expect(conflict).toMatchObject({ time: '12:00', meal: 'breakfast', fittingMeal: 'lunch', fittingLabel: 'Ăn trưa' });
});

test('option 1 keeps the hour and switches meal; option 2 keeps the meal and moves the hour into its window', () => {
  const draft = scheduled('breakfast', '2026-11-03T12:00:00+07:00');
  expect(keepTimeChangeMeal(draft)).toMatchObject({ mealSlot: 'lunch', desiredAt: draft.desiredAt });
  const moved = keepMealChangeTime(draft, at('2026-11-02T10:00:00+07:00'));
  expect(moved.mealSlot).toBe('breakfast');
  expect(mealTimeConflict(moved)).toBeNull();
  const dinner = keepMealChangeTime(scheduled('dinner', '2026-11-03T12:00:00+07:00'), at('2026-11-02T10:00:00+07:00'));
  expect(mealTimeConflict(dinner)).toBeNull();
});
