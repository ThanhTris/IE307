import type { FlavorItem, FlavorProfile, UserPreferences } from '../../../data/api/contracts';
import type { SetupCatalogue, SetupOption } from '../../context/services/dishSetup';
import { PLACEHOLDER_IDS } from '../../context/services/dishSetupCatalogue';

export const optionIds = (option: SetupOption) => [option.id, ...(option.linkedIds ?? [])];
/** A group counts as chosen when any of its ids is (older saves may hold only one family of the group). */
export const optionSelected = (chosen: readonly string[], option: SetupOption) => optionIds(option).some(id => chosen.includes(id));
export function togglePreference(preferences: UserPreferences, key: 'categoryIds' | 'cuisineIds', option: SetupOption): UserPreferences {
  const ids = optionIds(option), selected = optionSelected(preferences[key], option);
  return { ...preferences, [key]: selected ? preferences[key].filter(id => !ids.includes(id)) : [...new Set([...preferences[key], ...ids])] };
}
export function isAnything(preferences: UserPreferences) {
  return !preferences.categoryIds.length && !preferences.cuisineIds.length && (!preferences.temperature || preferences.temperature === 'unknown') && !Object.values(preferences.flavor ?? {}).some(item => item.present !== null || item.intensity !== 'unknown');
}
/**
 * Flavour choices (several can be picked). "Mặn / Đậm đà" and "Thanh đạm" are the two ends of saltiness, so picking
 * one clears the other. "Béo / Ngậy" has no flavour field yet and is handled as `fattyChoice` below.
 */
export const flavorChoices = [
  { id: 'spicy', label: 'Cay', key: 'spicy', intensity: 'unknown' },
  { id: 'sour', label: 'Chua / Chua cay', key: 'sour', intensity: 'unknown' },
  { id: 'sweet', label: 'Ngọt', key: 'sweet', intensity: 'unknown' },
  { id: 'rich', label: 'Mặn / Đậm đà', key: 'salty', intensity: 'high' },
  { id: 'light', label: 'Thanh đạm', key: 'salty', intensity: 'low' },
] as const;
/** Béo / Ngậy: stored as a placeholder ID in categoryIds until the flavour contract gets a field for it. */
export const fattyChoice: SetupOption = { id: PLACEHOLDER_IDS.flavorFatty, label: 'Béo / Ngậy', code: 'fatty' };
/**
 * Keeps only the ids the preferences screen can show (groups, their linked families, regions, Béo / Ngậy). Older
 * saved choices (national cuisines, retired groups) would otherwise stay selected with no tile to clear them.
 */
export function knownPreferences(preferences: UserPreferences, catalogue: SetupCatalogue): UserPreferences {
  const categories = new Set([...catalogue.categories, ...(catalogue.snackCategories ?? []), fattyChoice].flatMap(optionIds));
  const cuisines = new Set(catalogue.cuisines.flatMap(optionIds));
  const categoryIds = preferences.categoryIds.filter(id => categories.has(id));
  const cuisineIds = preferences.cuisineIds.filter(id => cuisines.has(id));
  return categoryIds.length === preferences.categoryIds.length && cuisineIds.length === preferences.cuisineIds.length
    ? preferences : { ...preferences, categoryIds, cuisineIds };
}
/** Drops the category groups of the other meal type (e.g. snack groups after switching to lunch). */
export function keepCategoriesOf(preferences: UserPreferences, allowed: readonly SetupOption[], all: readonly SetupOption[]): UserPreferences {
  const allowedIds = new Set(allowed.flatMap(optionIds));
  const groupIds = new Set(all.flatMap(optionIds));
  const categoryIds = preferences.categoryIds.filter(id => !groupIds.has(id) || allowedIds.has(id));
  return categoryIds.length === preferences.categoryIds.length ? preferences : { ...preferences, categoryIds };
}
export function flavorSelected(preferences: UserPreferences, choice: typeof flavorChoices[number]) {
  const item = preferences.flavor?.[choice.key];
  return item?.present === true && item.intensity === choice.intensity;
}
export function toggleFlavor(preferences: UserPreferences, choice: typeof flavorChoices[number]): UserPreferences {
  const unknown = () => ({ present: null, intensity: 'unknown' as const });
  const flavor: FlavorProfile = { spicy: unknown(), salty: unknown(), sour: unknown(), sweet: unknown(), ...preferences.flavor };
  flavor[choice.key] = flavorSelected(preferences, choice) ? unknown() : { present: true, intensity: choice.intensity };
  return { ...preferences, flavor };
}
export const flavorDetailLevels = [
  { id: 'any', label: 'Không ưu tiên', value: { present: null, intensity: 'unknown' } },
  { id: 'none', label: 'Không có', value: { present: false, intensity: 'none' } },
  { id: 'present', label: 'Có, chưa rõ mức', value: { present: true, intensity: 'unknown' } },
  { id: 'low', label: 'Nhẹ', value: { present: true, intensity: 'low' } },
  { id: 'medium', label: 'Vừa', value: { present: true, intensity: 'medium' } },
  { id: 'high', label: 'Đậm', value: { present: true, intensity: 'high' } },
] as const;
export type FlavorDetailLevel = typeof flavorDetailLevels[number]['id'];
export function flavorDetailSelection(item?: FlavorItem) {
  return flavorDetailLevels.find(level => level.value.present === (item?.present ?? null) && level.value.intensity === (item?.intensity ?? 'unknown'))?.id;
}
export function setFlavorDetail(profile: FlavorProfile | undefined, key: keyof FlavorProfile, level: FlavorDetailLevel): FlavorProfile {
  const unknown = () => ({ present: null, intensity: 'unknown' as const });
  const next: FlavorProfile = { spicy: unknown(), salty: unknown(), sweet: unknown(), sour: unknown(), ...profile };
  const selected = flavorDetailLevels.find(item => item.id === level)!;
  next[key] = { ...selected.value };
  return next;
}
