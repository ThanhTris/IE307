import { useLocalSearchParams, useRouter } from 'expo-router';
import { RoomEntryReceiptScreen } from '../features/rooms/screens/RoomEntryReceiptScreen';
import { RoomEntryFrame } from '../features/rooms/components/RoomEntryFrame';
import { StatusNotice } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { PreviewControls, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import type { RoomEntryReceipt } from '../features/rooms/services/roomEntry';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';

export default function RoomPreviewRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string; code?: string; role?: 'host' | 'member'; version?: string }>();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';
  const { colors } = useShellTheme();
  const onBack = () => router.replace('/');

  const activeReceipt: RoomEntryReceipt | null = (params.roomId && params.code)
    ? { roomId: params.roomId, code: params.code, role: params.role ?? 'host', version: Number(params.version) || 1 }
    : preview.active;

  const repository = isReal ? live.repository : preview.client;

  if (!activeReceipt) {
    if (isReal) {
      return <RequireActiveSession onHome={onBack}>
        <RoomEntryFrame title="Chưa có phòng" onBack={onBack}>
          <StatusNotice title="Chưa có phòng đang mở" message="Hãy tạo hoặc vào phòng từ màn hình chính." colors={colors} />
        </RoomEntryFrame>
      </RequireActiveSession>;
    }
    return (
      <RoomEntryFrame title="Chưa có phòng mẫu" onBack={onBack} previewControls={busy => <PreviewControls disabled={busy} />}>
        <StatusNotice title="Phiên mẫu chỉ lưu trong bộ nhớ" message="Hãy tạo hoặc vào phòng từ Home. Đổi fixture hay khởi động lại sẽ xóa xác nhận mẫu." colors={colors} />
      </RoomEntryFrame>
    );
  }

  const receiptScreen = (
    <RoomEntryReceiptScreen
      key={isReal ? `live-${activeReceipt.roomId}-${live.user?.id ?? 'unknown'}` : preview.revision}
      repository={repository}
      receipt={activeReceipt}
      onBack={onBack}
      onPreferences={r => router.push({ pathname: '/gm10/preferences', params: { roomId: r.roomId } })}
      onLobby={r => router.push({ pathname: '/gm11/lobby', params: { roomId: r.roomId } })}
      previewControls={isReal ? undefined : (busy => <PreviewControls disabled={busy} />)}
    />
  );
  return isReal ? <RequireActiveSession onHome={onBack}>{receiptScreen}</RequireActiveSession> : receiptScreen;
}
