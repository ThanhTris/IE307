import type { RoomRepository } from '../features/rooms/services/roomRepository';
import type { DishSetupGateway, SetupIntent, SetupRead, SetupReply } from '../features/context/services/dishSetupGateway';
import { dishSetupCatalogue } from './dishSetupCatalogue';
import { emptyPreferences, type SetupDraft, type SetupRoom } from '../features/context/services/dishSetup';

function mapDraftBudget(budget: SetupDraft['budget']): { maximum: number; currency: 'VND'; unit: 'person' } | null {
  if (!budget) return null;
  if (budget === 'under50') return { maximum: 50000, currency: 'VND', unit: 'person' };
  if (budget === '50to100') return { maximum: 100000, currency: 'VND', unit: 'person' };
  if (budget === '100to200') return { maximum: 200000, currency: 'VND', unit: 'person' };
  return null;
}

function mapCanonicalBudgetToDraft(budget: unknown): SetupDraft['budget'] {
  if (!budget || typeof budget !== 'object') return null;
  const b = budget as { maximum?: number };
  if (typeof b.maximum !== 'number') return null;
  if (b.maximum <= 50000) return 'under50';
  if (b.maximum <= 100000) return '50to100';
  if (b.maximum <= 200000) return '100to200';
  return null;
}

function toWirePreferences(raw: any, fallbackAvoidRecent = false) {
  return {
    cuisineIds: Array.isArray(raw?.cuisineIds) ? raw.cuisineIds : [],
    categoryIds: Array.isArray(raw?.categoryIds) ? raw.categoryIds : [],
    temperature: typeof raw?.temperature === 'string' ? raw.temperature : null,
    flavor: raw?.flavor && typeof raw.flavor === 'object' ? raw.flavor : null,
    budget: raw?.budget && typeof raw.budget === 'object' ? raw.budget : null,
    avoidRecent: typeof raw?.avoidRecent === 'boolean' ? raw.avoidRecent : fallbackAvoidRecent,
  };
}

export function createLiveDishSetupGateway(
  repository: RoomRepository,
  initialRoomId?: string
): DishSetupGateway {
  let currentRoomId = initialRoomId;
  let cachedRoom: SetupRoom | undefined;

  return {
    read: async (): Promise<SetupRead> => {
      const isConnected = repository.getSessionStatus() === 'active';
      const currentUser = repository.getCurrentUser();

      let friends: { id: string; label: string }[] = [];
      try {
        const friendsRes = await repository.listFriends();
        if (friendsRes.ok && Array.isArray(friendsRes.data)) {
          friends = friendsRes.data.map(f => ({ id: f.friendUserId || f.id, label: f.displayName }));
        }
      } catch {
        // Friends optional in read
      }

      let accountDefaults = emptyPreferences(false);
      try {
        const defsRes = await repository.getDefaultPreferences?.();
        if (defsRes?.ok && defsRes.data?.preferences) {
          accountDefaults = defsRes.data.preferences;
        }
      } catch {
        // Fallback to emptyPreferences
      }

      if (currentRoomId) {
        const snapRes = await repository.dispatchDishSession<any>('snapshot', { roomId: currentRoomId });
        if (!snapRes.ok) {
          throw new Error(`Failed to read room snapshot: ${snapRes.error.message || snapRes.error.messageKey}`);
        }
        const snap = snapRes.data;
        const isHost = currentUser?.id ? snap.hostUserId === currentUser.id : true;
        const isClosed = snap.state !== 'LOBBY';
        cachedRoom = {
          id: snap.roomId,
          code: snap.code,
          version: snap.version,
          state: isClosed ? 'CLOSED' : 'LOBBY',
        };
        const snapSettings = snap.settings;
        const ownPref = snap.ownPreferences;
        const settings: SetupDraft = {
          mealSlot: snapSettings?.mealSlot ?? 'lunch',
          dishCount: snapSettings?.dishCount ?? snap.pool?.length ?? 15,
          timeMode: snapSettings?.desiredAt ? 'scheduled' : 'now',
          desiredAt: snapSettings?.desiredAt ?? null,
          budget: mapCanonicalBudgetToDraft(ownPref?.budget),
          avoidRecent: typeof ownPref?.avoidRecent === 'boolean' ? ownPref.avoidRecent : true,
          inviteeIds: [],
        };
        return {
          catalogue: dishSetupCatalogue,
          friends,
          connected: isConnected,
          canEditSettings: isHost,
          accountDefaults,
          ownRoomPreferences: ownPref,
          room: cachedRoom,
          settings,
          hasRecentHistory: false,
          closedReason: snap.state === 'CANCELLED' ? 'cancelled' : isClosed ? 'closed' : undefined,
        };
      }

      return {
        catalogue: dishSetupCatalogue,
        friends,
        connected: isConnected,
        canEditSettings: true,
        accountDefaults,
        room: cachedRoom,
        hasRecentHistory: false,
      };
    },

    write: async (intent: SetupIntent): Promise<SetupReply> => {
      const currentUser = repository.getCurrentUser();
      const displayName = (currentUser?.displayName || 'Host').trim();

      if (intent.kind === 'settings') {
        // Deterministic frozen desiredAt: null if now, string if scheduled
        const desiredAt = intent.draft.timeMode === 'scheduled' ? (intent.draft.desiredAt || null) : null;
        const settingsPayload = {
          dishCount: intent.draft.dishCount,
          mealSlot: intent.draft.mealSlot,
          desiredAt,
        };

        if (intent.room) {
          const res = await repository.dispatchDishSession<{ accepted: boolean; version?: number }>(
            'updateSettings',
            {
              requestId: intent.requestId,
              roomId: intent.room.id,
              expectedVersion: intent.room.version,
              settings: settingsPayload,
            }
          );

          if (res.ok) {
            cachedRoom = {
              id: intent.room.id,
              code: intent.room.code,
              version: res.data.version ?? (intent.room.version + 1),
              state: 'LOBBY',
            };
            return { ok: true, room: cachedRoom };
          }

          const code = res.error.messageKey as string;
          if (code === 'INSUFFICIENT_DISHES') {
            const details = res.error.details as { available?: number; requested?: number } | undefined;
            return {
              ok: false,
              code: 'SHORTAGE',
              available: details?.available ?? 0,
              requested: details?.requested ?? intent.draft.dishCount,
            };
          }
          if (code === 'VERSION_CONFLICT') {
            return { ok: false, code: 'STALE' };
          }
          if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
            return { ok: false, code: 'UNKNOWN' };
          }
          if (code === 'ROOM_EXPIRED' || code === 'ROOM_TERMINAL' || code === 'INVALID_ROOM_STATE') {
            return { ok: false, code: 'CLOSED' };
          }
          return { ok: false, code: 'REJECTED' };
        } else {
          const budgetObj = mapDraftBudget(intent.draft.budget);
          const res = await repository.dispatchDishSession<{ roomId: string; code: string; version: number; expiresAt: string }>(
            'create',
            {
              requestId: intent.requestId,
              displayName,
              settings: settingsPayload,
              preferences: {
                cuisineIds: [],
                categoryIds: [],
                temperature: null,
                flavor: null,
                budget: budgetObj,
                avoidRecent: intent.draft.avoidRecent,
              },
            }
          );

          if (res.ok) {
            const d = res.data;
            if (!d || typeof d !== 'object' || !d.roomId || !d.code || typeof d.version !== 'number') {
              return { ok: false, code: 'REJECTED' };
            }
            currentRoomId = d.roomId;
            cachedRoom = {
              id: d.roomId,
              code: d.code,
              version: d.version,
              state: 'LOBBY',
            };
            return { ok: true, room: cachedRoom };
          }

          const code = res.error.messageKey as string;
          if (code === 'INSUFFICIENT_DISHES') {
            const details = res.error.details as { available?: number; requested?: number } | undefined;
            return {
              ok: false,
              code: 'SHORTAGE',
              available: details?.available ?? 0,
              requested: details?.requested ?? intent.draft.dishCount,
            };
          }
          if (code === 'VERSION_CONFLICT') {
            return { ok: false, code: 'STALE' };
          }
          if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
            return { ok: false, code: 'UNKNOWN' };
          }
          if (code === 'ROOM_EXPIRED' || code === 'ROOM_TERMINAL' || code === 'INVALID_ROOM_STATE') {
            return { ok: false, code: 'CLOSED' };
          }
          return { ok: false, code: 'REJECTED' };
        }
      }

      if (intent.kind === 'preferences') {
        const preferencesPayload = toWirePreferences(intent.preferences, false);
        const res = await repository.dispatchDishSession<{ accepted: boolean }>(
          'updatePreferences',
          {
            requestId: intent.requestId,
            roomId: intent.room.id,
            expectedVersion: intent.room.version,
            preferences: preferencesPayload,
          }
        );

        if (res.ok) {
          cachedRoom = {
            id: intent.room.id,
            code: intent.room.code,
            version: intent.room.version + 1,
            state: 'LOBBY',
          };
          return { ok: true, room: cachedRoom };
        }

        const code = res.error.messageKey;
        if (code === 'VERSION_CONFLICT') {
          return { ok: false, code: 'STALE' };
        }
        if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
          return { ok: false, code: 'UNKNOWN' };
        }
        if (code === 'ROOM_EXPIRED' || code === 'ROOM_TERMINAL' || code === 'INVALID_ROOM_STATE') {
          return { ok: false, code: 'CLOSED' };
        }
        return { ok: false, code: 'REJECTED' };
      }

      if (intent.kind === 'cancel') {
        const res = await repository.dispatchDishSession<{ accepted: boolean }>(
          'cancel',
          {
            requestId: intent.requestId,
            roomId: intent.room.id,
            expectedVersion: intent.room.version,
          }
        );

        if (res.ok) {
          cachedRoom = {
            id: intent.room.id,
            code: intent.room.code,
            version: intent.room.version + 1,
            state: 'CLOSED',
          };
          return { ok: true, room: cachedRoom };
        }

        const code = res.error.messageKey;
        if (code === 'VERSION_CONFLICT') {
          return { ok: false, code: 'STALE' };
        }
        if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
          return { ok: false, code: 'UNKNOWN' };
        }
        return { ok: false, code: 'REJECTED' };
      }

      return { ok: false, code: 'REJECTED' };
    },
  };
}
