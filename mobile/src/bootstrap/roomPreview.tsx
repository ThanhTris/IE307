import { useSyncExternalStore } from 'react';
import { createApiClient, MOCK_DEFAULT_ROOM_CODE, type ErrorCode } from '../data/api';
import { Chip } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { Text, View } from 'react-native';
import { entryStyles } from '../features/rooms/components/RoomEntryFrame';
import type { RoomEntryReceipt } from '../features/rooms/services/roomEntry';

export const previewScenarios = [
  ['default', 'Bình thường'], ['loading', 'Tải chậm'], ['empty', 'Trống'],
  ['network', 'Mất mạng'], ['full', 'Đầy phòng'], ['locked', 'Đã khóa'],
  ['expired', 'Hết hạn'], ['lost-session', 'Mất phiên'], ['outside', 'Ngoài vùng'],
  ['quota', 'Giới hạn'], ['stale', 'Dữ liệu cũ'],
] as const;
export type PreviewScenario = typeof previewScenarios[number][0];
const errors: Partial<Record<PreviewScenario, ErrorCode>> = {
  network: 'NETWORK_ERROR', full: 'ROOM_FULL', locked: 'ROOM_LOCKED',
  'lost-session': 'AUTH_REQUIRED', outside: 'OUT_OF_COVERAGE', quota: 'RATE_LIMITED',
};
function clientFor(scenario: PreviewScenario) {
  // No environment-dependent default or real -> mock fallback.
  const client = createApiClient('mock', { mode: scenario === 'loading' ? 'loading' : scenario === 'empty' ? 'empty' : 'default', delayMs: scenario === 'loading' ? 1200 : 100 });
  const error = errors[scenario];
  if (error) {
    // Keep discovery/session available for lifecycle errors; configure writes
    // through the existing mock factory instead of changing the GM-07 adapter.
    const failure = createApiClient('mock', { mode: 'error', simulatedErrorCode: error });
    client.createRoom = failure.createRoom.bind(failure);
    client.joinRoom = failure.joinRoom.bind(failure);
    if (scenario === 'network' || scenario === 'lost-session') {
      client.restoreSession = failure.restoreSession.bind(failure);
      client.listFriends = failure.listFriends.bind(failure);
      client.getDiscoveryContext = failure.getDiscoveryContext.bind(failure);
    }
  }
  if (scenario === 'expired' || scenario === 'stale') {
    const failure = createApiClient('mock', { mode: scenario });
    client.createRoom = failure.createRoom.bind(failure);
    client.joinRoom = failure.joinRoom.bind(failure);
    client.getRoomSnapshot = failure.getRoomSnapshot.bind(failure);
  }
  return client;
}

const listeners = new Set<() => void>();
let revision = 0;
let snapshot = { scenario: 'default' as PreviewScenario, client: clientFor('default'), active: null as RoomEntryReceipt | null, revision };
const subscribe = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
const notify = () => { for (const callback of listeners) callback(); };
export function setPreviewScenario(scenario: PreviewScenario) {
  snapshot = { scenario, client: clientFor(scenario), active: null, revision: ++revision };
  notify();
}
export function rememberPreviewRoom(active: RoomEntryReceipt) {
  snapshot = { ...snapshot, active };
  notify();
}
export function useRoomPreview() { return useSyncExternalStore(subscribe, () => snapshot, () => snapshot); }
export const previewRoomCode = MOCK_DEFAULT_ROOM_CODE;
export const previewSessionToken = 'gm09-synthetic-session'; // fixture marker, never a real credential

export function PreviewControls({ disabled = false }: { disabled?: boolean }) {
  const { colors } = useShellTheme();
  const { scenario } = useRoomPreview();
  return <View style={entryStyles.section}>
    <Text style={[entryStyles.caption, { color: colors.muted }]}>Fixture mô phỏng · đổi sẽ xóa phiên mẫu trên máy</Text>
    <View style={entryStyles.row}>{previewScenarios.map(([value, label]) => <Chip key={value} label={label} selected={scenario === value} disabled={disabled} onPress={() => setPreviewScenario(value)} colors={colors} />)}</View>
  </View>;
}
