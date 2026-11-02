import type { FlavorItem, FlavorProfile, UserPreferences } from '../../../data/api/contracts';
import type { SetupOption } from '../../context/services/dishSetup';

export const optionIds = (option: SetupOption) => [option.id, ...(option.linkedIds ?? [])];
export function togglePreference(preferences: UserPreferences, key: 'categoryIds' | 'cuisineIds', option: SetupOption): UserPreferences {
  const ids = optionIds(option), selected = ids.every(id => preferences[key].includes(id));
  return { ...preferences, [key]: selected ? preferences[key].filter(id => !ids.includes(id)) : [...new Set([...preferences[key], ...ids])] };
}
export function isAnything(preferences: UserPreferences) {
  return !preferences.categoryIds.length && !preferences.cuisineIds.length && (!preferences.temperature || preferences.temperature === 'unknown') && !Object.values(preferences.flavor ?? {}).some(item => item.present !== null || item.intensity !== 'unknown');
}
export const flavorChoices = [
  { id: 'light', label: 'Thanh nhẹ', key: 'salty', intensity: 'low' },
  { id: 'rich', label: 'Đậm đà', key: 'salty', intensity: 'high' },
  { id: 'sour', label: 'Chua', key: 'sour', intensity: 'unknown' },
  { id: 'spicy', label: 'Cay', key: 'spicy', intensity: 'unknown' },
] as const;
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
