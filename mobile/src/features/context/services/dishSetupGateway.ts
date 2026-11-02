import type { UserPreferences } from '../../../data/api/contracts';
import type { SetupCatalogue, SetupDraft, SetupFriend, SetupRoom } from './dishSetup';

/** UI port; consumer maps verified GM-07.B wire, never casts to legacy RoomContext. */
export type SetupRead = {
  catalogue: SetupCatalogue; friends: SetupFriend[]; connected: boolean; canEditSettings: boolean;
  accountDefaults: UserPreferences; ownRoomPreferences?: UserPreferences; room?: SetupRoom; settings?: SetupDraft;
};
export type SetupIntent =
  | { kind: 'settings'; requestId: string; draft: SetupDraft; room?: SetupRoom }
  | { kind: 'preferences'; requestId: string; preferences: UserPreferences; room: SetupRoom };
export type SetupReply = { ok: true; room: SetupRoom } | { ok: false; code: 'REJECTED' | 'UNKNOWN' | 'STALE' | 'CLOSED' | 'SHORTAGE'; available?: number; requested?: number };
export type DishSetupGateway = { read: () => Promise<SetupRead>; write: (intent: SetupIntent) => Promise<SetupReply> };
