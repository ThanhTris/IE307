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
    && isSessionUser(row.user) && row.user.isGuest && validDisplayName(row.user.displayName);
}
