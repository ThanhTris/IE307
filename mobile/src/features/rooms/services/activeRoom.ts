import type { ReadResult } from '../../../data/api/contracts';
import { mapErrorHelper } from '../../../data/api/client/helpers';
import { CANONICAL_CONTRACT_VERSION } from './roomRepository';

const states = ['LOBBY', 'ROUND_1', 'WAITING_1', 'ROUND_2', 'WAITING_2'] as const;

export type ActiveRoom = {
  roomId: string;
  code: string;
  state: typeof states[number];
  version: number;
};

export interface ActiveRoomReader {
  getActiveRoom(): Promise<ReadResult<ActiveRoom | null>>;
}

function isActiveRoom(value: unknown): value is ActiveRoom {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const room = value as Record<string, unknown>;
  return Object.keys(room).length === 4
    && typeof room.roomId === 'string'
    && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(room.roomId)
    && typeof room.code === 'string'
    && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(room.code)
    && states.some(state => state === room.state)
    && typeof room.version === 'number' && Number.isSafeInteger(room.version) && room.version >= 1;
}

function activeRoomError(raw: unknown): ReadResult<never> {
  const error = mapErrorHelper(raw);
  // Older routers reject the unknown command for this fixed, valid payload.
  if (error.messageKey === 'INVALID_INPUT' || error.messageKey === 'ROOM_NOT_FOUND') {
    return { ok: false, error: { messageKey: 'CONTRACT_MISMATCH' } };
  }
  return { ok: false, error };
}

export function createActiveRoomReader(callRpc: (name: string, params: Record<string, unknown>) => Promise<unknown>): ActiveRoomReader {
  return {
    async getActiveRoom() {
      try {
        const raw = await callRpc('dish_session', {
          command: 'activeRoom',
          payload: { contractVersion: CANONICAL_CONTRACT_VERSION },
        });
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const envelope = raw as Record<string, unknown>;
          if (envelope.ok === false) return activeRoomError(envelope);
          if (envelope.ok === true && (envelope.data === null || isActiveRoom(envelope.data))) {
            return { ok: true, data: envelope.data };
          }
        }
        return { ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } };
      } catch (error) {
        return activeRoomError(error);
      }
    },
  };
}
