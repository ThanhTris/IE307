import { CONTRACT, MIN_CONFIDENCE, parseProviderOutput } from './contract.ts';
import type { MenuDraft, OcrInput, OcrProvider } from './contract.ts';

function amount(text: string): number | null {
  let n: number;
  if (/^\d+(?:[.,]\d{1,2})?k$/i.test(text)) n = Number(text.slice(0, -1).replace(',', '.')) * 1000;
  else if (/^\d{1,3}(?:[., ]\d{3})+$/.test(text) && !(/[.,]/.test(text) && text.includes(' ')) &&
      !(text.includes('.') && text.includes(','))) n = Number(text.replace(/[., ]/g, ''));
  else if (/^\d+$/.test(text)) n = Number(text);
  else return null;
  return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000 ? n : null;
}

/** Never infer currency or price units from an image, dish name or locale. */
export function parseVndPrice(text: string): [number, number] | null {
  const clean = text.normalize('NFC').trim().toLowerCase().replace(/\s*(?:vnd|vnđ|đ|₫)$/u, '').trim();
  const parts = clean.split(/\s*[-–—]\s*/u);
  if (parts.length < 1 || parts.length > 2) return null;
  const low = amount(parts[0]), high = parts.length === 1 ? low : amount(parts[1]);
  return low !== null && high !== null && low <= high ? [low, high] : null;
}

export function normalizeDraft(output: unknown, input: OcrInput, mode: OcrProvider['mode']): MenuDraft {
  const rows = parseProviderOutput(output);
  const items = rows.map(row => {
    const issues = ['HUMAN_REVIEW_REQUIRED'];
    const name = row.name?.normalize('NFC').trim().replace(/\s+/gu, ' ') || null;
    const nameTrusted = name !== null && row.nameConfidence !== null && row.nameConfidence >= MIN_CONFIDENCE;
    if (!nameTrusted) issues.push('NAME_UNKNOWN_OR_LOW_CONFIDENCE');
    const parsed = row.priceText === null ? null : parseVndPrice(row.priceText);
    if (!parsed) issues.push('PRICE_UNKNOWN_OR_AMBIGUOUS');
    if (row.priceConfidence === null || row.priceConfidence < MIN_CONFIDENCE) issues.push('PRICE_LOW_CONFIDENCE');
    if (row.currency === null) issues.push('CURRENCY_UNKNOWN');
    if (row.unit === null) issues.push('UNIT_UNKNOWN');
    const priceTrusted = parsed !== null && row.priceConfidence !== null && row.priceConfidence >= MIN_CONFIDENCE && row.currency !== null && row.unit !== null;
    return {
      name: nameTrusted ? name : null,
      priceMin: priceTrusted ? parsed[0] : null, priceMax: priceTrusted ? parsed[1] : null,
      currency: priceTrusted ? row.currency : null, unit: priceTrusted ? row.unit : null,
      sourceRef: input.source.sourceRef,
      fieldSources: { menu: input.source.sourceRef, price: priceTrusted ? input.source.sourceRef : null },
      confidence: { name: row.nameConfidence, price: row.priceConfidence }, issues,
      reviewStatus: 'draft' as const,
    };
  });
  return {
    contractVersion: CONTRACT, foodContractVersion: '1.1.0', providerMode: mode,
    reviewStatus: 'draft', publishable: false, sourceRef: input.source.sourceRef,
    sourceRightsVerified: false, venueId: null, coverageId: null, scheduleId: null, items,
  };
}
