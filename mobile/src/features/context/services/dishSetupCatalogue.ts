import type { SetupCatalogue } from './dishSetup';
import { MAIN_GROUPS, REGIONS, SNACK_GROUPS } from './filterGroups.generated';

/**
 * Preference choices shown on the "Khẩu vị" screen.
 *
 * Groups and regions are generated from data-preparation/config/filter_taxonomy_v2.json (see
 * data-preparation/scripts/filter_taxonomy.py), with the same IDs the catalogue pipeline gives its taxonomy entries.
 * A dish carries many families and many regions, so a choice matches when the dish has ANY of its IDs
 * (`id` + `linkedIds`). Synthetic UI fixture, not production admission.
 */
export const dishSetupCatalogue: SetupCatalogue = {
  categories: MAIN_GROUPS,
  snackCategories: SNACK_GROUPS,
  cuisines: REGIONS.map(({ origin: _origin, ...option }) => option),
};

/** Category choices for a meal: "Ăn vặt" has its own groups. */
export function categoriesForMeal(catalogue: SetupCatalogue, mealSlot: string | undefined) {
  return mealSlot === 'snack' && catalogue.snackCategories?.length ? catalogue.snackCategories : catalogue.categories;
}
