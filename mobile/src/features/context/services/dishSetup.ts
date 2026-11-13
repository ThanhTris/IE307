import type { MealSlot, UserPreferences } from '../../../data/api/contracts';

/** UI draft, not the legacy RoomContext or an unverified wire DTO. */
export type SetupDraft = {
  mealSlot: MealSlot; dishCount: number; timeMode: 'now' | 'scheduled';
  desiredAt: string | null; budget: 'under50' | '50to100' | '100to200' | null;
  avoidRecent: boolean; inviteeIds: string[];
};
export type SetupRoom = { id: string; code: string; version: number; state: 'LOBBY' | 'CLOSED' };
export type SetupStage = 'setup' | 'preferences' | 'complete' | 'closed';
export type SetupOption = { id: string; label: string; unknown?: boolean; code?: string; linkedIds?: string[] };
export type SetupCatalogue = { categories: SetupOption[]; cuisines: SetupOption[]; /** Category groups for "Ăn vặt". */ snackCategories?: SetupOption[] };
export type SetupFriend = { id: string; label: string };
export const emptyPreferences = (consent = false): UserPreferences => ({ cuisineIds: [], categoryIds: [], historyConsent: consent });
export const initialSetupDraft = (at?: number): SetupDraft => ({ mealSlot: at === undefined ? 'lunch' : mealAtTime(at), dishCount: 15, timeMode: 'now', desiredAt: null, budget: null, avoidRecent: true, inviteeIds: [] });
/** User-requested hour windows in UTC+7, inclusive of the named ending hour. */
export function mealAtTime(at: number): MealSlot {
  const hour = new Date(at + 7 * 3600000).getUTCHours();
  if (hour >= 7 && hour <= 8) return 'breakfast';
  if (hour >= 11 && hour <= 13) return 'lunch';
  if (hour >= 19 && hour <= 21) return 'dinner';
  return 'snack';
}
/** Picker precision is minutes; reopen from Now always starts fifteen displayed minutes ahead. */
export const defaultScheduledTime = (at: number) => new Date(Math.floor(at / 60000) * 60000 + 15 * 60000).toISOString();
export function switchToNow(draft: SetupDraft, at: number): SetupDraft {
  return { ...draft, timeMode: 'now', desiredAt: null, mealSlot: mealAtTime(at) };
}
export function changeSetupMeal(draft: SetupDraft, mealSlot: MealSlot, at: number): SetupDraft {
  if (draft.timeMode !== 'scheduled' || !draft.desiredAt || !Number.isFinite(Date.parse(draft.desiredAt)) || mealSlot === 'snack') return { ...draft, mealSlot };
  const hour = mealSlot === 'breakfast' ? '07' : mealSlot === 'lunch' ? '12' : '19';
  let candidate = parseSchedule(scheduleParts(draft.desiredAt).date, hour, '00')!;
  if (Date.parse(candidate) <= at) {
    candidate = parseSchedule(scheduleParts(new Date(at).toISOString()).date, hour, '00')!;
    if (Date.parse(candidate) <= at) candidate = new Date(Date.parse(candidate) + 86400000).toISOString();
  }
  return { ...draft, mealSlot, desiredAt: candidate };
}
export function setupValidation(draft: SetupDraft, now: number): string | null {
  // 5–9 only comes from accepting a shortage ("Dùng N món"); the stepper itself starts at 10.
  if (!Number.isInteger(draft.dishCount) || draft.dishCount < 5 || draft.dishCount > 20) return 'Hãy chọn số nguyên từ 10 đến 20 món.';
  if (draft.timeMode === 'scheduled' && (!draft.desiredAt || !Number.isFinite(Date.parse(draft.desiredAt)) || Date.parse(draft.desiredAt) <= now)) return 'Chọn thời gian trong tương lai để tiếp tục.';
  return null;
}
export function scheduleParts(iso: string) {
  const local = new Date(Date.parse(iso) + 7 * 3600000).toISOString();
  return { date: local.slice(0, 10), hour: local.slice(11, 13), minute: local.slice(14, 16) };
}
export function formatSchedule(iso: string) {
  const { date, hour, minute } = scheduleParts(iso);
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)} · ${hour}:${minute}`;
}
/** UTC+7 business date, independent from the phone timezone; reject normalized dates. */
export function parseSchedule(date: string, hour: string, minute: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return null;
  if (+hour > 23 || +minute > 59) return null;
  const value = `${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+07:00`;
  if (!Number.isFinite(Date.parse(value))) return null;
  const iso = new Date(value).toISOString();
  return scheduleParts(iso).date === date ? iso : null;
}
export const mealOptions = [
  { id: 'breakfast', label: 'Ăn sáng', icon: 'sunrise' },
  { id: 'lunch', label: 'Ăn trưa', icon: 'sun' },
  { id: 'dinner', label: 'Ăn tối', icon: 'moon' },
  { id: 'snack', label: 'Ăn vặt', icon: 'snack' },
] as const;
export const budgetOptions = [
  { id: 'under50', label: 'Dưới 50K', icon: 'wallet' },
  { id: '50to100', label: '50–100K', icon: 'coins' },
  { id: '100to200', label: '100–200K', icon: 'box' },
  { id: null, label: 'Không giới hạn', icon: 'infinity' },
] as const;

const mealLabelOf = (slot: MealSlot) => mealOptions.find(item => item.id === slot)?.label ?? slot;
export type MealTimeConflict = { time: string; meal: MealSlot; mealLabel: string; fittingMeal: MealSlot; fittingLabel: string };
/** A scheduled hour must belong to the chosen meal's window; "Ăn vặt" fits any hour. */
export function mealTimeConflict(draft: SetupDraft): MealTimeConflict | null {
  if (draft.timeMode !== 'scheduled' || !draft.desiredAt || !Number.isFinite(Date.parse(draft.desiredAt)) || draft.mealSlot === 'snack') return null;
  const fitting = mealAtTime(Date.parse(draft.desiredAt));
  if (fitting === draft.mealSlot) return null;
  const { hour, minute } = scheduleParts(draft.desiredAt);
  return { time: `${hour}:${minute}`, meal: draft.mealSlot, mealLabel: mealLabelOf(draft.mealSlot), fittingMeal: fitting, fittingLabel: mealLabelOf(fitting) };
}
/** Option 1: keep the chosen hour, switch the meal to the one that hour belongs to. */
export const keepTimeChangeMeal = (draft: SetupDraft): SetupDraft => (
  draft.desiredAt ? { ...draft, mealSlot: mealAtTime(Date.parse(draft.desiredAt)) } : draft
);
/** Option 2: keep the meal, move the hour into that meal's window (same date when still ahead). */
export const keepMealChangeTime = (draft: SetupDraft, at: number): SetupDraft => changeSetupMeal(draft, draft.mealSlot, at);

/**
 * The dish stepper normally offers 10..20. After accepting a shortage (5..9 dishes) the count may stay as is or go
 * back to the normal range: stepping up from the reduced count jumps straight to 10, never 6..9 by choice.
 */
export function withMealChange(current: SetupDraft, patch: Partial<SetupDraft>): Partial<SetupDraft> {
  const changesContext = (patch.mealSlot !== undefined && patch.mealSlot !== current.mealSlot)
    || (patch.desiredAt !== undefined && patch.desiredAt !== current.desiredAt)
    || (patch.timeMode !== undefined && patch.timeMode !== current.timeMode);
  // A shortage count was accepted for one meal and time; another one gets the normal minimum back.
  return changesContext && current.dishCount < 10 && patch.dishCount === undefined ? { ...patch, dishCount: 10 } : patch;
}
export function shortageStep(current: number, next: number): number {
  return current < 10 && next > current && next < 10 ? 10 : next;
}
