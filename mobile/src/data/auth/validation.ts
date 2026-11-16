import type { StoredSession } from './types';
import { isSessionUser } from '../api/responseGuards';

export function validDisplayName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
    && [...value].length <= 24 && !/[\u0000-\u001f\u007f]/.test(value);
}

export function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.accessToken === 'string' && row.accessToken.length > 0
    && typeof row.refreshToken === 'string' && row.refreshToken.length > 0
    && typeof row.expiresAt === 'string' && Number.isFinite(Date.parse(row.expiresAt))
    && isSessionUser(row.user) && validDisplayName(row.user.displayName);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validNewPassword(value: string): boolean {
  const characters = [...value];
  const bytes = characters.reduce((total, character) => {
    const point = character.codePointAt(0)!;
    return total + (point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4);
  }, 0);
  return characters.length >= 8 && bytes <= 72;
}
