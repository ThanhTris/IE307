import type { ChoiceIcon } from '../../../shared/ui/icons/ChoiceIcon';

/** Food glyphs for dish families and flavours, flags for cuisines; unmapped codes render without an icon. */
export const preferenceAssets: Record<string, ChoiceIcon> = {
  'family:rice': { food: 'rice' },
  'family:bun': { food: 'noodles' },
  'family:pho': { food: 'noodles' },
  'family:noodles': { food: 'pasta' },
  'family:hotpot': { food: 'pot-steam-outline' },
  'family:rolls': { food: 'food-hot-dog' },
  'family:banh_cuon': { food: 'food-croissant' },
  vi: { flag: '🇻🇳' },
  ko: { flag: '🇰🇷' },
  ja: { flag: '🇯🇵' },
  zh: { flag: '🇨🇳' },
  th: { flag: '🇹🇭' },
  it: { flag: '🇮🇹' },
  light: { food: 'leaf' },
  rich: { food: 'shaker-outline' },
  sour: { food: 'fruit-citrus' },
  spicy: { food: 'chili-hot' },
};
