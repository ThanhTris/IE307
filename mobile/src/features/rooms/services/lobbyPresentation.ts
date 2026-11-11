import type { RoomSnapshot, UserPreferences } from '../../../data/api/contracts';
import { budgetOptions, mealOptions } from '../../context/services/dishSetup';
import { dishSetupCatalogue } from '../../context/services/dishSetupCatalogue';
import { flavorChoices, flavorSelected, isAnything } from '../../preferences/services/dishPreferences';

/** View data for the lobby "Bữa ăn hôm nay" card (Figma 68:429). */
export function lobbyMealSummary(snapshot: RoomSnapshot, now: Date = new Date()) {
  const meal = mealOptions.find(option => option.id === snapshot.settings?.mealSlot) ?? mealOptions[1];
  const desiredAt = snapshot.settings?.desiredAt;
  const parsed = desiredAt ? new Date(desiredAt) : null;
  const time = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const timeLabel = time
    ? `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
    : 'Ăn ngay';
  // A scheduled meal shows its own day; "hôm nay" only when it really is today (or there is no schedule).
  const dayLabel = time ? relativeDayLabel(time, now) : 'Hôm nay';
  const title = dayLabel === 'Hôm nay' ? 'Bữa ăn hôm nay' : dayLabel === 'Ngày mai' ? 'Bữa ăn ngày mai' : 'Bữa ăn đã hẹn';
  const dishCount = snapshot.dishCount ?? snapshot.settings?.dishCount ?? (snapshot.pool?.length || undefined);
  return { meal, title, timeLabel, dayLabel, scheduled: Boolean(time), budgetLabel: budgetLabel(snapshot.ownPreferences), dishCount };
}

const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/** "Hôm nay" / "Ngày mai" / "Thứ 6, 14/11" in the device's local time. */
export function relativeDayLabel(date: Date, now: Date = new Date()): string {
  const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Ngày mai';
  return `${weekdays[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function budgetLabel(preferences?: UserPreferences): string | null {
  const budget = (preferences as unknown as { budget?: { maximum?: number } } | undefined)?.budget;
  if (!budget || typeof budget.maximum !== 'number') return null;
  const id = budget.maximum <= 50000 ? 'under50' : budget.maximum <= 100000 ? '50to100' : budget.maximum <= 200000 ? '100to200' : null;
  const option = budgetOptions.find(item => item.id === id);
  return option && option.id ? `${option.label}/người` : null;
}

export type PreferenceRow = { label: string; values: string[] };

/** Rows for the lobby "Khẩu vị của bạn" card. Empty list means "Ăn gì cũng được". */
export function lobbyPreferenceRows(preferences?: UserPreferences): PreferenceRow[] {
  if (!preferences || isAnything(preferences)) return [];
  const pick = (ids: string[], items: readonly { id: string; label: string }[]) =>
    ids.map(id => items.find(item => item.id === id)?.label).filter((label): label is string => Boolean(label));
  const rows: PreferenceRow[] = [
    { label: 'Loại món', values: pick(preferences.categoryIds, dishSetupCatalogue.categories) },
    { label: 'Ẩm thực', values: pick(preferences.cuisineIds, dishSetupCatalogue.cuisines) },
    { label: 'Hương vị', values: flavorChoices.filter(choice => flavorSelected(preferences, choice)).map(choice => choice.label) },
  ];
  return rows.filter(row => row.values.length > 0);
}
