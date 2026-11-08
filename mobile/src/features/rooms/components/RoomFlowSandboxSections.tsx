import { StyleSheet, Text, View } from 'react-native';
import type { RoomSnapshot } from '../../../data/api/contracts';
import type { Palette } from '../../../shared/ui';
import type { LogEntry } from '../hooks/useRoomFlowSandbox';

export function RoomSnapshotPreviewBox({ roomSnapshot, colors }: { roomSnapshot: RoomSnapshot; colors: Palette }) {
  return (
    <View style={[styles.snapshotBox, { backgroundColor: colors.background, borderColor: colors.line }]}>
      <Text style={[styles.bodyText, { fontWeight: '700', color: colors.text }]}>
        Trạng thái: {roomSnapshot.state} · Version: {roomSnapshot.version}
      </Text>
      <Text style={[styles.helperText, { color: colors.muted }]}>
        Bối cảnh: {roomSnapshot.context?.anchorName} · Ngân sách: {roomSnapshot.context?.budget?.toLocaleString('vi-VN')} đ
      </Text>
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Thành viên ({roomSnapshot.members.length}/8):</Text>
      {roomSnapshot.members.map(m => (
        <View key={m.userId} style={styles.memberItem}>
          <Text style={[styles.bodyText, { color: colors.text }]}>
            {m.displayName} {m.userId === roomSnapshot.hostUserId ? '👑 (Host)' : ''}
          </Text>
          <Text style={{ color: m.ready ? '#10B981' : '#F59E0B', fontWeight: '700' }}>
            {m.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function RpcConsoleLogList({ logs, colors }: { logs: LogEntry[]; colors: Palette }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Nhật ký RPC (Live Console)</Text>
      {logs.length === 0 ? (
        <Text style={[styles.helperText, { color: colors.muted }]}>Chưa có thao tác nào được thực hiện.</Text>
      ) : (
        logs.map(log => (
          <View key={log.id} style={[styles.logItem, { borderColor: colors.line }]}>
            <View style={styles.logHeader}>
              <Text style={[styles.logTime, { color: colors.muted }]}>{log.time}</Text>
              <Text style={{ color: log.ok ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                {log.ok ? '✓ PASS' : '✗ FAIL'}
              </Text>
            </View>
            <Text style={[styles.logAction, { color: colors.text }]}>{log.action}</Text>
            <Text style={[styles.logMessage, { color: colors.muted }]}>{log.message}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  bodyText: { fontSize: 14, lineHeight: 20 },
  helperText: { fontSize: 13, lineHeight: 18 },
  sectionHeading: { fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 8 },
  snapshotBox: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  memberItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  logItem: { borderBottomWidth: 1, paddingVertical: 8, gap: 2 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  logTime: { fontSize: 11 },
  logAction: { fontSize: 13, fontWeight: '700' },
  logMessage: { fontSize: 12 },
});
