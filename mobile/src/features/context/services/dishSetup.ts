import type { MealSlot, UserPreferences } from '../../../data/api/contracts';

/** UI draft, not the legacy RoomContext or an unverified wire DTO. */
export type SetupDraft = {
  mealSlot: MealSlot; dishCount: number; timeMode: 'now' | 'scheduled';
  desiredAt: string | null; budget: 'under50' | '50to100' | '100to200' | null;
  avoidRecent: boolean; inviteeIds: string[];
};
export type SetupRoom = { id: string; code: string; version: number; state: 'LOBBY' | 'CLOSED' };
export type SetupOption = { id: string; label: string; unknown?: boolean };
export type SetupCatalogue = { categories: SetupOption[]; cuisines: SetupOption[] };
export type SetupFriend = { id: string; label: string };
export const emptyPreferences = (consent = false): UserPreferences => ({ cuisineIds: [], categoryIds: [], historyConsent: consent });
export const initialSetupDraft = (): SetupDraft => ({ mealSlot: 'lunch', dishCount: 15, timeMode: 'now', desiredAt: null, budget: null, avoidRecent: true, inviteeIds: [] });
export function setupValidation(draft: SetupDraft, now: number): string | null {
  if (!Number.isInteger(draft.dishCount) || draft.dishCount < 10 || draft.dishCount > 20) return 'Hãy chọn số nguyên từ 10 đến 20 món.';
  if (draft.timeMode === 'scheduled' && (!draft.desiredAt || !Number.isFinite(Date.parse(draft.desiredAt)) || Date.parse(draft.desiredAt) <= now)) return 'Chọn thời gian trong tương lai để tiếp tục.';
  return null;
}
export const mealOptions = [
  { id: 'breakfast', label: 'Ăn sáng', icon: require('../../../../assets/brand/entry-ui/sun.png') },
  { id: 'lunch', label: 'Ăn trưa', icon: require('../../../../assets/brand/entry-ui/rice.png') },
  { id: 'dinner', label: 'Ăn tối', icon: require('../../../../assets/brand/entry-ui/moon.png') },
  { id: 'snack', label: 'Ăn vặt', icon: require('../../../../assets/brand/entry-ui/snack.png') },
] as const;
export const budgetOptions = [
  { id: 'under50', label: 'Dưới 50K', icon: require('../../../../assets/brand/entry-ui/wallet.png') },
  { id: '50to100', label: '50–100K', icon: require('../../../../assets/brand/entry-ui/coins.png') },
  { id: '100to200', label: '100–200K', icon: require('../../../../assets/brand/entry-ui/box.png') },
  { id: null, label: 'Không giới hạn', icon: require('../../../../assets/brand/entry-ui/infinity.png') },
] as const;
