import schemas from './resultWireSchemas.json';

type Schema = Record<string, any>;
const supported = new Set(['$ref', 'type', 'enum', 'const', 'minLength', 'maxLength', 'pattern', 'format',
  'minimum', 'maximum', 'minItems', 'maxItems', 'uniqueItems', 'items', 'contains', 'minContains',
  'maxContains', 'required', 'additionalProperties', 'properties', 'allOf', 'oneOf', 'not', 'if', 'then', 'else', 'description']);
const equal = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  return Array.isArray(a) === Array.isArray(b) && Object.keys(x).length === Object.keys(y).length
    && Object.keys(x).every(k => Object.hasOwn(y, k) && equal(x[k], y[k]));
};
function format(value: string, name: string): boolean {
  if (name === 'uuid') return value.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  if (name === 'uri') return /^[a-z][a-z0-9+.-]*:/i.test(value) && !/[^\x21-\x7e]|[<>"{}|\\^`]|%(?![0-9a-f]{2})/i.test(value);
  if (name === 'date-time') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})t\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:z|[+-]\d{2}:\d{2})$/i.exec(value);
    if (!parts || parts[0] !== value || !Number.isFinite(Date.parse(value))) return false;
    const year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]!;
  }
  return false;
}
/** Evaluates the received, locally bundled terminal schema before any projection. */
function matches(v: any, s: Schema, defs: Record<string, Schema>): boolean {
  // Schema changes that require a new keyword must fail closed until supported.
  if (Object.keys(s).some(key => !supported.has(key))) return false;
  if (s.$ref) { const target = defs[s.$ref.split('/').pop()!]; if (!target || !matches(v, target, defs)) return false; }
  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((t: string) => t === 'null' ? v === null : t === 'array' ? Array.isArray(v)
      : t === 'object' ? !!v && typeof v === 'object' && !Array.isArray(v)
      : t === 'integer' ? Number.isInteger(v) : t === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === t)) return false;
  }
  if (Object.hasOwn(s, 'const') && !equal(v, s.const)) return false;
  if (s.enum && !s.enum.some((x: unknown) => equal(v, x))) return false;
  if (typeof v === 'string' && ((s.minLength !== undefined && [...v].length < s.minLength)
    || (s.maxLength !== undefined && [...v].length > s.maxLength) || (s.pattern && !new RegExp(s.pattern).test(v)) || (s.format && !format(v, s.format)))) return false;
  if (typeof v === 'number' && ((s.minimum !== undefined && v < s.minimum) || (s.maximum !== undefined && v > s.maximum))) return false;
  if (Array.isArray(v)) {
    if ((s.minItems !== undefined && v.length < s.minItems) || (s.maxItems !== undefined && v.length > s.maxItems)) return false;
    if (s.uniqueItems && v.some((x, i) => v.slice(0, i).some(y => equal(x, y)))) return false;
    if (s.items && !v.every(x => matches(x, s.items, defs))) return false;
    if (s.contains) { const n = v.filter(x => matches(x, s.contains, defs)).length; if (n < (s.minContains ?? 1) || n > (s.maxContains ?? Infinity)) return false; }
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if (s.required?.some((k: string) => !Object.hasOwn(v, k))) return false;
    if (s.additionalProperties === false && Object.keys(v).some(k => !Object.hasOwn(s.properties ?? {}, k))) return false;
    if (s.properties && !Object.keys(s.properties).every(k => !Object.hasOwn(v, k) || matches(v[k], s.properties[k], defs))) return false;
  }
  if (s.allOf && !s.allOf.every((x: Schema) => matches(v, x, defs))) return false;
  if (s.oneOf && s.oneOf.filter((x: Schema) => matches(v, x, defs)).length !== 1) return false;
  if (s.not && matches(v, s.not, defs)) return false;
  if (s.if && !matches(v, matches(v, s.if, defs) ? (s.then ?? {}) : (s.else ?? {}), defs)) return false;
  return true;
}
export function validRawDish(value: unknown): boolean {
  return matches(value, schemas.supplement.poolDish, schemas.supplement);
}
export function validRawTerminal(value: unknown): boolean {
  const version = (value as { contractVersion?: unknown } | null)?.contractVersion;
  const defs = version === 'dish-session-v4/roadmap-v2/GM-07.B' ? schemas.baseline : schemas.supplement;
  return matches(value, defs.terminalResult, defs);
}
