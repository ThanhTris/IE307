// Spike contract only; GM-03/GM-23 will review the production alphabet/parser.
// Excludes 0/1/I/O. A code never grants membership or permission.
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const LINK = /^gi-cung-duoc:\/\/join\?code=([A-HJ-NP-Z2-9]{6})$/;

export function parseManualCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

export function parseJoinLink(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 100) return null;
  const match = LINK.exec(input);
  // JS $ also matches before a final newline: require the full raw input.
  return match?.[0] === input ? match[1] ?? null : null;
}

export function routeIncomingLink(path: string): string {
  if (path === '/') return '/';
  const code = parseJoinLink(path);
  return code ? `/join?code=${code}` : '/join?invalid=1';
}
