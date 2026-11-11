import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Clipboard, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import type { ErrorCode, Friend, RoomSnapshot } from '../../../data/api';
import { AppButton, AppIcon, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { errorCopy } from '../services/roomEntry';
import { createJoinRoomShareMessage } from '../services/joinLinks';
import { lobbyMealSummary, lobbyPreferenceRows } from '../services/lobbyPresentation';
import { useLobby, type LobbyRepository } from '../hooks/useLobby';
import { RoomQrModal } from '../components/RoomQrModal';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

type Colors = ReturnType<typeof useShellTheme>['colors'];

export type LobbyScreenProps = {
  onNavigate?: (path: string) => void;
  onHome: () => void;
  repository: LobbyRepository;
  roomId?: string;
  currentUserId?: string;
  createRequestId?: (action: string) => string;
  onStartRound?: (snapshot: RoomSnapshot) => void;
  onEditSettings?: (snapshot: RoomSnapshot) => void;
  onEditPreferences?: (snapshot: RoomSnapshot) => void;
};

/** Figma 68:429 (chủ phòng), 368:11865 (thành viên), 368:12840 (menu chủ phòng). */
export function LobbyScreen({
  onHome,
  repository,
  roomId,
  currentUserId,
  createRequestId,
  onStartRound,
  onEditSettings,
  onEditPreferences,
}: LobbyScreenProps) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  const insets = useSafeAreaInsets();
  const [showQr, setShowQr] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const lobby = useLobby({ repository, roomId, currentUserId, createRequestId, onStartRound, onHome });
  const { snapshot, displaySnapshot, loadError, loadState, confirm, setConfirm, notice, busy, busyRef, eligibilityError, viewer, isHost, reload, runWrite } = lobby;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busyRef.current) return true;
      if (!snapshot || !viewer || snapshot.state !== 'LOBBY') return false;
      if (confirm) { setConfirm(null); return true; }
      setConfirm(isHost ? 'cancel' : 'leave');
      return true;
    });
    return () => subscription.remove();
  }, [busyRef, confirm, isHost, setConfirm, snapshot, viewer]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const room = displaySnapshot ?? snapshot;
  const ready = Boolean(room && loadState === 'ready' && viewer);
  const inLobby = room?.state === 'LOBBY';
  const exitLabel = isHost ? 'Hủy phòng' : 'Rời phòng';
  const copyCode = () => { if (!room) return; Clipboard.setString(room.code); setCopied(true); };
  const share = () => { if (room) void Share.share({ message: createJoinRoomShareMessage(room.code) }).catch(() => undefined); };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <IconButton label={ready && inLobby ? exitLabel : 'Về trang chủ'} disabled={busy} onPress={() => { if (ready && inLobby) setConfirm(isHost ? 'cancel' : 'leave'); else onHome(); }} colors={colors}>
          <Svg width={20} height={20} viewBox="0 0 20 20"><Path d="M4 4l12 12M16 4L4 16" stroke={colors.text} strokeWidth={2} strokeLinecap="round" /></Svg>
        </IconButton>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: colors.text }, textStyle(700)]}>Phòng chờ</Text>
        {ready && inLobby ? <IconButton label="Tùy chọn phòng" disabled={busy} onPress={() => setMenuOpen(true)} colors={colors}>
          <Svg width={20} height={20} viewBox="0 0 20 20">{[4, 10, 16].map(x => <Circle key={x} cx={x} cy={10} r={1.8} fill={colors.text} />)}</Svg>
        </IconButton> : <View style={styles.iconButton} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loadState === 'loading' ? <StatusNotice title="Đang tải phòng…" tone="info" colors={colors} /> : null}
        {loadState === 'error' ? <StatusNotice title="Không tải được phòng" message={errorCopy[loadError as ErrorCode] ?? String(loadError)} tone="error" actionLabel="Thử lại" onAction={reload} colors={colors} /> : null}
        {room && loadState === 'ready' && !viewer ? (
          <StatusNotice
            title={currentUserId ? 'Bạn không thuộc phòng này' : 'Chưa xác định được danh tính phiên'}
            message={currentUserId ? 'Phòng không xác nhận bạn là thành viên nên thông tin và thao tác đang bị khóa.' : 'Đang chờ khôi phục phiên. Thông tin và thao tác phòng đang bị khóa.'}
            tone="error"
            colors={colors}
          />
        ) : null}

        {room && ready ? <>
          <View style={[styles.codeCard, { backgroundColor: colors.warm, borderColor: colors.line }]}>
            <Text style={[styles.caption, { color: colors.muted }, textStyle(500)]}>Mã phòng</Text>
            <View style={styles.codeRow}>
              <Text accessibilityLabel={`Mã phòng ${room.code}`} selectable style={[styles.code, { color: colors.text }, textStyle(700)]}>{room.code}</Text>
              <IconButton label={copied ? 'Đã sao chép mã' : 'Sao chép mã'} onPress={copyCode} colors={colors}>
                <Svg width={20} height={20} viewBox="0 0 20 20"><Rect x={6.5} y={6.5} width={10} height={10} rx={2} stroke={colors.text} strokeWidth={1.6} fill="none" /><Path d="M13 4.5V4a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 3 4v7a1.5 1.5 0 0 0 1.5 1.5H5" stroke={colors.text} strokeWidth={1.6} fill="none" /></Svg>
              </IconButton>
            </View>
            {copied ? <Text accessibilityLiveRegion="polite" style={[styles.caption, { color: colors.primary }, textStyle(500)]}>Đã sao chép mã phòng</Text> : null}
            <View style={styles.codeActions}>
              <CardAction label="Chia sẻ lời mời" onPress={share} disabled={busy} colors={colors} icon={<AppIcon name="share" size={18} color={colors.text} />} />
              <CardAction label="Hiện QR" onPress={() => setShowQr(true)} disabled={busy} colors={colors} icon={<AppIcon name="qr" size={18} color={colors.text} />} />
            </View>
          </View>

          <MealCard room={room} canEdit={isHost && inLobby && Boolean(onEditSettings)} disabled={busy} onEdit={() => onEditSettings?.(room)} colors={colors} />

          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }, textStyle(700)]}>{`Thành viên (${room.members.length})`}</Text>
            {isHost && inLobby ? <Pressable accessibilityRole="button" accessibilityLabel="Mời thêm" disabled={busy || room.members.length >= 20} onPress={() => setInviteOpen(true)} style={styles.linkButton}>
              <Text style={[styles.link, { color: colors.text }, textStyle(600)]}>+  Mời thêm</Text>
            </Pressable> : null}
          </View>
          {room.members.map(member => {
            const you = member.userId === viewer?.userId;
            const host = member.userId === room.hostUserId;
            return <View key={member.userId} style={[styles.memberRow, { borderColor: colors.line, backgroundColor: colors.surface }]}>
              <View style={[styles.avatar, { backgroundColor: host ? colors.warm : colors.soft, borderColor: colors.line }]}>
                <Text style={[styles.avatarText, { color: colors.text }, textStyle(600)]}>{(member.displayName.trim() || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.memberCopy}>
                <Text style={[styles.memberName, { color: colors.text }, textStyle(600)]}>{you ? `${member.displayName} (Bạn)` : member.displayName}</Text>
                {host ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Chủ phòng</Text> : null}
              </View>
            </View>;
          })}

          <PreferencesCard room={room} disabled={busy || !inLobby || !onEditPreferences} onEdit={() => onEditPreferences?.(room)} colors={colors} />

          {notice ? <ToastNotice title="Cập nhật" message={notice} tone="success" /> : null}
          {eligibilityError ? <ToastNotice title="Chưa thể bắt đầu" message={errorCopy[eligibilityError as ErrorCode] ?? 'Chưa đủ món để bắt đầu. Hãy kiểm tra thiết lập phòng rồi thử lại.'} tone="warning" /> : null}
        </> : null}
      </ScrollView>

      {room && ready ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.background }]}>
        {isHost
          ? <AppButton label="Bắt đầu chọn món" onPress={() => void runWrite('start')} disabled={!inLobby || Boolean(eligibilityError)} loading={busy} colors={colors} textStyle={textStyle(600)} />
          : <AppButton label="Đang chờ chủ phòng" disabled onPress={() => undefined} colors={colors} textStyle={textStyle(600)} />}
      </View> : null}

      {room ? <RoomQrModal visible={showQr} code={room.code} onClose={() => setShowQr(false)} onCopyLink={async link => { Clipboard.setString(link); }} /> : null}

      <SheetDialog visible={menuOpen} title="Tùy chọn phòng" onClose={() => setMenuOpen(false)} colors={colors}>
        {isHost && onEditSettings && room ? <AppButton label="Chỉnh sửa bữa ăn" variant="secondary" onPress={() => { setMenuOpen(false); onEditSettings(room); }} colors={colors} /> : null}
        {isHost ? <AppButton label="Mời thêm bạn" variant="secondary" onPress={() => { setMenuOpen(false); setInviteOpen(true); }} disabled={!room || room.members.length >= 20} colors={colors} /> : null}
        {!isHost && onEditPreferences && room ? <AppButton label="Sửa khẩu vị" variant="secondary" onPress={() => { setMenuOpen(false); onEditPreferences(room); }} colors={colors} /> : null}
        <AppButton label={exitLabel} variant="danger" onPress={() => { setMenuOpen(false); setConfirm(isHost ? 'cancel' : 'leave'); }} colors={colors} />
        <AppButton label="Đóng" variant="quiet" onPress={() => setMenuOpen(false)} colors={colors} />
      </SheetDialog>

      {room && isHost ? <RoomInviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} repository={repository} snapshot={room} busy={busy} colors={colors} onInvite={partnerId => { setInviteOpen(false); void runWrite('invite', partnerId); }} /> : null}

      <SheetDialog visible={confirm !== null} title={confirm === 'cancel' ? 'Xác nhận hủy phòng?' : 'Xác nhận rời phòng?'} onClose={() => setConfirm(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{confirm === 'cancel' ? 'Phòng sẽ đóng với mọi thành viên.' : 'Bạn có thể vào lại bằng mã phòng khi phòng còn mở.'}</Text>
        <AppButton label={confirm === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận rời'} variant="danger" onPress={() => { const action = confirm; setConfirm(null); if (action) void runWrite(action); }} colors={colors} />
        <AppButton label="Ở lại phòng" variant="quiet" onPress={() => setConfirm(null)} colors={colors} />
      </SheetDialog>
    </SafeAreaView>
  );
}

function IconButton({ label, onPress, disabled, colors, children }: { label: string; onPress: () => void; disabled?: boolean; colors: Colors; children: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.soft }]}>
    {children}
  </Pressable>;
}

function CardAction({ label, icon, onPress, disabled, colors }: { label: string; icon: ReactNode; onPress: () => void; disabled?: boolean; colors: Colors }) {
  const { textStyle } = useAppFonts();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.cardAction, { borderColor: colors.line, backgroundColor: pressed ? colors.soft : colors.surface }]}>
    {icon}<Text style={[styles.cardActionText, { color: colors.text }, textStyle(600)]}>{label}</Text>
  </Pressable>;
}

function MealCard({ room, canEdit, disabled, onEdit, colors }: { room: RoomSnapshot; canEdit: boolean; disabled: boolean; onEdit: () => void; colors: Colors }) {
  const { textStyle } = useAppFonts();
  const summary = lobbyMealSummary(room);
  return <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
    <View style={styles.cardHeader}>
      <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.text }, textStyle(700)]}>Bữa ăn hôm nay</Text>
      {canEdit ? <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa bữa ăn" disabled={disabled} onPress={onEdit} style={styles.linkButton}>
        <Text style={[styles.link, { color: colors.text }, textStyle(600)]}>Chỉnh sửa</Text>
      </Pressable> : null}
    </View>
    <View style={styles.mealRow}>
      <MealItem icon={<AppIcon name={summary.meal.icon} size={16} color={colors.text} />} label={summary.meal.label} colors={colors} />
      <MealItem icon={<AppIcon name="lightning" size={16} color={colors.text} />} label={summary.timeLabel} colors={colors} />
      {summary.budgetLabel ? <MealItem icon={<AppIcon name="coins" size={16} color={colors.text} />} label={summary.budgetLabel} colors={colors} /> : null}
    </View>
    {summary.dishCount ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{`${summary.dishCount} món`}</Text> : null}
  </View>;
}

function MealItem({ icon, label, colors }: { icon: ReactNode; label: string; colors: Colors }) {
  const { textStyle } = useAppFonts();
  return <View style={styles.mealItem}>{icon}<Text style={[styles.mealLabel, { color: colors.text }, textStyle(500)]}>{label}</Text></View>;
}

function PreferencesCard({ room, disabled, onEdit, colors }: { room: RoomSnapshot; disabled: boolean; onEdit: () => void; colors: Colors }) {
  const { textStyle } = useAppFonts();
  const rows = lobbyPreferenceRows(room.ownPreferences);
  return <Pressable accessibilityRole="button" accessibilityLabel="Khẩu vị của bạn, sửa" accessibilityState={{ disabled }} disabled={disabled} onPress={onEdit} style={({ pressed }) => [styles.card, { borderColor: colors.line, backgroundColor: pressed ? colors.soft : colors.surface }]}>
    <View style={styles.cardHeader}>
      <Text style={[styles.cardTitle, { color: colors.text }, textStyle(700)]}>Khẩu vị của bạn</Text>
      {rows.length ? <Text style={[styles.link, { color: colors.text }, textStyle(600)]}>Sửa ›</Text> : <Text style={[styles.chevron, { color: colors.text }]}>›</Text>}
    </View>
    {rows.length === 0
      ? <Text style={[styles.mealLabel, { color: colors.text }, textStyle(500)]}>Ăn gì cũng được</Text>
      : rows.map(row => <View key={row.label} style={styles.prefRow}>
        <Text style={[styles.prefLabel, { color: colors.muted }, textStyle(400)]}>{row.label}</Text>
        <View style={styles.chips}>{row.values.map(value => <View key={value} style={[styles.chip, { backgroundColor: colors.warm, borderColor: colors.line }]}><Text style={[styles.chipText, { color: colors.text }, textStyle(500)]}>{value}</Text></View>)}</View>
      </View>)}
  </Pressable>;
}

function RoomInviteSheet({ visible, onClose, repository, snapshot, busy, colors, onInvite }: {
  visible: boolean;
  onClose: () => void;
  repository?: LobbyRepository;
  snapshot: RoomSnapshot;
  busy: boolean;
  colors: Colors;
  onInvite: (partnerId: string) => void;
}) {
  const { textStyle } = useAppFonts();
  // null = not loaded for this opening yet; reset from event handlers so the effect only sets state asynchronously.
  const [loaded, setLoaded] = useState<{ friends: Friend[]; error: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!visible || !repository) return;
    let alive = true;
    void repository.listFriends().then(result => {
      if (alive) setLoaded(result.ok ? { friends: result.data, error: '' } : { friends: [], error: result.error.messageKey });
    });
    return () => { alive = false; };
  }, [visible, repository, attempt]);
  const reload = () => { setLoaded(null); setAttempt(value => value + 1); };
  const close = () => { setLoaded(null); onClose(); };
  const friends = loaded?.friends ?? [], error = loaded?.error ?? '';
  const loading = visible && !!repository && loaded === null;
  const existing = new Set(snapshot.members.map(member => member.userId));
  const eligible = friends.filter(friend => !existing.has(friend.friendUserId));
  const full = snapshot.members.length >= 20;
  return <SheetDialog visible={visible} title="Mời thêm bạn" onClose={() => { if (!busy) close(); }} colors={colors}>
    {loading ? <StatusNotice title="Đang tải bạn bè…" tone="info" colors={colors} /> : null}
    {error ? <StatusNotice title="Không tải được bạn bè" message={errorCopy[error as ErrorCode] ?? error} tone="error" actionLabel="Tải lại" onAction={reload} colors={colors} /> : null}
    {!loading && !error && eligible.length === 0 ? <StatusNotice title={full ? 'Phòng đã đủ 20 người' : 'Chưa có bạn để mời'} message={full ? undefined : 'Bạn bè hiện có đều đã ở trong phòng. Bạn có thể chia sẻ mã phòng.'} tone="info" colors={colors} /> : null}
    {!loading && !error ? eligible.map(friend => <View key={friend.id} style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.memberCopy}>
        <Text style={[styles.memberName, { color: colors.text }, textStyle(600)]}>{friend.displayName}</Text>
        <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{friend.friendCode}</Text>
      </View>
      <AppButton label={`Mời ${friend.displayName}`} onPress={() => { setLoaded(null); onInvite(friend.friendUserId); }} disabled={busy || full} colors={colors} />
    </View>) : null}
  </SheetDialog>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 56, width: '100%', maxWidth: 480, alignSelf: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, lineHeight: 24 },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
  codeCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  code: { fontSize: 36, lineHeight: 44, letterSpacing: 1 },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cardAction: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  cardActionText: { fontSize: 14, lineHeight: 20 },
  qrIcon: { width: 18, height: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 17, lineHeight: 24 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  mealItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealIcon: { width: 16, height: 16 },
  mealLabel: { fontSize: 14, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 18, lineHeight: 26 },
  linkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { fontSize: 14, lineHeight: 20 },
  memberRow: { minHeight: 60, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, lineHeight: 20 },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { fontSize: 15, lineHeight: 21 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prefLabel: { width: 72, fontSize: 13, lineHeight: 18 },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 22, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 14, lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
