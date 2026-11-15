import type { PoolDish } from '../../../data/api';

const CURRENCY_LABEL: Record<string, string> = {
  VND: 'K',
  USD: 'USD',
  THB: 'THB',
  KRW: 'KRW',
  JPY: 'JPY',
  CNY: 'CNY',
  EUR: 'EUR',
};

const UNIT_LABEL: Record<string, string> = {
  portion: 'phần',
  item: 'món',
  person: 'người',
  group: 'nhóm',
  kg: 'kg',
};

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const kilo = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Formats only a price whose amount, currency, and unit are all known. */
export function formatDishPrice(dish: Pick<PoolDish, 'priceMin' | 'priceMax' | 'currency' | 'unit'>): string | undefined {
  const { priceMin, priceMax, currency, unit } = dish;
  if (typeof priceMin !== 'number' || !Number.isFinite(priceMin) || priceMin < 0) return undefined;
  if (!currency || currency === 'other' || !unit) return undefined;

  const currencyLabel = CURRENCY_LABEL[currency];
  if (!currencyLabel) return undefined;

  const hasMax = typeof priceMax === 'number' && Number.isFinite(priceMax) && priceMax > priceMin;
  const unitLabel = UNIT_LABEL[unit];
  const unitSuffix = unit === 'menu_item_unspecified' ? '' : unitLabel ? `/${unitLabel}` : '';

  // VND reads like the budget choices: thousands with a K (55–75K, Từ 55K, 50K/kg).
  if (currency === 'VND') {
    const range = hasMax ? `${kilo.format(priceMin / 1000)}–${kilo.format(priceMax / 1000)}K` : `${priceMax == null ? 'Từ ' : ''}${kilo.format(priceMin / 1000)}K`;
    return `${range}${unitSuffix}`;
  }

  const amount = hasMax
    ? `${number.format(priceMin)}–${number.format(priceMax)}`
    : `${priceMax == null ? 'Từ ' : ''}${number.format(priceMin)}`;
  return `${amount} ${currencyLabel}${unitSuffix}`;
}
