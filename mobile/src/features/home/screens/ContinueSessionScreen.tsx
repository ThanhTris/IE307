import { View, StyleSheet } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import type { ErrorCode, RoomSnapshot } from '../../../data/api/contracts';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import type { RoomEntryReceipt, RoomEntryRepository } from '../../rooms/services/roomEntry';
import { errorCopy } from '../../rooms/services/roomEntry';
import { activeRoomBackendCopy } from '../../rooms/hooks/useActiveRoom';
import { HomeFlowFrame } from '../components/HomeFlowFrame';
import { useHomeRoom } from '../hooks/useHomeRoom';

const roomStage = (room: RoomSnapshot) => room.state === 'LOBBY' ? 'Đang ở phòng chờ' : room.state === 'ROUND_2' ? 'Vòng 2 · Đang chọn món' : 'Vòng 1 · Đang chọn món';

export function ContinueSessionScreen({ repository, receipt, lookup, userId, enabled = true, isInitializing = false, onContinue, onHome }: {
  repository: RoomEntryRepository; receipt?: Pick<RoomEntryReceipt, 'roomId'> & Partial<RoomEntryReceipt> | null; userId?: string;
  enabled?: boolean; isInitializing?: boolean; onContinue: (room: RoomSnapshot) => void; onHome: () => void;
  lookup?: { loading: boolean; error?: ErrorCode; retry(): void };
}) {
  const { colors, dark } = useShellTheme();
  const { textStyle } = useAppFonts();
  const room = useHomeRoom(repository, receipt, userId, enabled);
  const host = room.data?.members.find(member => member.userId === room.data?.hostUserId);
  return <HomeFlowFrame title="Tiếp tục phiên" onHome={onHome}>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>{room.active ? 'Bạn có phiên đang diễn ra' : 'Kiểm tra phiên của bạn'}</Text>
    {!receipt && !lookup?.error && !lookup?.loading && !isInitializing && enabled && userId ? <StatusNotice title="Không có phòng để tiếp tục" message="Về trang chủ để tạo hoặc tham gia phòng." colors={colors} /> : null}
    {isInitializing ? <StatusNotice title="Đang khôi phục phiên…" colors={colors} /> : null}
    {!isInitializing && (!enabled || !userId) ? <StatusNotice title="Cần khôi phục danh tính" message="Về trang chủ và khôi phục phiên trước khi tìm phòng." colors={colors} /> : null}
    {lookup?.loading || room.loading ? <StatusNotice title="Đang kiểm tra phòng…" colors={colors} /> : null}
    {lookup?.error ? <StatusNotice title="Chưa kiểm tra được phòng" message={lookup.error === 'CONTRACT_MISMATCH' ? activeRoomBackendCopy : errorCopy[lookup.error]} actionLabel="Kiểm tra lại phòng" onAction={lookup.retry} tone="error" colors={colors} /> : null}
    {room.error ? <StatusNotice title={room.unavailable ? 'Không thể tiếp tục phòng này' : 'Chưa kiểm tra được phòng'} message={errorCopy[room.error]} actionLabel={room.unavailable ? undefined : 'Kiểm tra lại phòng'} onAction={room.unavailable ? undefined : room.retry} tone={room.unavailable ? undefined : 'error'} colors={colors} /> : null}
    {room.data && !room.active && (room.data.state === 'ROUND_2' || room.data.state === 'WAITING_2') ? <StatusNotice title="Phòng đã sang vòng 2" message="Không thể vào lại nữa. Bạn sẽ nhận kết quả khi phòng chốt." colors={colors} /> : null}
    {room.data && !room.active && room.data.state !== 'ROUND_2' && room.data.state !== 'WAITING_2' ? <StatusNotice title={room.data.state === 'EXPIRED' ? 'Phòng đã hết hạn' : 'Phòng đã kết thúc'} message="Về trang chủ để bắt đầu một phòng khác." colors={colors} /> : null}
    {room.active && room.data ? <>
      <View style={[styles.card, { backgroundColor: dark ? colors.surface : colors.onPrimary, borderColor: colors.line }]}>
        <Text style={[styles.roomTitle, { color: colors.text }, textStyle(600)]}>{host ? `Phòng của ${host.displayName}` : `Phòng #${room.data.code}`}</Text>
        <Text style={[styles.stage, { color: colors.primary }, textStyle(500)]}>{roomStage(room.data)}</Text>
        <View style={[styles.divider, { backgroundColor: colors.warm }]} />
        <View style={styles.codeRow}><Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Mã phòng</Text><Text selectable style={[styles.code, { color: colors.text }, textStyle(600)]}>{room.data.code}</Text></View>
      </View>
      <Text style={[styles.hint, { color: colors.muted }, textStyle(400)]}>Tiếp tục từ bước đang làm dở.</Text>
    </> : null}
    <View style={styles.spacer} />
    <View style={styles.actions}>
      <AppButton label="Quay lại phòng" disabled={!enabled || !room.active} onPress={() => { if (room.active && room.data) onContinue(room.data); }} textStyle={textStyle(600)} colors={colors} />
      <AppButton label="Về trang chủ" variant="secondary" onPress={onHome} textStyle={textStyle(600)} colors={colors} />
    </View>
  </HomeFlowFrame>;
}

const styles = StyleSheet.create({
  title: { fontSize: 27, lineHeight: 33, marginBottom: 34 },
  card: { minHeight: 216, borderWidth: 1, borderRadius: 20, padding: 20 },
  roomTitle: { fontSize: 21, lineHeight: 27 },
  stage: { fontSize: 16, lineHeight: 22, marginTop: 16 },
  divider: { height: 1, marginTop: 24 },
  codeRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  caption: { fontSize: 14, lineHeight: 20 }, code: { fontSize: 17, lineHeight: 24 },
  hint: { fontSize: 15, lineHeight: 22, marginTop: 24 },
  spacer: { flexGrow: 1, minHeight: 32 }, actions: { gap: 20 },
});
