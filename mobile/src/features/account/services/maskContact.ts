const HIDDEN = '••••';

/**
 * Hides an email for screens that only confirm where a code was sent: the start of the address is replaced by a fixed
 * number of dots (so the length does not leak) and only the end stays visible, e.g. `••••n@example.com`.
 * The last letter of the name is kept only when the name is long enough not to give much away.
 */
export function maskEmail(value: string): string {
  const email = value.trim();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return HIDDEN;
  const local = email.slice(0, at);
  const tail = [...local].length >= 4 ? [...local].slice(-1).join('') : '';
  return `${HIDDEN}${tail}${email.slice(at)}`;
}

/** Hides a phone number, leaving only the last three digits: `•••••••123`. Too short to show anything safely: dots only. */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) return HIDDEN;
  return `•••••••${digits.slice(-3)}`;
}

/** Masks whichever of email or phone the code was sent to. */
export function maskContact(value: string): string {
  return value.includes('@') ? maskEmail(value) : maskPhone(value);
}
