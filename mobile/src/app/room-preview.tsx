import { useRouter } from 'expo-router';
import { RoomEntryReceiptScreen } from '../features/rooms/screens/RoomEntryReceiptScreen';
import { RoomEntryFrame } from '../features/rooms/components/RoomEntryFrame';
import { StatusNotice } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { PreviewControls, useRoomPreview } from '../bootstrap/roomPreview';

export default function RoomPreviewRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  const { colors } = useShellTheme();
  const onBack = () => router.replace('/');
  if (!preview.active) return <RoomEntryFrame title="Chưa có phòng mẫu" onBack={onBack} previewControls={busy => <PreviewControls disabled={busy} />}>
    <StatusNotice title="Phiên mẫu chỉ lưu trong bộ nhớ" message="Hãy tạo hoặc vào phòng từ Home. Đổi fixture hay khởi động lại sẽ xóa xác nhận mẫu." colors={colors} />
  </RoomEntryFrame>;
  return <RoomEntryReceiptScreen key={preview.revision} repository={preview.client} receipt={preview.active} onBack={onBack} previewControls={busy => <PreviewControls disabled={busy} />} />;
}
