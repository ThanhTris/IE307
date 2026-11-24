import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import type { RoomSnapshot } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppIcon, StatusNotice } from '../../../shared/ui';
import { useHomeRoom } from '../../home/hooks/useHomeRoom';
import { activeRoomBackendCopy, useActiveRoom } from '../hooks/useActiveRoom';
import { errorCopy, type RoomEntryRepository } from '../services/roomEntry';

/**
 * "Quay lại phòng": a highlighted card for this account's last room while it can still be entered (lobby or round 1).
 * From round 2 on the room takes nobody back in; the card says so, and the person still gets the result when the room decides.
 */
export function ReturnToRoomCard({ repository, userId, enabled = true, revision = 0, onReturn }: {
  repository: RoomEntryRepository; userId?: string; enabled?: boolean; revision?: number; onReturn: (room: RoomSnapshot) => void;
}) {
  const { colors } = useShellTheme();
  const lookup = useActiveRoom(repository, userId, enabled, revision);
  const room = useHomeRoom(repository, lookup.data, userId, enabled, revision);
  const state = room.data?.state;
  const secondRound = state === 'ROUND_2' || state === 'WAITING_2';
  const error = lookup.error ?? room.error;
  if (error) return <StatusNotice title="Chưa kiểm tra được phòng"
    message={error === 'CONTRACT_MISMATCH' ? activeRoomBackendCopy : errorCopy[error]}
    actionLabel="Kiểm tra lại phòng" onAction={lookup.retry} tone="error" colors={colors} />;
  if (!room.data) return null;
  if (secondRound) {
    return <View accessibilityRole="summary" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.badge, { backgroundColor: colors.warm }]}><AppIcon name="hourglass" size={22} color={colors.muted} /></View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]}>{`Phòng #${room.data.code} đã sang vòng 2`}</Text>
        <Text style={[styles.status, { color: colors.muted }]}>Không thể vào lại nữa. Bạn sẽ nhận kết quả khi phòng chốt.</Text>
      </View>
    </View>;
  }
  if (!room.active) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Quay lại phòng" accessibilityHint={`Phòng ${room.data.code}`} onPress={() => onReturn(room.data!)}
    style={({ pressed }) => [styles.card, styles.live, { backgroundColor: colors.warm, borderColor: colors.green, opacity: pressed ? 0.9 : 1 }]}>
    <View style={[styles.badge, { backgroundColor: colors.green }]}><AppIcon name="join" size={22} color={colors.onPrimary} /></View>
    <View style={styles.copy}>
      <View style={styles.liveRow}><View style={[styles.dot, { backgroundColor: colors.green }]} /><Text style={[styles.liveText, { color: colors.green }]}>Đang diễn ra</Text></View>
      <Text style={[styles.title, { color: colors.text }]}>{`Phòng #${room.data.code}`}</Text>
    </View>
    <View style={[styles.go, { backgroundColor: colors.green }]}><Text style={[styles.goText, { color: colors.onPrimary }]}>Quay lại</Text><AppIcon name="next" size={16} color={colors.onPrimary} /></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  live: { borderWidth: 1.5 },
  badge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontFamily: 'InterSemiBold', fontSize: 12, lineHeight: 16 },
  title: { fontFamily: 'InterBold', fontSize: 17, lineHeight: 24 },
  status: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 18 },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  goText: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18 },
});
