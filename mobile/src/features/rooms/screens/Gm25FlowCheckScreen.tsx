import { useState, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { AppButton, AppHeader } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type {
  RoomContext,
  RoomSnapshot,
  UserPreferences,
} from '../../../data/api/contracts';

interface LogEntry {
  id: string;
  time: string;
  action: string;
  ok: boolean;
  message: string;
}

interface Props {
  onBack: () => void;
  onNavigateTo?: (pathname: string, params?: Record<string, string>) => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  cuisineIds: ['d7bf6ad7-596c-5ee0-bf45-ccedfcf6460b'], // Món Việt (authoritative taxonomy UUID)
  categoryIds: ['e69b5f45-580d-5ee3-9e43-360650b4c650'], // Cơm (authoritative taxonomy UUID)
  temperature: 'hot',
  flavor: {
    spicy: { present: false, intensity: 'none' },
    salty: { present: true, intensity: 'medium' },
    sweet: { present: true, intensity: 'low' },
    sour: { present: false, intensity: 'none' },
  },
  historyConsent: true,
};

export function Gm25FlowCheckScreen({ onBack, onNavigateTo }: Props) {
  const { colors } = useShellTheme();
  const live = useRoomRepository();

  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('');
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logCounter = useRef(0);

  const addLog = (action: string, ok: boolean, message: string) => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLogs(prev => [
      { id: `log-${++logCounter.current}`, time, action, ok, message },
      ...prev.slice(0, 24),
    ]);
  };

  // 1. Session check
  const handleEnsureSession = async () => {
    setBusy(true);
    try {
      const ok = await live.ensureSession('Trang (Flow Check)');
      if (ok) {
        addLog('ensureSession', true, `Đã xác thực user: ${live.user?.displayName ?? live.repository.getCurrentUser()?.displayName}`);
      } else {
        addLog('ensureSession', false, 'Không tạo/khôi phục được phiên');
      }
    } catch (e: any) {
      addLog('ensureSession', false, e?.message ?? 'Lỗi không xác định');
    } finally {
      setBusy(false);
    }
  };

  // 2. Create room
  const handleCreateRoom = async () => {
    setBusy(true);
    try {
      // Query live discovery context for valid public anchor and server time
      const disc = await live.repository.getDiscoveryContext();
      let anchorId = 'c0a80101-0000-0000-0000-000000000001';
      let desiredAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      if (disc.ok && disc.data.anchors.length > 0) {
        const first = disc.data.anchors[0];
        if (first) {
          anchorId = first.id;
        }
        desiredAt = new Date(Date.parse(disc.data.serverTime) + 30 * 60 * 1000).toISOString();
      }
      const context: RoomContext = {
        anchorId,
        radiusM: 2000,
        mealSlot: 'lunch',
        desiredAt,
        serviceMode: 'dine_in',
        budget: 60000,
        avoidRecent: false,
      };
      const res = await live.repository.createRoom({
        displayName: live.user?.displayName ?? 'Trang (Host)',
        context,
      });
      if (res.ok) {
        setActiveRoomId(res.data.roomId);
        setActiveRoomCode(res.data.code);
        addLog('createRoom', true, `Tạo phòng thành công: ${res.data.code} (ID: ${res.data.roomId.slice(0, 8)}...)`);
        const snap = await live.repository.getRoomSnapshot(res.data.roomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('createRoom', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('createRoom', false, e?.message ?? 'Lỗi tạo phòng');
    } finally {
      setBusy(false);
    }
  };

  // 3. Join room
  const handleJoinRoom = async () => {
    if (!activeRoomCode) {
      addLog('joinRoom', false, 'Vui lòng nhập hoặc tạo mã phòng trước');
      return;
    }
    setBusy(true);
    try {
      const res = await live.repository.joinRoom({
        code: activeRoomCode,
        displayName: 'Tuấn (Member Test)',
      });
      if (res.ok) {
        setActiveRoomId(res.data.roomId);
        addLog('joinRoom', true, `Gia nhập thành công phòng ${res.data.code} (Version: ${res.data.version})`);
        const snap = await live.repository.getRoomSnapshot(res.data.roomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('joinRoom', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('joinRoom', false, e?.message ?? 'Lỗi vào phòng');
    } finally {
      setBusy(false);
    }
  };

  // 4. Update context
  const handleUpdateContext = async () => {
    if (!activeRoomId || !roomSnapshot) {
      addLog('updateContext', false, 'Chưa có phòng để cập nhật');
      return;
    }
    setBusy(true);
    try {
      const nextBudget = roomSnapshot.context.budget === 60000 ? 80000 : 60000;
      const res = await live.repository.updateContext({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
        context: {
          ...roomSnapshot.context,
          budget: nextBudget,
        },
      });
      if (res.ok) {
        addLog('updateContext', true, `Đã đổi ngân sách thành ${nextBudget.toLocaleString('vi-VN')} đ (Ready flags đã reset)`);
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('updateContext', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('updateContext', false, e?.message ?? 'Lỗi cập nhật bối cảnh');
    } finally {
      setBusy(false);
    }
  };

  // 5. Update preferences
  const handleUpdatePreferences = async () => {
    if (!activeRoomId || !roomSnapshot) {
      addLog('updatePreferences', false, 'Chưa có phòng để cập nhật khẩu vị');
      return;
    }
    setBusy(true);
    try {
      const res = await live.repository.updatePreferences({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
        preferences: DEFAULT_PREFERENCES,
      });
      if (res.ok) {
        addLog('updatePreferences', true, 'Đã cập nhật khẩu vị & đồng ý chống lặp');
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('updatePreferences', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('updatePreferences', false, e?.message ?? 'Lỗi cập nhật khẩu vị');
    } finally {
      setBusy(false);
    }
  };

  // 6. Refresh snapshot
  const handleRefresh = async () => {
    if (!activeRoomId) {
      addLog('getRoomSnapshot', false, 'Chưa có phòng để tải');
      return;
    }
    setBusy(true);
    try {
      const snap = await live.repository.getRoomSnapshot(activeRoomId);
      if (snap.ok) {
        setRoomSnapshot(snap.data);
        addLog('getRoomSnapshot', true, `Tải trạng thái thành công: ${snap.data.state} · ${snap.data.members.length} thành viên`);
      } else {
        addLog('getRoomSnapshot', false, `Lỗi: ${snap.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('getRoomSnapshot', false, e?.message ?? 'Lỗi tải phòng');
    } finally {
      setBusy(false);
    }
  };

  // 7. Toggle Ready
  const handleToggleReady = async () => {
    if (!activeRoomId || !roomSnapshot) return;
    const currentMember = roomSnapshot.members.find(
      m => m.userId === (live.user?.id ?? roomSnapshot.hostUserId)
    ) ?? roomSnapshot.members[0];
    const nextReady = !currentMember?.ready;
    setBusy(true);
    try {
      const res = await live.repository.setReady({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
        ready: nextReady,
      });
      if (res.ok) {
        addLog('setReady', true, `Đã chuyển sang trạng thái: ${nextReady ? 'SẴN SÀNG' : 'CHƯA SẴN SÀNG'}`);
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('setReady', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('setReady', false, e?.message ?? 'Lỗi sẵn sàng');
    } finally {
      setBusy(false);
    }
  };

  // 8. Start round
  const handleStartRound = async () => {
    if (!activeRoomId || !roomSnapshot) return;
    setBusy(true);
    try {
      const res = await live.repository.startRound({
        roomId: activeRoomId,
        expectedVersion: roomSnapshot.version,
      });
      if (res.ok) {
        addLog('startRound', true, 'Phòng chuyển sang VÒNG 1 thành công!');
        const snap = await live.repository.getRoomSnapshot(activeRoomId);
        if (snap.ok) setRoomSnapshot(snap.data);
      } else {
        addLog('startRound', false, `Lỗi: ${res.error.messageKey}`);
      }
    } catch (e: any) {
      addLog('startRound', false, e?.message ?? 'Lỗi bắt đầu');
    } finally {
      setBusy(false);
    }
  };

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

        {/* Trạng thái kết nối */}
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

        {/* Các bước kiểm tra luồng */}
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

        {/* Bối cảnh & Khẩu vị */}
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

        {/* Phòng chờ, Ready & Start */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>3. Phòng chờ & Bắt đầu</Text>
          <AppButton label="Tải snapshot mới nhất" variant="secondary" onPress={handleRefresh} disabled={!activeRoomId} loading={busy} colors={colors} />

          {roomSnapshot && (
            <View style={[styles.snapshotBox, { backgroundColor: colors.background, borderColor: colors.line }]}>
              <Text style={[styles.bodyText, { fontWeight: '700', color: colors.text }]}>
                Trạng thái: {roomSnapshot.state} · Version: {roomSnapshot.version}
              </Text>
              <Text style={[styles.helperText, { color: colors.muted }]}>
                Bối cảnh: {roomSnapshot.context.anchorName} · Ngân sách: {roomSnapshot.context.budget?.toLocaleString('vi-VN')} đ
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
          )}

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

        {/* Mở trực tiếp màn hình thật */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>4. Mở màn hình ứng dụng tương ứng</Text>
          <AppButton label="Mở màn Tạo phòng (/create-room)" variant="quiet" onPress={() => onNavigateTo?.('/create-room')} colors={colors} />
          <AppButton label="Mở màn Vào phòng (/join-room)" variant="quiet" onPress={() => onNavigateTo?.('/join-room')} colors={colors} />
          <AppButton
            label="Mở màn Biên nhận (/room-preview)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/room-preview', { roomId: activeRoomId, code: activeRoomCode, role: 'host' })}
            disabled={!activeRoomId}
            colors={colors}
          />
          <AppButton
            label="Mở màn Bối cảnh (/gm10/context)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/gm10/context', { roomId: activeRoomId })}
            disabled={!activeRoomId}
            colors={colors}
          />
          <AppButton
            label="Mở màn Khẩu vị (/gm10/preferences)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/gm10/preferences', { roomId: activeRoomId })}
            disabled={!activeRoomId}
            colors={colors}
          />
          <AppButton
            label="Mở màn Phòng chờ (/gm11/lobby)"
            variant="quiet"
            onPress={() => onNavigateTo?.('/gm11/lobby', { roomId: activeRoomId })}
            disabled={!activeRoomId}
            colors={colors}
          />
        </View>

        {/* Nhật ký thao tác RPC */}
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
  helperText: { fontSize: 13, lineHeight: 18 },
  sectionHeading: { fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  snapshotBox: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  memberItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  logItem: { borderBottomWidth: 1, paddingVertical: 8, gap: 2 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  logTime: { fontSize: 11 },
  logAction: { fontSize: 13, fontWeight: '700' },
  logMessage: { fontSize: 12 },
});
