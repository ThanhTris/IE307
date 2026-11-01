import { createApiClient, MOCK_DEFAULT_ROOM_CODE } from '../../../data/api';
import type { SessionUser } from '../../../data/api/contracts';
import type { RoomEntryReceipt, RoomEntryRepository } from '../../rooms/services/roomEntry';
import type { HomeLiveSession } from '../screens/HomeScreen';

export const homePreviewScenarios = [
  ['existing', 'Dữ liệu phòng mẫu hiện có'], ['no-room', 'Chưa có phòng'],
  ['active-room', 'Có phòng để tiếp tục'], ['room-loading', 'Đang kiểm tra phòng'],
  ['room-expired', 'Phòng hết hạn'], ['room-error', 'Lỗi kiểm tra phòng'],
  ['friends-loading', 'Bạn bè đang tải'], ['friends-empty', 'Bạn bè trống'], ['friends-error', 'Lỗi bạn bè'],
  ['session-loading', 'Đang khôi phục phiên'], ['session-expired', 'Phiên khách hết hạn'], ['session-error', 'Lỗi khôi phục phiên'],
] as const;
export type HomePreviewScenario = typeof homePreviewScenarios[number][0];

/** Synthetic, read-only scenarios for /dev/home. Never used as a real-mode fallback. */
export function createHomePreview(scenario: HomePreviewScenario, onReset: () => void) {
  const user: SessionUser = { id: 'gm09-home-fixture-user', displayName: 'Minh', isGuest: true, createdAt: '2026-11-01T00:00:00Z' };
  const client = createApiClient('mock', { delayMs: 0, currentUser: user });
  const repository: RoomEntryRepository = client;
  let activeRoom: RoomEntryReceipt | undefined;
  if (scenario.startsWith('room-') || scenario === 'active-room') activeRoom = { roomId: 'room_mock_001', code: MOCK_DEFAULT_ROOM_CODE, version: 1, role: 'host' };
  if (scenario === 'room-loading') repository.getRoomSnapshot = () => new Promise(() => {});
  if (scenario === 'room-error') repository.getRoomSnapshot = async () => ({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  if (scenario === 'room-expired') {
    const read = repository.getRoomSnapshot.bind(repository);
    repository.getRoomSnapshot = async id => {
      const result = await read(id);
      return result.ok ? { ok: true, data: { ...result.data, state: 'EXPIRED' } } : result;
    };
  }
  if (scenario === 'friends-loading') repository.listFriends = () => new Promise(() => {});
  if (scenario === 'friends-empty') repository.listFriends = async () => ({ ok: true, data: [] });
  if (scenario === 'friends-error') repository.listFriends = async () => ({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  let liveSession: HomeLiveSession | undefined;
  if (scenario.startsWith('session-')) liveSession = {
    status: scenario === 'session-expired' ? 'lost' : 'empty',
    issue: scenario === 'session-expired' ? 'session-revoked' : 'restore-unavailable',
    user: null, isInitializing: scenario === 'session-loading',
    ensureSession: async () => false,
    restoreSession: async () => { onReset(); return true; },
    logout: async () => { onReset(); return true; },
  };
  return { repository, activeRoom, liveSession, user };
}
