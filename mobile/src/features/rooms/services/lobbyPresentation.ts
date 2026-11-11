import type { RoomSnapshot, UserPreferences } from '../../../data/api/contracts';
import { budgetOptions, mealOptions } from '../../context/services/dishSetup';
import { dishSetupCatalogue } from '../../context/services/dishSetupCatalogue';
import { flavorChoices, flavorSelected, isAnything } from '../../preferences/services/dishPreferences';

/** View data for the lobby "Bữa ăn hôm nay" card (Figma 68:429). */
export function lobbyMealSummary(snapshot: RoomSnapshot) {
  const meal = mealOptions.find(option => option.id === snapshot.settings?.mealSlot) ?? mealOptions[1];
  const desiredAt = snapshot.settings?.desiredAt;
  const time = desiredAt ? new Date(desiredAt) : null;
  const timeLabel = time && !Number.isNaN(time.getTime())
    ? `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
    : 'Ăn ngay';
  const dishCount = snapshot.dishCount ?? snapshot.settings?.dishCount ?? (snapshot.pool?.length || undefined);
  return { meal, timeLabel, scheduled: Boolean(time), budgetLabel: budgetLabel(snapshot.ownPreferences), dishCount };
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
