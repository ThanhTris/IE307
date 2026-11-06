import type { PoolDish } from '../../../data/api';

const CURRENCY_LABEL: Record<string, string> = {
  VND: '₫',
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

/** Formats only a price whose amount, currency, and unit are all known. */
export function formatDishPrice(dish: Pick<PoolDish, 'priceMin' | 'priceMax' | 'currency' | 'unit'>): string | undefined {
  const { priceMin, priceMax, currency, unit } = dish;
  if (typeof priceMin !== 'number' || !Number.isFinite(priceMin) || priceMin < 0) return undefined;
  if (!currency || currency === 'other' || !unit) return undefined;

  const currencyLabel = CURRENCY_LABEL[currency];
  if (!currencyLabel) return undefined;

  const amount = typeof priceMax === 'number' && Number.isFinite(priceMax) && priceMax > priceMin
    ? `${number.format(priceMin)}–${number.format(priceMax)}`
    : `${priceMax == null ? 'Từ ' : ''}${number.format(priceMin)}`;
  const unitLabel = UNIT_LABEL[unit];
  const unitSuffix = unit === 'menu_item_unspecified'
    ? ' · đơn vị chưa rõ'
    : unitLabel
      ? `/${unitLabel}`
      : '';

  return `${amount} ${currencyLabel}${unitSuffix}`;
}
