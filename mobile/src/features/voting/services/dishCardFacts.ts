import type { PoolDish } from '../../../data/api';
import type { ChoiceIcon } from '../../../shared/ui/icons/ChoiceIcon';
import { dishSetupCatalogue } from '../../context/services/dishSetupCatalogue';
import { preferenceAssets } from '../../preferences/components/preferenceAssets';

/** One line of information on a flashcard. Every fact comes from the server; missing data is simply left out. */
export type DishFact = { key: string; label: string; icon?: ChoiceIcon };

const MEAL: Record<string, { label: string; icon: ChoiceIcon }> = {
  breakfast: { label: 'Sáng', icon: 'sunrise' }, lunch: { label: 'Trưa', icon: 'meal' },
  dinner: { label: 'Tối', icon: 'moon' }, snack: { label: 'Ăn vặt', icon: 'snack' },
};
const TEMPERATURE: Record<string, { label: string; icon: ChoiceIcon }> = {
  hot: { label: 'Món nóng', icon: 'flame' }, warm: { label: 'Món ấm', icon: 'flame' },
  cold: { label: 'Món lạnh', icon: { food: 'snowflake' } }, ambient: { label: 'Nhiệt độ thường', icon: 'leaf' },
};
const ORIGIN: Record<string, string> = { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' };
const FLAVOR: Record<string, { label: string; icon: ChoiceIcon }> = {
  spicy: { label: 'Cay', icon: { food: 'chili-hot' } }, salty: { label: 'Mặn', icon: { food: 'shaker-outline' } },
  sweet: { label: 'Ngọt', icon: 'cake' }, sour: { label: 'Chua', icon: { food: 'fruit-citrus' } },
};
const INTENSITY: Record<string, string> = { low: 'ít', medium: 'vừa', high: 'nhiều' };

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
  for (const item of labelled(dish.categoryIds, dish.categoryLabels, dishSetupCatalogue.categories)) {
    facts.push({ key: `category:${item.label}`, label: item.label, icon: item.icon ? preferenceAssets[item.icon] : undefined });
  }
  for (const item of labelled(dish.cuisineIds, dish.cuisineLabels, dishSetupCatalogue.cuisines)) {
    facts.push({ key: `cuisine:${item.label}`, label: `Món ${item.label}`, icon: item.icon ? preferenceAssets[item.icon] : undefined });
  }
  const meals = (dish.mealSlots ?? []).filter(slot => MEAL[slot]);
  if (meals.length) facts.push({ key: 'meals', label: meals.map(slot => MEAL[slot]!.label).join(' · '), icon: MEAL[meals[0]!]!.icon });
  if (dish.temperature && TEMPERATURE[dish.temperature]) facts.push({ key: 'temperature', ...TEMPERATURE[dish.temperature]! });
  if (dish.flavor) {
    for (const [name, value] of Object.entries(dish.flavor)) {
      if (!FLAVOR[name] || value?.present !== true) continue;
      const strength = INTENSITY[value.intensity] ? ` ${INTENSITY[value.intensity]}` : '';
      facts.push({ key: `flavor:${name}`, label: `${FLAVOR[name]!.label}${strength}`, icon: FLAVOR[name]!.icon });
    }
  }
  if (dish.origin && ORIGIN[dish.origin]) facts.push({ key: 'origin', label: ORIGIN[dish.origin]!, icon: 'globe' });
  return facts;
}
