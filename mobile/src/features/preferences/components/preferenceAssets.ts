import type { ChoiceIcon } from '../../../shared/ui/icons/ChoiceIcon';

/**
 * Icons for the preference choices, keyed by the option `code` (dish groups, regions) or flavour id.
 * Food glyphs come from Material Community Icons; FontAwesome 6 fills the dishes it lacks (shrimp, bowls).
 * Codes that are not listed render without an icon.
 */
export const preferenceAssets: Record<string, ChoiceIcon> = {
  // Main meals
  'family:rice': { fa: 'bowl-rice' },
  'family:bun': { food: 'noodles' },
  'family:pho': { food: 'noodles' },
  'family:noodles': { symbol: 'soba' },
  'family:hotpot': { food: 'grill' },
  'family:banh_mi': { fa: 'bread-slice' },
  'family:porridge': { food: 'pot-steam' },
  // Ăn vặt
  'snack:fried': { symbol: 'hanami_dango' },
  'snack:savory_cake': { food: 'cookie' },
  'snack:mixed': 'salad',
  'snack:seafood': { fa: 'shrimp' },
  'snack:sweet_cake': { food: 'cupcake' },
  'snack:che': { food: 'ice-cream' },
  'snack:fruit': { food: 'fruit-watermelon' },
  'snack:dry': { food: 'french-fries' },
  // Regions
  'region:north': { fa: 'landmark' },
  'region:central': { fa: 'vihara' },
  'region:south': { food: 'town-hall' },
  'region:mekong': { mi: 'houseboat' },
  // Flavours
  spicy: { fa: 'pepper-hot' },
  sour: { fa: 'lemon' },
  sweet: { food: 'candy' },
  rich: { food: 'shaker-outline' },
  light: { fa: 'seedling' },
  fatty: { fa: 'cheese' },
};
