import type { SessionUser } from '../../../data/api/contracts';

export type SessionStatus = 'empty' | 'active' | 'lost' | 'blocked';
export type SessionIssue =
  | 'none'
  | 'no-session'
  | 'restore-unavailable'
  | 'session-recovery-required'
  | 'session-revoked'
  | 'signup-uncertain'
  | 'storage-unavailable'
  | 'unknown-error';

/** Public identity and lifecycle state only; never contains access or refresh tokens. */
export interface SessionSnapshot {
  status: SessionStatus;
  user: SessionUser | null;
  issue: SessionIssue;
}
