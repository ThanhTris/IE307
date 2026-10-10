// Draft contract; changing an ID/key needs migration and reviewer approval.
export const FOOD_CONTRACT_VERSION = 'food-v1.gm03-draft.1' as const;
export const TEMPERATURES = ['hot', 'warm', 'cold', 'ambient', 'unknown'] as const;
export const FLAVORS = ['spicy', 'salty', 'sweet', 'sour'] as const;
export const INTENSITIES = ['none', 'low', 'medium', 'high', 'unknown'] as const;
export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const TAXON_TYPES = ['cuisine', 'origin', 'category', 'temperature', 'flavor', 'meal_slot'] as const;
export const SOURCE_KINDS = ['editorial', 'menu', 'price', 'hours', 'location', 'artwork'] as const;

// No accent removal: different Vietnamese names must not silently collapse.
export function normalizeDishName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}
