import type { HistoryConsent, UserPreferences } from '../../../data/api/contracts';
import type { SetupCatalogue, SetupDraft, SetupFriend, SetupRoom } from './dishSetup';

/** UI port; consumer maps verified GM-07.B wire, never casts to legacy RoomContext. */
export type SetupRead = {
  catalogue: SetupCatalogue; friends: SetupFriend[]; connected: boolean; canEditSettings: boolean;
  accountDefaults: UserPreferences; ownRoomPreferences?: UserPreferences; room?: SetupRoom; settings?: SetupDraft;
  historyConsent?: HistoryConsent;
  hasRecentHistory?: boolean; closedReason?: 'cancelled' | 'closed';
};
export type SetupIntent =
  | { kind: 'settings'; requestId: string; draft: SetupDraft; room?: SetupRoom }
  | { kind: 'preferences'; requestId: string; preferences: UserPreferences; changedFields: ('cuisineIds' | 'categoryIds' | 'temperature' | 'flavor')[]; room: SetupRoom }
  | { kind: 'cancel'; requestId: string; room: SetupRoom };
export type SetupReply = { ok: true; room: SetupRoom } | { ok: false; code: 'REJECTED' | 'UNKNOWN' | 'STALE' | 'CLOSED' | 'SHORTAGE'; available?: number; requested?: number }
  | { ok: false; code: 'PARTIAL'; room: SetupRoom; completed: 'settings' | 'preferences'; pendingStep: 'readback' | 'preferences' | 'consent' };
export type DishSetupGateway = { read: () => Promise<SetupRead>; write: (intent: SetupIntent) => Promise<SetupReply> };
