import type { RoomRepository } from '../features/rooms/services/roomRepository';
import type { DishSetupGateway, SetupIntent, SetupRead, SetupReply } from '../features/context/services/dishSetupGateway';
import { dishSetupCatalogue } from './dishSetupCatalogue';
import { emptyPreferences, type SetupDraft, type SetupRoom } from '../features/context/services/dishSetup';

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
        // friends optional
      }

      if (currentRoomId) {
        try {
          const snapRes = await repository.getRoomSnapshot(currentRoomId);
          if (snapRes.ok) {
            const snap = snapRes.data;
            const isHost = currentUser?.id ? snap.hostUserId === currentUser.id : true;
            cachedRoom = {
              id: snap.roomId,
              code: snap.code,
              version: snap.version,
              state: snap.state === 'CANCELLED' ? 'CLOSED' : 'LOBBY',
            };
            const settings: SetupDraft = {
              mealSlot: snap.context.mealSlot ?? 'lunch',
              dishCount: snap.pool?.length || 15,
              timeMode: snap.context.timeHint ? 'scheduled' : 'now',
              desiredAt: snap.context.desiredAt ?? null,
              budget: null,
              avoidRecent: snap.context.avoidRecent ?? true,
              inviteeIds: [],
            };
            return {
              catalogue: dishSetupCatalogue,
              friends,
              connected: isConnected,
              canEditSettings: isHost,
              accountDefaults: emptyPreferences(false),
              ownRoomPreferences: snap.ownPreferences,
              room: cachedRoom,
              settings,
              hasRecentHistory: false,
              closedReason: snap.state === 'CANCELLED' ? 'cancelled' : undefined,
            };
          }
        } catch {
          // snapshot read failed
        }
      }

      return {
        catalogue: dishSetupCatalogue,
        friends,
        connected: isConnected,
        canEditSettings: true,
        accountDefaults: emptyPreferences(false),
        room: cachedRoom,
        hasRecentHistory: false,
      };
    },

    write: async (intent: SetupIntent): Promise<SetupReply> => {
      const currentUser = repository.getCurrentUser();
      const displayName = currentUser?.displayName || 'Host';

      if (intent.kind === 'settings') {
        if (intent.room) {
          const res = await repository.updateContext({
            roomId: intent.room.id,
            expectedVersion: intent.room.version,
            context: {
              anchorId: 'dish-only',
              radiusM: 0,
              desiredAt: intent.draft.desiredAt ?? new Date().toISOString(),
              serviceMode: 'dine_in',
              mealSlot: intent.draft.mealSlot,
              budget: null,
              avoidRecent: intent.draft.avoidRecent,
            },
            requestId: intent.requestId,
          });
          if (res.ok) {
            cachedRoom = {
              id: intent.room.id,
              code: intent.room.code,
              version: intent.room.version + 1,
              state: 'LOBBY',
            };
            return { ok: true, room: cachedRoom };
          }
          return { ok: false, code: 'REJECTED' };
        } else {
          const res = await repository.createRoom({
            displayName,
            context: {
              anchorId: 'dish-only',
              radiusM: 0,
              desiredAt: intent.draft.desiredAt ?? new Date().toISOString(),
              serviceMode: 'dine_in',
              mealSlot: intent.draft.mealSlot,
              budget: null,
              avoidRecent: intent.draft.avoidRecent,
            },
            requestId: intent.requestId,
          });
          if (res.ok) {
            currentRoomId = res.data.roomId;
            cachedRoom = {
              id: res.data.roomId,
              code: res.data.code,
              version: res.data.version,
              state: 'LOBBY',
            };
            return { ok: true, room: cachedRoom };
          }
          return { ok: false, code: 'REJECTED' };
        }
      }

      if (intent.kind === 'preferences') {
        const res = await repository.updatePreferences({
          roomId: intent.room.id,
          expectedVersion: intent.room.version,
          preferences: intent.preferences,
          requestId: intent.requestId,
        });
        if (res.ok) {
          cachedRoom = {
            id: intent.room.id,
            code: intent.room.code,
            version: intent.room.version + 1,
            state: 'LOBBY',
          };
          return { ok: true, room: cachedRoom };
        }
        return { ok: false, code: 'REJECTED' };
      }

      if (intent.kind === 'cancel') {
        const res = await repository.cancelRoom({
          roomId: intent.room.id,
          expectedVersion: intent.room.version,
          confirmCancel: true,
          requestId: intent.requestId,
        });
        if (res.ok) {
          cachedRoom = {
            id: intent.room.id,
            code: intent.room.code,
            version: intent.room.version + 1,
            state: 'CLOSED',
          };
          return { ok: true, room: cachedRoom };
        }
        return { ok: false, code: 'REJECTED' };
      }

      return { ok: false, code: 'REJECTED' };
    },
  };
}
