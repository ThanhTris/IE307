import { createDishSetupPreview } from '../fixtures/setup/dishSetupPreview';
import { changeSetupMeal, defaultScheduledTime, initialSetupDraft, mealAtTime, scheduleParts, switchToNow } from '../../src/features/context/services/dishSetup';

const at = (time: string) => Date.parse(`2026-11-02T${time}+07:00`);
test.each([
  ['06:59:59', 'snack'], ['07:00:00', 'breakfast'], ['08:59:59', 'breakfast'], ['09:00:00', 'snack'],
  ['10:59:59', 'snack'], ['11:00:00', 'lunch'], ['13:59:59', 'lunch'], ['14:00:00', 'snack'],
  ['18:59:59', 'snack'], ['19:00:00', 'dinner'], ['21:59:59', 'dinner'], ['22:00:00', 'snack'],
])('UTC+7 meal default at %s is %s', (time, expected) => expect(mealAtTime(at(time))).toBe(expected));

test('Now recomputes the meal, clears a schedule, and permits a later manual override', async () => {
  const gateway = createDishSetupPreview('default', undefined, at('07:30:00'));
  expect((await gateway.read()).settings?.mealSlot).toBe('breakfast');
  const scheduled = { ...initialSetupDraft(), timeMode: 'scheduled' as const, desiredAt: '2026-11-04T05:00:00Z' };
  const now = switchToNow(scheduled, at('20:00:00'));
  expect(now).toMatchObject({ mealSlot: 'dinner', timeMode: 'now', desiredAt: null });
  expect(changeSetupMeal(now, 'breakfast', at('20:00:00'))).toMatchObject({ mealSlot: 'breakfast', timeMode: 'now', desiredAt: null });
});
test('schedule default advances fifteen displayed minutes and rolls the date at midnight', () => {
  expect(scheduleParts(defaultScheduledTime(at('21:45:42')))).toEqual({ date: '2026-11-02', hour: '22', minute: '00' });
  expect(scheduleParts(defaultScheduledTime(at('23:50:00')))).toEqual({ date: '2026-11-03', hour: '00', minute: '05' });
});
test.each([['breakfast', '07'], ['lunch', '12'], ['dinner', '18']] as const)('changing scheduled meal to %s preserves a future date and sets %s:00', (meal, hour) => {
  const draft = { ...initialSetupDraft(), timeMode: 'scheduled' as const, desiredAt: '2026-11-05T14:30:00+07:00' };
  expect(scheduleParts(changeSetupMeal(draft, meal, at('15:00:00')).desiredAt!)).toEqual({ date: '2026-11-05', hour, minute: '00' });
});
test('past meal time rolls to the next future occurrence while snack retains the selected time', () => {
  const draft = { ...initialSetupDraft(), timeMode: 'scheduled' as const, desiredAt: '2026-11-02T17:30:00+07:00' };
  expect(scheduleParts(changeSetupMeal(draft, 'lunch', at('15:00:00')).desiredAt!)).toEqual({ date: '2026-11-03', hour: '12', minute: '00' });
  expect(changeSetupMeal(draft, 'snack', at('15:00:00')).desiredAt).toBe(draft.desiredAt);
  expect(scheduleParts(changeSetupMeal(draft, 'dinner', at('15:00:00')).desiredAt!)).toEqual({ date: '2026-11-02', hour: '18', minute: '00' });
});
