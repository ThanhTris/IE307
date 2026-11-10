import { useLocalSearchParams, useRouter } from 'expo-router';
import { RoomEnteredScreen } from '../../features/rooms/screens/RoomEnteredScreen';
import { RoomEntryFrame } from '../../features/rooms/components/RoomEntryFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function RoomEnteredRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string; code?: string; role?: 'host' | 'member'; version?: string }>();
  const live = useRoomRepository();
  const { colors } = useShellTheme();
  const onBack = () => router.replace('/');
  const receipt = params.roomId && params.code
    ? { roomId: params.roomId, code: params.code, role: params.role ?? 'host', version: Number(params.version) || 1 }
    : null;
  return <RequireActiveSession onHome={onBack}>
    {receipt ? (
      <RoomEnteredScreen
        key={`${receipt.roomId}-${live.user?.id ?? 'unknown'}`}
        repository={live.repository}
        receipt={receipt}
        onBack={onBack}
        onPreferences={r => router.push({ pathname: '/room/preferences', params: { roomId: r.roomId } })}
        onLobby={r => router.push({ pathname: '/room/lobby', params: { roomId: r.roomId } })}
      />
    ) : (
      <RoomEntryFrame title="Chưa có phòng" onBack={onBack}>
        <StatusNotice title="Chưa có phòng đang mở" message="Hãy tạo hoặc vào phòng từ màn hình chính." colors={colors} />
      </RoomEntryFrame>
    )}
  </RequireActiveSession>;
}
