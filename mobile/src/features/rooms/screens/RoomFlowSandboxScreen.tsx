import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppHeader } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useRoomFlowSandbox } from '../hooks/useRoomFlowSandbox';
import { RoomSnapshotPreviewBox, RpcConsoleLogList } from '../components/RoomFlowSandboxSections';

export interface RoomFlowSandboxScreenProps {
  onBack: () => void;
  onNavigateTo?: (pathname: string, params?: Record<string, string>) => void;
}

export function RoomFlowSandboxScreen({ onBack, onNavigateTo }: RoomFlowSandboxScreenProps) {
  const { colors } = useShellTheme();
  const {
    live,
    activeRoomId,
    activeRoomCode,
    setActiveRoomCode,
    roomSnapshot,
    busy,
    logs,
    handleEnsureSession,
    handleCreateRoom,
    handleJoinRoom,
    handleUpdateContext,
    handleUpdatePreferences,
    handleRefresh,
    handleToggleReady,
    handleStartRound,
  } = useRoomFlowSandbox();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="GM-25 Flow Check" onPressBrand={onBack} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
            Kiểm tra Luồng UI–BE (GM-25)
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Công cụ kiểm chứng trực quan tích hợp Home → Context → Preferences → Lobby/Ready/Start
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Trạng thái Repository & Phiên</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: live.mode === 'real' ? colors.primary : colors.muted }]}>
              <Text style={styles.badgeText}>Chế độ: {live.mode.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: live.status === 'active' ? '#10B981' : '#F59E0B' }]}>
              <Text style={styles.badgeText}>Session: {live.status}</Text>
            </View>
          </View>
          <Text style={[styles.bodyText, { color: colors.text }]}>
            User: {live.user ? `${live.user.displayName} (${live.user.id.slice(0, 10)}...)` : 'Chưa có session'}
          </Text>
          <AppButton label="Khởi tạo / Khôi phục Session" variant="secondary" onPress={handleEnsureSession} loading={busy} colors={colors} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>1. Tạo phòng & Vào phòng</Text>
          <AppButton label="Tạo phòng mới (createRoom)" onPress={handleCreateRoom} loading={busy} colors={colors} />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.line }]}
              placeholder="Nhập mã phòng (6 ký tự)"
              placeholderTextColor={colors.muted}
              value={activeRoomCode}
              onChangeText={setActiveRoomCode}
              autoCapitalize="characters"
            />
            <View style={{ flex: 1 }}>
              <AppButton label="Vào phòng" variant="secondary" onPress={handleJoinRoom} loading={busy} colors={colors} />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>2. Bối cảnh & Khẩu vị</Text>
          <Text style={[styles.bodyText, { color: colors.muted }]}>
            Phòng hiện tại: {activeRoomCode ? `${activeRoomCode} (${activeRoomId.slice(0, 8)}...)` : 'Chưa chọn'}
          </Text>
          <AppButton
            label="Đổi ngân sách phòng (updateContext -> Reset Ready)"
            variant="secondary"
            onPress={handleUpdateContext}
            disabled={!activeRoomId}
            loading={busy}
            colors={colors}
          />
          <AppButton
            label="Gửi khẩu vị & Chống lặp (updatePreferences)"
            variant="secondary"
            onPress={handleUpdatePreferences}
            disabled={!activeRoomId}
            loading={busy}
            colors={colors}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>3. Phòng chờ & Bắt đầu</Text>
          <AppButton label="Tải snapshot mới nhất" variant="secondary" onPress={handleRefresh} disabled={!activeRoomId} loading={busy} colors={colors} />
          {roomSnapshot && <RoomSnapshotPreviewBox roomSnapshot={roomSnapshot} colors={colors} />}
          <AppButton label="Bật/Tắt Sẵn sàng (setReady)" onPress={handleToggleReady} disabled={!roomSnapshot} loading={busy} colors={colors} />
          <AppButton
            label="Bắt đầu chọn món (startRound)"
            variant="primary"
            onPress={handleStartRound}
            disabled={!roomSnapshot || !roomSnapshot.members.every(m => m.ready)}
            loading={busy}
            colors={colors}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>4. Mở màn hình ứng dụng tương ứng</Text>
          <AppButton label="Mở màn Tạo phòng (/room/create)" variant="quiet" onPress={() => onNavigateTo?.('/room/create')} colors={colors} />
          <AppButton label="Mở màn Vào phòng (/room/join)" variant="quiet" onPress={() => onNavigateTo?.('/room/join')} colors={colors} />
          <AppButton
            label="Mở màn Biên nhận (/room/preview)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/room/preview', { roomId: activeRoomId, code: activeRoomCode, role: 'host' })}
            disabled={!activeRoomId}
            colors={colors}
          />
          <AppButton
            label="Mở màn Bối cảnh (/room/context)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/room/context', { roomId: activeRoomId })}
            disabled={!activeRoomId}
            colors={colors}
          />
          <AppButton
            label="Mở màn Khẩu vị (/room/preferences)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/room/preferences', { roomId: activeRoomId })}
            disabled={!activeRoomId}
            colors={colors}
          />
          <AppButton
            label="Mở màn Phòng chờ (/room/lobby)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/room/lobby', { roomId: activeRoomId })}
            disabled={!activeRoomId}
            colors={colors}
          />
        </View>

        <RpcConsoleLogList logs={logs} colors={colors} />
        <AppButton label="Quay lại" variant="quiet" onPress={onBack} colors={colors} />
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 640, alignSelf: 'center', width: '100%' },
  header: { gap: 6, marginBottom: 4 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  bodyText: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
});
