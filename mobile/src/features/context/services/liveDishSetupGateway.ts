import type { RoomRepository } from '../../rooms/services/roomRepository';
import type { DishSetupGateway, SetupIntent, SetupRead, SetupReply } from './dishSetupGateway';
import { dishSetupCatalogue } from './dishSetupCatalogue';
import { emptyPreferences, type SetupDraft, type SetupRoom } from './dishSetup';
import type { RoomSnapshot, UserPreferences } from '../../../data/api/contracts';
import { isCanonicalRoomSnapshot } from '../../../data/api/responseGuards';

type WriteProgress = {
  signature: string;
  userId: string;
  kind: 'settings' | 'preferences';
  roomId: string;
  createdRoom?: SetupRoom;
  createAck: boolean;
  settingsAck: boolean;
  preferencesAck: boolean;
  consentAck: boolean;
  settingsAttempt: number;
  preferenceAttempt: number;
  consentAttempt: number;
  pendingSettings?: { requestId: string; expectedVersion: number; payload: { dishCount: number; mealSlot: string; desiredAt: string | null } };
  pendingPreference?: { requestId: string; expectedVersion: number; payload: Record<string, unknown> };
  pendingConsent?: { requestId: string; consent: boolean };
};

function roomFromSnapshot(snapshot: RoomSnapshot): SetupRoom {
  return { id: snapshot.roomId, code: snapshot.code, version: snapshot.version, state: snapshot.state === 'LOBBY' ? 'LOBBY' : 'CLOSED' };
}

function canonicalOwnPreferences(value: unknown, consent: boolean): UserPreferences {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    cuisineIds: Array.isArray(raw.cuisineIds) ? raw.cuisineIds.filter((id): id is string => typeof id === 'string') : [],
    categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds.filter((id): id is string => typeof id === 'string') : [],
    ...(typeof raw.temperature === 'string' ? { temperature: raw.temperature as UserPreferences['temperature'] } : {}),
    ...(raw.flavor && typeof raw.flavor === 'object' ? { flavor: raw.flavor as UserPreferences['flavor'] } : {}),
    historyConsent: consent,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function childRequestId(root: string, suffix: string): string {
  const tail = `_${suffix}`;
  return `${root.slice(0, 128 - tail.length)}${tail}`;
}

function mapWriteError(code: string): 'REJECTED' | 'UNKNOWN' | 'STALE' | 'CLOSED' {
  if (code === 'VERSION_CONFLICT') return 'STALE';
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') return 'UNKNOWN';
  if (code === 'ROOM_EXPIRED' || code === 'ROOM_TERMINAL' || code === 'INVALID_ROOM_STATE') return 'CLOSED';
  // Surface the server's reason in the Metro log so a generic "Chưa lưu được" can be diagnosed.
  if (__DEV__) console.warn(`[dish-setup] write rejected: ${code}`);
  return 'REJECTED';
}

function mapDraftBudget(budget: SetupDraft['budget']): { maximum: number; currency: 'VND'; unit: 'person' } | null {
  if (!budget) return null;
  if (budget === 'under50') return { maximum: 50000, currency: 'VND', unit: 'person' };
  if (budget === '50to100') return { maximum: 100000, currency: 'VND', unit: 'person' };
  if (budget === '100to200') return { maximum: 200000, currency: 'VND', unit: 'person' };
  return null;
}

function mapCanonicalBudgetToDraft(budget: unknown): SetupDraft['budget'] {
  if (!budget || typeof budget !== 'object') return null;
  const b = budget as { maximum?: number; currency?: string; unit?: string };
  if (typeof b.maximum !== 'number') return null;
  if (b.currency && b.currency !== 'VND') return null;
  if (b.unit && b.unit !== 'person') return null;
  if (b.maximum <= 50000) return 'under50';
  if (b.maximum <= 100000) return '50to100';
  if (b.maximum <= 200000) return '100to200';
  return null;
}

function toWirePreferences(raw: unknown, fallbackAvoidRecent = false): Record<string, unknown> {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    cuisineIds: Array.isArray(value.cuisineIds) ? value.cuisineIds : [],
    categoryIds: Array.isArray(value.categoryIds) ? value.categoryIds : [],
    temperature: typeof value.temperature === 'string' ? value.temperature : null,
    flavor: value.flavor && typeof value.flavor === 'object' ? value.flavor : null,
    budget: value.budget && typeof value.budget === 'object' ? value.budget : null,
    avoidRecent: typeof value.avoidRecent === 'boolean' ? value.avoidRecent : fallbackAvoidRecent,
  };
}

function applyPreferenceChanges(
  current: Record<string, unknown>,
  desired: UserPreferences,
  fields: readonly ('cuisineIds' | 'categoryIds' | 'temperature' | 'flavor')[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...toWirePreferences(current, true) };
  for (const field of fields) {
    if (field === 'cuisineIds') merged.cuisineIds = [...desired.cuisineIds];
    else if (field === 'categoryIds') merged.categoryIds = [...desired.categoryIds];
    else if (field === 'temperature') merged.temperature = desired.temperature ?? null;
    else merged.flavor = desired.flavor ?? null;
  }
  return merged;
}

function acceptedAck(value: unknown): value is { accepted: true; version?: number } {
  return !!value && typeof value === 'object' && (value as { accepted?: unknown }).accepted === true;
}

function snapshotSettingsMatch(snapshot: RoomSnapshot, desired: { dishCount: number; mealSlot: string; desiredAt: string | null }): boolean {
  return snapshot.state === 'LOBBY' && snapshot.settings?.dishCount === desired.dishCount
    && snapshot.settings.mealSlot === desired.mealSlot && (snapshot.settings.desiredAt ?? null) === desired.desiredAt;
}

function snapshotPreferencesMatch(snapshot: RoomSnapshot, desired: Record<string, unknown>, fields: readonly string[]): boolean {
  const actual = toWirePreferences(snapshot.ownPreferences, true);
  return fields.every(field => sameJson(actual[field], desired[field]));
}

export function createLiveDishSetupGateway(
  repository: RoomRepository,
  initialRoomId?: string
): DishSetupGateway {
  let currentRoomId = initialRoomId;
  let cachedRoom: SetupRoom | undefined;
  const pendingWrites = new Map<string, WriteProgress>();

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

      const consentRes = await repository.getHistoryConsent();
      if (!consentRes.ok) throw new Error(`Failed to read account history consent: ${consentRes.error.messageKey}`);
      const historyConsent = consentRes.data;
      let accountDefaults = emptyPreferences(historyConsent.personal);
      try {
        const defsRes = await repository.getDefaultPreferences?.();
        if (defsRes?.ok && defsRes.data?.preferences) {
          accountDefaults = { ...defsRes.data.preferences, historyConsent: historyConsent.personal };
        }
      } catch {
        // Fallback to emptyPreferences
      }

      if (currentRoomId) {
        const snapRes = await repository.getRoomSnapshot(currentRoomId);
        if (!snapRes.ok) {
          throw new Error(`Failed to read room snapshot: ${snapRes.error.message || snapRes.error.messageKey}`);
        }
        const snap = snapRes.data;
        const isHost = currentUser?.id ? snap.hostUserId === currentUser.id : true;
        const isClosed = snap.state !== 'LOBBY';
        cachedRoom = roomFromSnapshot(snap);
        const snapSettings = snap.settings;
        const ownPref = snap.ownPreferences;
        const settings: SetupDraft = {
          mealSlot: snapSettings?.mealSlot ?? 'lunch',
          dishCount: snapSettings?.dishCount ?? snap.pool?.length ?? 15,
          timeMode: snapSettings?.desiredAt ? 'scheduled' : 'now',
          desiredAt: snapSettings?.desiredAt ?? null,
          budget: mapCanonicalBudgetToDraft((ownPref as unknown as Record<string, unknown> | undefined)?.budget),
          avoidRecent: typeof (ownPref as unknown as Record<string, unknown> | undefined)?.avoidRecent === 'boolean'
            ? Boolean((ownPref as unknown as Record<string, unknown>).avoidRecent) : true,
          inviteeIds: [],
        };
        return {
          catalogue: dishSetupCatalogue,
          friends,
          connected: isConnected,
          canEditSettings: isHost,
          accountDefaults,
          ownRoomPreferences: canonicalOwnPreferences(ownPref, historyConsent.personal),
          historyConsent,
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
        historyConsent,
        room: cachedRoom,
        hasRecentHistory: false,
      };
    },

    write: async (intent: SetupIntent): Promise<SetupReply> => {
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

        const code = res.ok ? 'MALFORMED_RESPONSE' : res.error.messageKey;
        if (code === 'VERSION_CONFLICT') {
          return { ok: false, code: 'STALE' };
        }
        if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
          return { ok: false, code: 'UNKNOWN' };
        }
        return { ok: false, code: 'REJECTED' };
      }

      const userId = repository.getCurrentUser()?.id;
      if (!userId || !intent.requestId) return { ok: false, code: 'REJECTED' };
      const signature = JSON.stringify(intent);
      let progress = pendingWrites.get(intent.requestId);
      if (progress && (progress.signature !== signature || progress.userId !== userId || progress.kind !== intent.kind)) {
        return { ok: false, code: 'REJECTED' };
      }
      if (!progress) {
        progress = {
          signature,
          userId,
          kind: intent.kind,
          roomId: intent.kind === 'settings' ? intent.room?.id ?? '' : intent.room.id,
          createAck: false,
          settingsAck: false,
          preferencesAck: false,
          consentAck: false,
          settingsAttempt: 0,
          preferenceAttempt: 0,
          consentAttempt: 0,
        };
        pendingWrites.set(intent.requestId, progress);
      }

      const sameIdentity = () => repository.getCurrentUser()?.id === userId;
      const identityChanged = (): SetupReply => {
        pendingWrites.delete(intent.requestId);
        return { ok: false, code: 'REJECTED' };
      };
      const readSnapshot = async (): Promise<{ snapshot: RoomSnapshot } | { error: string }> => {
        if (!sameIdentity()) return { error: 'IDENTITY_CHANGED' };
        const result = await repository.getRoomSnapshot(progress!.roomId);
        if (!sameIdentity()) return { error: 'IDENTITY_CHANGED' };
        if (!result.ok) return { error: result.error.messageKey };
        if (!isCanonicalRoomSnapshot(result.data)) return { error: 'MALFORMED_RESPONSE' };
        return { snapshot: result.data };
      };
      const partial = (
        room: SetupRoom | undefined,
        completed: 'settings' | 'preferences' = 'settings',
        pendingStep: 'readback' | 'preferences' | 'consent' = 'readback',
      ): SetupReply => room ? { ok: false, code: 'PARTIAL', room, completed, pendingStep } : { ok: false, code: 'UNKNOWN' };

      if (!sameIdentity()) return identityChanged();

      if (intent.kind === 'settings') {
        const desiredSettings = {
          dishCount: intent.draft.dishCount,
          mealSlot: intent.draft.mealSlot,
          desiredAt: intent.draft.timeMode === 'scheduled' ? intent.draft.desiredAt || null : null,
        };
        const budget = mapDraftBudget(intent.draft.budget);
        const createPreferences = {
          cuisineIds: [], categoryIds: [], temperature: null, flavor: null,
          budget, avoidRecent: intent.draft.avoidRecent,
        };

        if (!intent.room && !progress.createAck) {
          const currentUser = repository.getCurrentUser();
          const create = await repository.dispatchDishSession<{ roomId: string; code: string; version: number; expiresAt: string }>(
            'create',
            { requestId: intent.requestId, displayName: (currentUser?.displayName || 'Host').trim(), settings: desiredSettings, preferences: createPreferences },
          );
          if (!sameIdentity()) return identityChanged();
          if (!create.ok) {
            const code = create.error.messageKey;
            if (code === 'INSUFFICIENT_DISHES') {
              const details = create.error.details as { available?: number; requested?: number } | undefined;
              pendingWrites.delete(intent.requestId);
              return { ok: false, code: 'SHORTAGE', available: details?.available ?? 0, requested: details?.requested ?? intent.draft.dishCount };
            }
            const mapped = mapWriteError(code);
            if (mapped === 'UNKNOWN') return { ok: false, code: 'UNKNOWN' };
            pendingWrites.delete(intent.requestId);
            return { ok: false, code: mapped };
          }
          const created = create.data;
          if (!created || typeof created.roomId !== 'string' || typeof created.code !== 'string' || !Number.isSafeInteger(created.version)) {
            return { ok: false, code: 'UNKNOWN' };
          }
          progress.roomId = created.roomId;
          progress.createdRoom = { id: created.roomId, code: created.code, version: created.version, state: 'LOBBY' };
          progress.createAck = true;
          progress.settingsAck = true;
          progress.preferencesAck = true;
          currentRoomId = created.roomId;
        }

        let snapshotRead: { snapshot: RoomSnapshot } | { error: string };
        if (intent.room && !progress.settingsAck) {
          if (!progress.pendingSettings) {
            progress.pendingSettings = {
              requestId: intent.requestId,
              expectedVersion: intent.room.version,
              payload: desiredSettings,
            };
          }
          for (let retries = 0; retries < 3 && !progress.settingsAck; retries += 1) {
            const pending = progress.pendingSettings;
            const update = await repository.dispatchDishSession<{ accepted: boolean; version?: number }>(
              'updateSettings',
              { requestId: pending.requestId, roomId: intent.room.id, expectedVersion: pending.expectedVersion, settings: pending.payload },
            );
            if (!sameIdentity()) return identityChanged();
            if (update.ok && acceptedAck(update.data)) {
              progress.settingsAck = true;
              progress.pendingSettings = undefined;
              break;
            }
            if (!update.ok && update.error.messageKey === 'VERSION_CONFLICT') {
              snapshotRead = await readSnapshot();
              if ('error' in snapshotRead) {
                if (snapshotRead.error === 'IDENTITY_CHANGED') return identityChanged();
                return { ok: false, code: 'UNKNOWN' };
              }
              const latest = snapshotRead.snapshot;
              if (latest.state !== 'LOBBY') {
                pendingWrites.delete(intent.requestId);
                return { ok: false, code: 'CLOSED' };
              }
              if (snapshotSettingsMatch(latest, desiredSettings)) {
                progress.settingsAck = true;
                progress.pendingSettings = undefined;
                break;
              }
              progress.settingsAttempt += 1;
              progress.pendingSettings = {
                requestId: childRequestId(intent.requestId, `settings${progress.settingsAttempt}`),
                expectedVersion: latest.version,
                payload: desiredSettings,
              };
              continue;
            }
            if (update.ok) return { ok: false, code: 'UNKNOWN' };
            if (update.error.messageKey === 'INSUFFICIENT_DISHES') {
              const details = update.error.details as { available?: number; requested?: number } | undefined;
              pendingWrites.delete(intent.requestId);
              return { ok: false, code: 'SHORTAGE', available: details?.available ?? 0, requested: details?.requested ?? intent.draft.dishCount };
            }
            const mapped = mapWriteError(update.error.messageKey);
            if (mapped === 'UNKNOWN') return { ok: false, code: 'UNKNOWN' };
            pendingWrites.delete(intent.requestId);
            return { ok: false, code: mapped };
          }
          if (!progress.settingsAck) return { ok: false, code: 'UNKNOWN' };
        }

        snapshotRead = await readSnapshot();
        if ('error' in snapshotRead) {
          if (snapshotRead.error === 'IDENTITY_CHANGED') return identityChanged();
          return partial(progress.createdRoom ?? intent.room, 'settings', 'readback');
        }
        let snapshot = snapshotRead.snapshot;
        if (snapshot.state !== 'LOBBY') {
          pendingWrites.delete(intent.requestId);
          return { ok: false, code: 'CLOSED' };
        }
        if (!snapshotSettingsMatch(snapshot, desiredSettings)) {
          pendingWrites.delete(intent.requestId);
          return { ok: false, code: 'STALE' };
        }

        if (intent.room && !progress.preferencesAck) {
          const current = toWirePreferences(snapshot.ownPreferences, true);
          const target = { ...current, budget, avoidRecent: intent.draft.avoidRecent };
          const targetFields = ['budget', 'avoidRecent'] as const;
          if (!progress.pendingPreference && targetFields.every(field => sameJson(current[field], target[field]))) {
            progress.preferencesAck = true;
          } else {
            for (let retries = 0; retries < 3 && !progress.preferencesAck; retries += 1) {
              if (!progress.pendingPreference) {
                progress.pendingPreference = {
                  requestId: childRequestId(intent.requestId, `pref${progress.preferenceAttempt}`),
                  expectedVersion: snapshot.version,
                  payload: target,
                };
              }
              const pending = progress.pendingPreference;
              const result = await repository.dispatchDishSession<{ accepted: boolean; version?: number }>(
                'updatePreferences',
                { requestId: pending.requestId, roomId: intent.room.id, expectedVersion: pending.expectedVersion, preferences: pending.payload },
              );
              if (!sameIdentity()) return identityChanged();
              if (result.ok && acceptedAck(result.data)) {
                progress.preferencesAck = true;
                progress.pendingPreference = undefined;
              } else if (!result.ok && result.error.messageKey === 'VERSION_CONFLICT') {
                progress.pendingPreference = undefined;
                progress.preferenceAttempt += 1;
                snapshotRead = await readSnapshot();
                if ('error' in snapshotRead) return partial(roomFromSnapshot(snapshot), 'settings', 'readback');
                snapshot = snapshotRead.snapshot;
                if (snapshot.state !== 'LOBBY' || !snapshotSettingsMatch(snapshot, desiredSettings)) {
                  pendingWrites.delete(intent.requestId);
                  return { ok: false, code: snapshot.state === 'LOBBY' ? 'STALE' : 'CLOSED' };
                }
                const latest = toWirePreferences(snapshot.ownPreferences, true);
                if (targetFields.every(field => sameJson(latest[field], target[field]))) progress.preferencesAck = true;
                else progress.pendingPreference = {
                  requestId: childRequestId(intent.requestId, `pref${progress.preferenceAttempt}`),
                  expectedVersion: snapshot.version,
                  payload: { ...latest, budget, avoidRecent: intent.draft.avoidRecent },
                };
              } else {
                // Keep the exact request id and body only when the outcome may be unknown.
                if (result.ok) progress.pendingPreference = { ...pending };
                else if (mapWriteError(result.error.messageKey) !== 'UNKNOWN') {
                  progress.pendingPreference = undefined;
                  progress.preferenceAttempt += 1;
                }
                return partial(roomFromSnapshot(snapshot), 'settings', 'preferences');
              }
            }
            if (!progress.preferencesAck) return partial(roomFromSnapshot(snapshot), 'settings', 'preferences');
          }
        } else {
          progress.preferencesAck = true;
        }

        if (intent.room && progress.preferencesAck) {
          snapshotRead = await readSnapshot();
          if ('error' in snapshotRead) return partial(roomFromSnapshot(snapshot), 'settings', 'readback');
          snapshot = snapshotRead.snapshot;
          const actual = toWirePreferences(snapshot.ownPreferences, true);
          if (snapshot.state !== 'LOBBY' || !snapshotSettingsMatch(snapshot, desiredSettings)
            || !sameJson(actual.budget, budget) || actual.avoidRecent !== intent.draft.avoidRecent) {
            return partial(roomFromSnapshot(snapshot), 'settings', 'readback');
          }
        } else if (progress.createAck) {
          const expectedPreferences = createPreferences;
          if (snapshot.state !== 'LOBBY' || !snapshotSettingsMatch(snapshot, desiredSettings)
            || !snapshotPreferencesMatch(snapshot, expectedPreferences, ['cuisineIds', 'categoryIds', 'temperature', 'flavor', 'budget', 'avoidRecent'])) {
            return partial(roomFromSnapshot(snapshot));
          }
        }

        cachedRoom = roomFromSnapshot(snapshot);
        pendingWrites.delete(intent.requestId);
        return { ok: true, room: cachedRoom };
      }

      if (intent.kind === 'preferences') {
        const changedFields = [...new Set(intent.changedFields)];
        const desiredConsent = intent.preferences.historyConsent;
        for (let attempt = 0; attempt < 3 && !progress.preferencesAck; attempt += 1) {
          const snapshotRead = await readSnapshot();
          if ('error' in snapshotRead) {
            if (snapshotRead.error === 'IDENTITY_CHANGED') return identityChanged();
            const mapped = mapWriteError(snapshotRead.error);
            if (mapped !== 'UNKNOWN') pendingWrites.delete(intent.requestId);
            return { ok: false, code: mapped };
          }
          let snapshot = snapshotRead.snapshot;
          if (snapshot.state !== 'LOBBY') {
            pendingWrites.delete(intent.requestId);
            return { ok: false, code: 'CLOSED' };
          }
          const current = toWirePreferences(snapshot.ownPreferences, true);
          const target = applyPreferenceChanges(current, intent.preferences, changedFields);
          const fieldsChanged = changedFields.some(field => !sameJson(current[field], target[field]));
          if (!progress.pendingPreference && !fieldsChanged) {
            progress.preferencesAck = true;
            break;
          }
          if (!progress.pendingPreference) {
            progress.pendingPreference = {
              requestId: childRequestId(intent.requestId, `pref${progress.preferenceAttempt}`),
              expectedVersion: snapshot.version,
              payload: target,
            };
          }
          const pending = progress.pendingPreference;
          const result = await repository.dispatchDishSession<{ accepted: boolean; version?: number }>(
            'updatePreferences',
            { requestId: pending.requestId, roomId: intent.room.id, expectedVersion: pending.expectedVersion, preferences: pending.payload },
          );
          if (!sameIdentity()) return identityChanged();
          if (result.ok && acceptedAck(result.data)) {
            progress.preferencesAck = true;
            progress.pendingPreference = undefined;
          } else if (!result.ok && result.error.messageKey === 'VERSION_CONFLICT') {
            progress.pendingPreference = undefined;
            progress.preferenceAttempt += 1;
            continue;
          } else {
            if (result.ok) progress.pendingPreference = { ...pending };
            else if (mapWriteError(result.error.messageKey) !== 'UNKNOWN') {
              progress.pendingPreference = undefined;
              progress.preferenceAttempt += 1;
            }
            return progress.preferencesAck ? partial(roomFromSnapshot(snapshot), 'preferences', 'consent')
              : { ok: false, code: result.ok ? 'UNKNOWN' : mapWriteError(result.error.messageKey) };
          }
        }
        if (!progress.preferencesAck) {
          pendingWrites.delete(intent.requestId);
          return { ok: false, code: 'STALE' };
        }

        let consentRead = await repository.getHistoryConsent();
        if (!sameIdentity()) return identityChanged();
        if (!consentRead.ok) return partial(intent.room, 'preferences', 'consent');
        if (!progress.pendingConsent && consentRead.data.personal === desiredConsent) {
          progress.consentAck = true;
        } else {
          if (!progress.pendingConsent) progress.pendingConsent = {
            requestId: childRequestId(intent.requestId, `consent${progress.consentAttempt}`), consent: desiredConsent,
          };
          const pending = progress.pendingConsent;
          const consentWrite = await repository.updateHistoryConsent('personal', pending.consent, pending.requestId);
          if (!sameIdentity()) return identityChanged();
          if (!consentWrite.ok) {
            if (mapWriteError(consentWrite.error.messageKey) !== 'UNKNOWN') {
              progress.pendingConsent = undefined;
              progress.consentAttempt += 1;
            }
            return partial(intent.room, 'preferences', 'consent');
          }
          consentRead = await repository.getHistoryConsent();
          if (!sameIdentity()) return identityChanged();
          if (!consentRead.ok || consentRead.data.personal !== desiredConsent) return partial(intent.room, 'preferences', 'consent');
          progress.consentAck = true;
          progress.pendingConsent = undefined;
        }

        const snapshotRead = await readSnapshot();
        if ('error' in snapshotRead) {
          if (snapshotRead.error === 'IDENTITY_CHANGED') return identityChanged();
          return partial(intent.room, 'preferences', 'readback');
        }
        const snapshot = snapshotRead.snapshot;
        if (snapshot.state !== 'LOBBY' || !snapshotPreferencesMatch(snapshot, intent.preferences as unknown as Record<string, unknown>, changedFields)) {
          return partial(roomFromSnapshot(snapshot), 'preferences', 'readback');
        }
        cachedRoom = roomFromSnapshot(snapshot);
        pendingWrites.delete(intent.requestId);
        return { ok: true, room: cachedRoom };
      }

      return { ok: false, code: 'REJECTED' };
    },
  };
}
