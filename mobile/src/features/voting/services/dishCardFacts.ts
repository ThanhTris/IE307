import type { PoolDish } from '../../../data/api';
import type { ChoiceIcon } from '../../../shared/ui/icons/ChoiceIcon';
import { PLACEHOLDER_IDS, dishSetupCatalogue } from '../../context/services/dishSetupCatalogue';
import { preferenceAssets } from '../../preferences/components/preferenceAssets';

/** One line of information on a flashcard. Every fact comes from the server; missing data is simply left out. */
export type DishFact = { key: string; label: string; icon?: ChoiceIcon };

const MEAL: Record<string, { label: string; icon: ChoiceIcon }> = {
  breakfast: { label: 'Sáng', icon: 'sunrise' }, lunch: { label: 'Trưa', icon: 'sun' },
  dinner: { label: 'Tối', icon: 'moon' }, snack: { label: 'Ăn vặt', icon: 'snack' },
};
const TEMPERATURE: Record<string, { label: string; icon: ChoiceIcon }> = {
  hot: { label: 'Món nóng', icon: 'flame' }, warm: { label: 'Món ấm', icon: 'flame' },
  cold: { label: 'Món lạnh', icon: { food: 'snowflake' } }, ambient: { label: 'Nhiệt độ thường', icon: 'leaf' },
};
/** Same region names as the "Ẩm thực" choices on the preferences screen. */
const ORIGIN: Record<string, { label: string; icon: ChoiceIcon }> = {
  north: { label: 'Miền Bắc', icon: preferenceAssets['region:north']! }, central: { label: 'Miền Trung', icon: preferenceAssets['region:central']! },
  south: { label: 'Miền Nam', icon: preferenceAssets['region:south']! }, west: { label: 'Miền Tây', icon: preferenceAssets['region:mekong']! },
};

/** Server labels first; otherwise the catalogue the setup screen uses (matching an id or one it links to). */
function labelled(ids: readonly string[] | undefined, labels: readonly string[] | undefined, options: typeof dishSetupCatalogue.categories) {
  if (labels?.length) return labels.map(label => ({ label, icon: options.find(option => option.label === label)?.code }));
  const seen = new Set<string>();
  return (ids ?? []).flatMap(id => {
    const option = options.find(item => item.id === id || item.linkedIds?.includes(id));
    if (!option || seen.has(option.id)) return [];
    seen.add(option.id);
    return [{ label: option.label, icon: option.code }];
  });
}

export function dishCardFacts(dish: PoolDish & { cuisineLabels?: string[]; categoryLabels?: string[]; mealSlots?: string[] }): DishFact[] {
  const facts: DishFact[] = [];
  for (const item of labelled(dish.categoryIds, dish.categoryLabels, [...dishSetupCatalogue.categories, ...(dishSetupCatalogue.snackCategories ?? [])])) {
    facts.push({ key: `category:${item.label}`, label: item.label, icon: item.icon ? preferenceAssets[item.icon] : undefined });
  }
  // "Ẩm thực" is a region now: a server cuisine label or the dish's own origin, shown once.
  const regions = new Set<string>();
  for (const item of labelled(dish.cuisineIds, dish.cuisineLabels, dishSetupCatalogue.cuisines)) {
    regions.add(item.label);
    facts.push({ key: `cuisine:${item.label}`, label: item.label, icon: item.icon ? preferenceAssets[item.icon] : undefined });
  }
  if (dish.origin && ORIGIN[dish.origin] && !regions.has(ORIGIN[dish.origin]!.label)) facts.push({ key: 'origin', ...ORIGIN[dish.origin]! });
  const meals = (dish.mealSlots ?? []).filter(slot => MEAL[slot]);
  if (meals.length) facts.push({ key: 'meals', label: meals.map(slot => MEAL[slot]!.label).join(' · '), icon: MEAL[meals[0]!]!.icon });
  if (dish.temperature && TEMPERATURE[dish.temperature]) facts.push({ key: 'temperature', ...TEMPERATURE[dish.temperature]! });
  // Flavours use the same six names as the preferences screen (no strength words).
  const flavor = dish.flavor;
  const has = (name: 'spicy' | 'salty' | 'sweet' | 'sour') => flavor?.[name]?.present === true;
  if (has('spicy')) facts.push({ key: 'flavor:spicy', label: 'Cay', icon: preferenceAssets.spicy });
  if (has('sour')) facts.push({ key: 'flavor:sour', label: 'Chua / Chua cay', icon: preferenceAssets.sour });
  if (has('sweet')) facts.push({ key: 'flavor:sweet', label: 'Ngọt', icon: preferenceAssets.sweet });
  if (has('salty')) {
    const light = flavor?.salty?.intensity === 'low';
    facts.push({ key: light ? 'flavor:light' : 'flavor:rich', label: light ? 'Thanh đạm' : 'Mặn / Đậm đà', icon: preferenceAssets[light ? 'light' : 'rich'] });
  }
  if (dish.categoryIds.includes(PLACEHOLDER_IDS.flavorFatty)) facts.push({ key: 'flavor:fatty', label: 'Béo / Ngậy', icon: preferenceAssets.fatty });
  return facts;
}
