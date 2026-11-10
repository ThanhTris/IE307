import type { ReadResult } from '../../../data/api/contracts';
const MOCK_DEFAULT_ROOM_CODE = 'GCD234';

/** UI projection port, not an extension of GM-07.1 ApiClient or a member snapshot. */
export type JoinRoomPublicPreview = { code: string; memberCount: number; capacity: number };
export type JoinRoomPreviewPort = (code: string) => Promise<ReadResult<JoinRoomPublicPreview>>;

/** Explicit mock-only read. No network, roster, preferences, pool or ballots. */
export function createJoinPreviewFixture(scenario = 'default'): JoinRoomPreviewPort {
  return async code => {
    if (scenario === 'loading') return new Promise(() => {});
    const error = scenario === 'full' ? 'ROOM_FULL' : scenario === 'locked' ? 'ROOM_LOCKED' : scenario === 'expired' ? 'ROOM_EXPIRED' : scenario === 'lost-session' ? 'AUTH_REQUIRED' : scenario === 'network' ? 'NETWORK_ERROR' : code !== MOCK_DEFAULT_ROOM_CODE ? 'ROOM_NOT_FOUND' : undefined;
    return error ? { ok: false, error: { messageKey: error } } : { ok: true, data: { code, memberCount: 2, capacity: 20 } };
  };
}

export function validPublicPreview(value: JoinRoomPublicPreview, requested: string): boolean {
  return value.code === requested && Number.isInteger(value.memberCount) && Number.isInteger(value.capacity)
    && value.memberCount >= 0 && value.capacity >= 1 && value.capacity <= 20 && value.memberCount < value.capacity;
}
