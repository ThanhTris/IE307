import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { AppButton, ContextSummary, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { typography } from '../../../shared/theme/tokens';
import { EntryError, entryStyles, RoomEntryFrame, type PreviewControlsProps } from '../components/RoomEntryFrame';
import { useRead } from '../hooks/useRoomEntry';
import { localTimeInput, mealLabels, type RoomEntryReceipt, type RoomEntryRepository } from '../services/roomEntry';

export type RoomEntryReceiptScreenProps = PreviewControlsProps & {
  repository: RoomEntryRepository; receipt: RoomEntryReceipt; onBack: () => void;
  onPreferences?: (receipt: RoomEntryReceipt) => void; onLobby?: (receipt: RoomEntryReceipt) => void;
};
export function RoomEntryReceiptScreen({ repository, receipt, onBack, onPreferences, onLobby, previewControls }: RoomEntryReceiptScreenProps) {
  const { colors } = useShellTheme();
  const [step, setStep] = useState<string>();
  const load = useCallback(() => repository.getRoomSnapshot(receipt.roomId), [repository, receipt.roomId]);
  const room = useRead(load);
  return <RoomEntryFrame title={receipt.role === 'host' ? 'Đã tạo phòng mẫu' : 'Đã vào phòng mẫu'} onBack={onBack} previewControls={previewControls}>
    <StatusNotice title="Đã nhận yêu cầu mô phỏng" message="Phòng mẫu đã được ghi nhận. Bạn chưa thể mời nhóm, sẵn sàng hoặc bắt đầu bình chọn thật." tone="success" colors={colors} />
    <Text selectable accessibilityLabel={`Mã phòng ${receipt.code}`} style={[typography.roomCode, { color: colors.primary }]}>{receipt.code}</Text>
    <Text style={[entryStyles.caption, { color: colors.muted }]}>Mã phòng từ phản hồi tạo/vào phòng mẫu</Text>
    {room.loading ? <StatusNotice title="Đang tải bối cảnh mẫu…" colors={colors} /> : null}
    {room.error ? <EntryError code={room.error} onRetry={room.retry} /> : null}
    {room.data ? <ContextSummary anchorName={room.data.context.anchorName ?? 'Điểm công cộng đã chọn'} mealLabel={mealLabels[room.data.context.mealSlot]} desiredAtLabel={`${localTimeInput(room.data.context.desiredAt)} (UTC+7) · mẫu`} radiusLabel={`${room.data.context.radiusM / 1000} km`} colors={colors} /> : null}
    <AppButton label="Chọn khẩu vị →" disabled={!room.data} onPress={() => onPreferences ? onPreferences(receipt) : setStep('Chọn khẩu vị')} colors={colors} />
    <AppButton label="Xem bước phòng chờ" variant="secondary" disabled={!room.data} onPress={() => onLobby ? onLobby(receipt) : setStep('Phòng chờ')} colors={colors} />
    <SheetDialog visible={!!step} title={step ?? 'Bước tiếp theo'} onClose={() => setStep(undefined)} colors={colors}>
      <Text style={[entryStyles.body, { color: colors.text }]}>Bước này chưa có trong bản mô phỏng hiện tại. Phòng mẫu của bạn vẫn được giữ khi quay lại trang chủ.</Text>
    </SheetDialog>
  </RoomEntryFrame>;
}
