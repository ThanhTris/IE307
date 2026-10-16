/** GM36.1 draft interchange; deliberately not an importable food-v1 bundle. */
export const CONTRACT = 'food-v1/roadmap-v2/GM-36.1';
export const MAX_IMAGE_BYTES = 1024 * 1024;
export const MAX_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4096;
export const MAX_ITEMS = 50;
export const MIN_CONFIDENCE = 0.85;
export const PRICE_UNITS = ['portion', 'item', 'person', 'group', 'kg', 'menu_item_unspecified'] as const;
export type PriceUnit = typeof PRICE_UNITS[number];
export type ErrorCode = 'AUTH_REQUIRED' | 'AUTH_UNAVAILABLE' | 'OCR_FORBIDDEN' |
  'OCR_DISABLED' | 'INVALID_INPUT' | 'PAYLOAD_TOO_LARGE' | 'INVALID_IMAGE' |
  'CONSENT_REQUIRED' | 'SOURCE_RIGHTS_REQUIRED' | 'RATE_LIMITED' |
  'OCR_TIMEOUT' | 'OCR_UNAVAILABLE' | 'OCR_MALFORMED_OUTPUT' | 'OCR_NO_TEXT' |
  'METHOD_NOT_ALLOWED' | 'UNSUPPORTED_MEDIA_TYPE' | 'REQUEST_TIMEOUT';

export class OcrError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  constructor(code: ErrorCode, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export interface SourceDeclaration {
  sourceRef: string;
  usageRights: 'granted' | 'licensed' | 'public_domain';
  license: string | null;
}
export interface OcrInput {
  requestId: string;
  image: { mimeType: 'image/png' | 'image/jpeg'; bytes: Uint8Array };
  source: SourceDeclaration;
}
export interface ProviderRow {
  name: string | null;
  nameConfidence: number | null;
  priceText: string | null;
  priceConfidence: number | null;
  currency: 'VND' | null;
  unit: PriceUnit | null;
}
export interface OcrProvider {
  readonly mode: 'on-device' | 'test-double';
  recognize(image: OcrInput['image'], signal: AbortSignal): Promise<unknown>;
}
export interface DraftItem {
  name: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: 'VND' | null;
  unit: PriceUnit | null;
  sourceRef: string;
  fieldSources: { menu: string; price: string | null };
  confidence: { name: number | null; price: number | null };
  issues: string[];
  reviewStatus: 'draft';
}
export interface MenuDraft {
  contractVersion: typeof CONTRACT;
  foodContractVersion: '1.1.0';
  providerMode: OcrProvider['mode'];
  reviewStatus: 'draft';
  publishable: false;
  sourceRef: string;
  sourceRightsVerified: false;
  venueId: null;
  coverageId: null;
  scheduleId: null;
  items: DraftItem[];
}

export const uuid = (v: unknown): v is string => typeof v === 'string' &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
export function record(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
export function exactKeys(v: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
}
function boundedText(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length <= max && !/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(v);
}

function imageBytes(value: unknown): OcrInput['image'] {
  if (!record(value) || !exactKeys(value, ['mimeType', 'dataBase64']) ||
      !['image/png', 'image/jpeg'].includes(String(value.mimeType)) || typeof value.dataBase64 !== 'string') {
    throw new OcrError('INVALID_IMAGE', 400);
  }
  const encoded = value.dataBase64;
  if (encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new OcrError('PAYLOAD_TOO_LARGE', 413);
  if (!encoded.length || encoded.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new OcrError('INVALID_IMAGE', 400);
  }
  let binary: string;
  try { binary = atob(encoded); } catch { throw new OcrError('INVALID_IMAGE', 400); }
  if (btoa(binary) !== encoded) throw new OcrError('INVALID_IMAGE', 400);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (bytes.length > MAX_IMAGE_BYTES) throw new OcrError('PAYLOAD_TOO_LARGE', 413);
  // Container checks, not a substitute for the reviewed recognizer's safe decoder.
  if (value.mimeType === 'image/png') {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 45 || !signature.every((b, i) => bytes[i] === b) ||
        String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR' ||
        String.fromCharCode(...bytes.slice(-8, -4)) !== 'IEND') throw new OcrError('INVALID_IMAGE', 400);
    const view = new DataView(bytes.buffer);
    const width = view.getUint32(16), height = view.getUint32(20);
    if (!width || !height || width > 4096 || height > 4096) throw new OcrError('INVALID_IMAGE', 400);
  } else if (bytes.length < 16 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 ||
             bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new OcrError('INVALID_IMAGE', 400);
  return { mimeType: value.mimeType as OcrInput['image']['mimeType'], bytes };
}

export function parseInput(value: unknown): OcrInput {
  if (!record(value) || !exactKeys(value, ['requestId', 'image', 'source', 'processingConsent']) ||
      typeof value.requestId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.requestId)) {
    throw new OcrError('INVALID_INPUT', 400);
  }
  if (value.processingConsent !== true) throw new OcrError('CONSENT_REQUIRED', 400);
  const s = value.source;
  if (!record(s) || !exactKeys(s, ['sourceRef', 'usageRights', 'license']) || !uuid(s.sourceRef) ||
      !['granted', 'licensed', 'public_domain'].includes(String(s.usageRights)) ||
      !(s.license === null || (boundedText(s.license, 500) && s.license.trim().length > 0)) ||
      (s.usageRights === 'licensed' && s.license === null)) throw new OcrError('SOURCE_RIGHTS_REQUIRED', 400);
  return { requestId: value.requestId, image: imageBytes(value.image), source: s as unknown as SourceDeclaration };
}

export function parseProviderOutput(value: unknown): ProviderRow[] {
  const bad = () => new OcrError('OCR_MALFORMED_OUTPUT', 502);
  if (!record(value) || !exactKeys(value, ['items']) || !Array.isArray(value.items) || value.items.length > MAX_ITEMS) throw bad();
  if (!value.items.length) throw new OcrError('OCR_NO_TEXT', 422);
  for (const row of value.items) {
    if (!record(row) || !exactKeys(row, ['name', 'nameConfidence', 'priceText', 'priceConfidence', 'currency', 'unit']) ||
        !(row.name === null || boundedText(row.name, 160)) ||
        !(row.priceText === null || boundedText(row.priceText, 80)) ||
        ![row.nameConfidence, row.priceConfidence].every(c => c === null || (typeof c === 'number' && Number.isFinite(c) && c >= 0 && c <= 1)) ||
        !(row.currency === null || row.currency === 'VND') ||
        !(row.unit === null || PRICE_UNITS.includes(row.unit as PriceUnit))) throw bad();
  }
  return value.items as ProviderRow[];
}
