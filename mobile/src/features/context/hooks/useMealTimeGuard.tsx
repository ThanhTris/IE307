import { useState } from 'react';
import { MealTimeConflictDialog } from '../components/MealTimeConflictDialog';
import { keepMealChangeTime, keepTimeChangeMeal, mealTimeConflict, type SetupDraft } from '../services/dishSetup';

/**
 * Routes every meal/time change through one check: a consistent draft is applied at once,
 * a mismatch opens a dialog with the two ways to resolve it.
 */
export function useMealTimeGuard(apply: (draft: SetupDraft) => void, now: () => number) {
  const [pending, setPending] = useState<SetupDraft | null>(null);
  const conflict = pending ? mealTimeConflict(pending) : null;
  const guard = (draft: SetupDraft) => {
    if (mealTimeConflict(draft)) setPending(draft); else apply(draft);
  };
  const resolve = (pick: (draft: SetupDraft) => SetupDraft) => { if (pending) { const next = pick(pending); setPending(null); apply(next); } };
  const dialog = <MealTimeConflictDialog conflict={conflict} onClose={() => setPending(null)}
    onKeepTime={() => resolve(keepTimeChangeMeal)} onKeepMeal={() => resolve(draft => keepMealChangeTime(draft, now()))} />;
  return { guard, dialog };
}
