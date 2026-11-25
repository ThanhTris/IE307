import type { ErrorCode } from '../../data/api/contracts';
import { describeError } from './describeError';
import type { ReportContext } from './errorReport';

/** Where the failing screen belongs: it decides what an error code means there. */
export type FailureScope = 'auth' | 'entry' | 'room' | 'result' | 'social';

/** `stay`: keep the screen and its data; `reload`: read the server again, still here. */
export type Destination = 'stay' | 'reload' | 'home' | 'signIn';

/** The room or result is not available to this person any more, so retrying on the same screen cannot work. */
const ROOM_GONE: readonly ErrorCode[] = ['ROOM_NOT_FOUND', 'ROOM_TERMINAL', 'ROOM_EXPIRED', 'NOT_MEMBER'];
const STALE: readonly ErrorCode[] = ['VERSION_CONFLICT', 'CONTEXT_CHANGED', 'INVALID_ROOM_STATE', 'REQUEST_ID_REUSED'];

export function destinationFor(code: ErrorCode, scope: FailureScope, { isGuest = false }: { isGuest?: boolean } = {}): Destination {
  // The sign-in screens explain their own rejections. A guest has nothing to sign in to: home offers a fresh start.
  if (code === 'AUTH_REQUIRED') return scope === 'auth' ? 'stay' : isGuest ? 'home' : 'signIn';
  const inRoom = scope === 'room' || scope === 'result';
  if (inRoom && (ROOM_GONE.includes(code) || code === 'CONTRACT_MISMATCH')) return 'home';
  if (STALE.includes(code)) return 'reload';
  return 'stay';
}

/** Why a screen is being left. `title` and `message` replace the standard copy when the screen knows more. */
export type FailureExit = {
  code: ErrorCode;
  title?: string;
  message?: string;
  /** Offer "Báo lỗi" where the person lands. Defaults to the cases they could not have caused. */
  reportable?: boolean;
};

export type Incident = {
  destination: Extract<Destination, 'home' | 'signIn'>;
  title: string;
  message: string;
  /** Present only when reporting makes sense. Built from screen ids, never from addresses or room codes. */
  report?: ReportContext;
};

/** Leaving for these is unexpected for the person; a closed or expired room is normal. */
const UNEXPECTED: readonly ErrorCode[] = ['ROOM_NOT_FOUND', 'CONTRACT_MISMATCH'];

export function incidentFor(exit: FailureExit, destination: Incident['destination'], screen: string): Incident {
  const description = describeError({ messageKey: exit.code });
  const reportable = exit.reportable ?? UNEXPECTED.includes(exit.code);
  return {
    destination,
    title: exit.title ?? description.title,
    message: exit.message ?? (destination === 'signIn' ? 'Đăng nhập lại để tiếp tục.' : description.message),
    ...(reportable ? { report: { errorCode: exit.code, screen, action: 'leave_screen', occurredAt: new Date().toISOString() } } : {}),
  };
}
