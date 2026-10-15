import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { AppButton, ContextSummary, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { typography } from '../../../shared/theme/tokens';
import { EntryError, entryStyles, RoomEntryFrame, type PreviewControlsProps } from '../components/RoomEntryFrame';
import { useRead } from '../hooks/useRoomEntry';
import { localTimeInput, mealLabels, type RoomEntryReceipt, type RoomEntryRepository } from '../services/roomEntry';

type Props = PreviewControlsProps & {
  repository: RoomEntryRepository; receipt: RoomEntryReceipt; onBack: () => void;
  onPreferences?: (receipt: RoomEntryReceipt) => void; onLobby?: (receipt: RoomEntryReceipt) => void;
};
export function RoomEntryReceiptScreen({ repository, receipt, onBack, onPreferences, onLobby, previewControls }: Props) {
  const { colors } = useShellTheme();
  const [step, setStep] = useState<string>();
  const load = useCallback(() => repository.getRoomSnapshot(receipt.roomId), [repository, receipt.roomId]);
  const room = useRead(load);
  return <RoomEntryFrame title={receipt.role === 'host' ? 'Đã tạo phòng mẫu' : 'Đã vào phòng mẫu'} onBack={onBack} previewControls={previewControls}>
    <StatusNotice title="Mock adapter đã nhận yêu cầu" message="Đây là xác nhận mô phỏng; chưa thể mời nhóm, ready hoặc bắt đầu bình chọn thật." tone="success" colors={colors} />
    <Text selectable accessibilityLabel={`Mã phòng ${receipt.code}`} style={[typography.roomCode, { color: colors.primary }]}>{receipt.code}</Text>
    <Text style={[entryStyles.caption, { color: colors.muted }]}>Mã do adapter trả về · version {receipt.version}</Text>
    {room.loading ? <StatusNotice title="Đang tải bối cảnh mẫu…" colors={colors} /> : null}
    {room.error ? <EntryError code={room.error} onRetry={room.retry} /> : null}
    {room.data ? <ContextSummary anchorName={room.data.context.anchorName ?? 'Điểm công cộng đã chọn'} mealLabel={mealLabels[room.data.context.mealSlot]} desiredAtLabel={`${localTimeInput(room.data.context.desiredAt)} (UTC+7) · mẫu`} radiusLabel={`${room.data.context.radiusM / 1000} km`} colors={colors} /> : null}
    <AppButton label="Chọn khẩu vị →" onPress={() => onPreferences ? onPreferences(receipt) : setStep('Chọn khẩu vị · GM-10')} colors={colors} />
    <AppButton label="Xem bước phòng chờ" variant="secondary" onPress={() => onLobby ? onLobby(receipt) : setStep('Phòng chờ · GM-11')} colors={colors} />
    <SheetDialog visible={!!step} title={step ?? 'Bước tiếp theo'} onClose={() => setStep(undefined)} colors={colors}>
      <Text style={[entryStyles.body, { color: colors.text }]}>Màn thuộc task tiếp theo chưa nối vào revision này. Bàn giao roomId, code, version và role qua callback; không tự đặt ready hoặc start.</Text>
    </SheetDialog>
  </RoomEntryFrame>;
}
