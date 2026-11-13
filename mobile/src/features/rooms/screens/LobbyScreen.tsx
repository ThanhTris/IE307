import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import type { ErrorCode, Friend, RoomSnapshot } from '../../../data/api';
import { AppButton, AppIcon, LoadingState, SheetDialog, StatusNotice, SwipeToDeleteRow, type AppIconName } from '../../../shared/ui';
import { ChoiceIconView } from '../../../shared/ui/icons/ChoiceIcon';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { errorCopy } from '../services/roomEntry';
import { createJoinRoomShareMessage } from '../services/joinLinks';
import { createJoinRoomOpenLink } from '../services/joinLinkUrl';
import { lobbyMealSummary, lobbyPreferenceRows } from '../services/lobbyPresentation';
import { useLobby, type LobbyRepository } from '../hooks/useLobby';
import { RoomQrModal } from '../components/RoomQrModal';
import { LobbyMealEditor, type MealField } from '../components/LobbyMealEditor';
import type { DishSetupGateway } from '../../context/services/dishSetupGateway';
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
  /** Edits one meal setting in place from the lobby card (host only). */
  settingsGateway?: DishSetupGateway;
  onEditPreferences?: (snapshot: RoomSnapshot) => void;
  /** Friends chosen while creating the room: invited once, one at a time, when the lobby is ready. */
  autoInvite?: string[];
};

/** Figma 68:429 (chủ phòng), 368:11865 (thành viên), 368:12840 (menu chủ phòng). */
export function LobbyScreen({
  onNavigate,
  onHome,
  repository,
  roomId,
  currentUserId,
  createRequestId,
  onStartRound,
  settingsGateway,
  onEditPreferences,
  autoInvite,
}: LobbyScreenProps) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  const insets = useSafeAreaInsets();
  const [showQr, setShowQr] = useState(false);
  const [editField, setEditField] = useState<MealField | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);
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
  const invited = useRef(new Set<string>());
  useEffect(() => {
    if (!autoInvite?.length || !snapshot || snapshot.state !== 'LOBBY' || !isHost || busy || !viewer) return;
    const next = autoInvite.find(id => !invited.current.has(id) && !snapshot.members.some(member => member.userId === id));
    if (!next) return;
    invited.current.add(next);
    void runWrite('invite', next);
  }, [autoInvite, snapshot, isHost, busy, viewer, runWrite]);
  const ready = Boolean(room && loadState === 'ready' && viewer);
  const inLobby = room?.state === 'LOBBY';
  const exitLabel = isHost ? 'Hủy phòng' : 'Rời phòng';
  const copyCode = () => { if (!room) return; void Clipboard.setStringAsync(room.code).catch(() => undefined); setCopied(true); };
  const share = () => { if (room) void Share.share({ message: createJoinRoomShareMessage(room.code, createJoinRoomOpenLink(room.code)) }).catch(() => undefined); };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <IconButton label={ready && inLobby ? exitLabel : 'Về trang chủ'} disabled={busy} onPress={() => { if (ready && inLobby) setConfirm(isHost ? 'cancel' : 'leave'); else onHome(); }} colors={colors}>
          <Svg width={20} height={20} viewBox="0 0 20 20"><Path d="M4 4l12 12M16 4L4 16" stroke={colors.text} strokeWidth={2} strokeLinecap="round" /></Svg>
        </IconButton>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: colors.text }, textStyle(700)]}>Phòng chờ</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loadState === 'loading' ? <LoadingState label="Đang tải phòng" colors={colors} /> : null}
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
                <AppIcon name={copied ? 'check' : 'copy'} size={20} color={copied ? colors.primary : colors.text} />
              </IconButton>
            </View>
            <View style={styles.codeActions}>
              <CardAction label="Chia sẻ lời mời" onPress={share} disabled={busy} colors={colors} icon={<AppIcon name="share" size={18} color={colors.text} />} />
              <CardAction label="Hiện QR" onPress={() => setShowQr(true)} disabled={busy} colors={colors} icon={<AppIcon name="qr" size={18} color={colors.text} />} />
            </View>
          </View>

          <MealCard room={room} canEdit={isHost && inLobby && Boolean(settingsGateway)} disabled={busy} onEdit={setEditField} colors={colors} />

          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }, textStyle(700)]}>{`Thành viên (${room.members.length})`}</Text>
            {isHost && inLobby ? <Pressable accessibilityRole="button" accessibilityLabel="Mời thêm" disabled={busy || room.members.length >= 20} onPress={() => setInviteOpen(true)} style={styles.linkButton}>
              <Text style={[styles.link, { color: colors.text }, textStyle(600)]}>+  Mời thêm</Text>
            </Pressable> : null}
          </View>
          {room.members.map(member => {
            const you = member.userId === viewer?.userId;
            const host = member.userId === room.hostUserId;
            const row = <View key={member.userId} style={[styles.memberRow, { borderColor: colors.line, backgroundColor: colors.surface }]}>
              <View style={[styles.avatar, { backgroundColor: host ? colors.warm : colors.soft, borderColor: colors.line }]}>
                <Text style={[styles.avatarText, { color: colors.text }, textStyle(600)]}>{(member.displayName.trim() || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.memberCopy}>
                <Text style={[styles.memberName, { color: colors.text }, textStyle(600)]}>{you ? `${member.displayName} (Bạn)` : member.displayName}</Text>
                {host ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Chủ phòng</Text> : null}
              </View>
            </View>;
            // The host swipes a member's row to reveal "Xóa"; removing someone still asks first.
            return isHost && inLobby && !host && Boolean(repository.removeRoomMember)
              ? <SwipeToDeleteRow key={member.userId} accessibilityLabel={`Xóa ${member.displayName} khỏi phòng`} disabled={busy} onDelete={() => setRemoveTarget({ userId: member.userId, name: member.displayName })} colors={colors}>{row}</SwipeToDeleteRow>
              : row;
          })}

          <PreferencesCard room={room} disabled={busy || !inLobby || !onEditPreferences} onEdit={() => onEditPreferences?.(room)} colors={colors} />

          {notice ? <ToastNotice title={notice.split(' · ')[0]!} message={notice.split(' · ').slice(1).join(' · ') || undefined} tone={lobby.noticeTone} /> : null}
          {eligibilityError ? <ToastNotice title="Chưa thể bắt đầu" message={errorCopy[eligibilityError as ErrorCode] ?? 'Chưa đủ món để bắt đầu. Hãy kiểm tra thiết lập phòng rồi thử lại.'} tone="error" /> : null}
        </> : null}
      </ScrollView>

      {room && ready ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.background }]}>
        {isHost
          ? <AppButton label="Bắt đầu chọn món" onPress={() => void runWrite('start')} disabled={!inLobby || Boolean(eligibilityError)} loading={busy} colors={colors} textStyle={textStyle(600)} />
          : <AppButton label="Đang chờ chủ phòng" disabled onPress={() => undefined} colors={colors} textStyle={textStyle(600)} />}
      </View> : null}

      {room ? <RoomQrModal visible={showQr} code={room.code} onClose={() => setShowQr(false)} onCopyLink={async link => { await Clipboard.setStringAsync(link); }} /> : null}

      {settingsGateway ? <LobbyMealEditor field={editField} gateway={settingsGateway} onClose={() => setEditField(null)} onSaved={reload} /> : null}

      {room && isHost ? <RoomInviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} repository={repository} snapshot={room} busy={busy} colors={colors} onInvite={partnerId => { setInviteOpen(false); void runWrite('invite', partnerId); }} onFindFriends={onNavigate ? () => { setInviteOpen(false); onNavigate('/friends?from=lobby'); } : undefined} /> : null}

      <SheetDialog visible={removeTarget !== null} presentation="dialog" showClose={false} showHandle={false} title={`Xóa ${removeTarget?.name ?? 'thành viên'} khỏi phòng?`} onClose={() => setRemoveTarget(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Người này sẽ không còn trong phòng, nhưng vẫn có thể vào lại bằng mã phòng khi phòng còn mở.</Text>
        <View style={styles.dialogActions}>
          <AppButton label="Hủy" variant="secondary" onPress={() => setRemoveTarget(null)} colors={colors} style={styles.dialogButton} singleLine />
          <AppButton label="Xóa" variant="danger" onPress={() => { const target = removeTarget; setRemoveTarget(null); if (target) void runWrite('remove', target.userId); }} colors={colors} style={styles.dialogButton} singleLine />
        </View>
      </SheetDialog>
      <SheetDialog visible={confirm !== null} presentation="dialog" showClose={false} title={confirm === 'cancel' ? 'Xác nhận hủy phòng?' : 'Xác nhận rời phòng?'} onClose={() => setConfirm(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>{confirm === 'cancel' ? 'Phòng sẽ đóng với mọi thành viên.' : 'Bạn có thể vào lại bằng mã phòng khi phòng còn mở.'}</Text>
        <View style={styles.dialogActions}>
          <AppButton label="Đóng" variant="secondary" onPress={() => setConfirm(null)} colors={colors} style={styles.dialogButton} />
          <AppButton label={confirm === 'cancel' ? 'Hủy phòng' : 'Rời phòng'} variant="danger" onPress={() => { const action = confirm; setConfirm(null); if (action) void runWrite(action); }} colors={colors} style={styles.dialogButton} />
        </View>
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

function MealCard({ room, canEdit, disabled, onEdit, colors }: { room: RoomSnapshot; canEdit: boolean; disabled: boolean; onEdit: (field: MealField) => void; colors: Colors }) {
  const { textStyle } = useAppFonts();
  const summary = lobbyMealSummary(room);
  const when = summary.scheduled ? `${summary.timeLabel} · ${summary.dayLabel}` : 'Ăn ngay';
  const tiles: { field: MealField; icon: AppIconName; label: string; value: string }[] = [
    { field: 'meal', icon: summary.meal.icon, label: 'Buổi ăn', value: summary.meal.label },
    { field: 'time', icon: summary.scheduled ? 'calendar' : 'lightning', label: 'Thời gian', value: when },
    { field: 'count', icon: 'bowl', label: 'Số món', value: summary.dishCount ? `${summary.dishCount} món` : 'Chưa rõ' },
    { field: 'budget', icon: 'coins', label: 'Ngân sách', value: summary.budgetLabel ?? 'Không giới hạn' },
  ];
  return <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
    <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.text }, textStyle(700)]}>{summary.title}</Text>
    <View style={styles.mealGrid}>
      {tiles.map(tile => <Pressable key={tile.field} accessibilityRole={canEdit ? 'button' : 'text'} accessibilityLabel={`${tile.label}: ${tile.value}${canEdit ? ', chạm để thay đổi' : ''}`}
        disabled={!canEdit || disabled} onPress={() => onEdit(tile.field)}
        style={({ pressed }) => [styles.mealItem, { backgroundColor: pressed ? colors.soft : colors.background, borderColor: colors.line }]}>
        <View style={styles.mealCaptionRow}>
          <AppIcon name={tile.icon} size={14} color={colors.muted} />
          <Text style={[styles.mealCaption, { color: colors.muted }, textStyle(500)]}>{tile.label}</Text>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.mealLabel, { color: colors.text }, textStyle(700)]}>{tile.value}</Text>
      </Pressable>)}
    </View>
  </View>;
}

function PreferencesCard({ room, disabled, onEdit, colors }: { room: RoomSnapshot; disabled: boolean; onEdit: () => void; colors: Colors }) {
  const { textStyle } = useAppFonts();
  const rows = lobbyPreferenceRows(room.ownPreferences);
  return <Pressable accessibilityRole="button" accessibilityLabel="Khẩu vị của bạn, sửa" accessibilityState={{ disabled }} disabled={disabled} onPress={onEdit} style={({ pressed }) => [styles.card, { borderColor: colors.line, backgroundColor: pressed ? colors.soft : colors.surface }]}>
    <View style={styles.cardHeader}>
      <Text style={[styles.cardTitle, { color: colors.text }, textStyle(700)]}>Khẩu vị của bạn</Text>
      {disabled ? null : <View style={styles.editInline}><Text style={[styles.link, { color: colors.text }, textStyle(600)]}>Sửa</Text><AppIcon name="next" size={16} color={colors.text} /></View>}
    </View>
    {rows.length === 0
      ? <View style={styles.anythingRow}>
        <View style={[styles.anythingIcon, { backgroundColor: colors.warm }]}><ChoiceIconView icon={{ food: 'silverware-fork-knife' }} size={20} color={colors.primary} /></View>
        <View style={styles.mealCopy}>
          <Text style={[styles.memberName, { color: colors.text }, textStyle(600)]}>Ăn gì cũng được</Text>
        </View>
      </View>
      : rows.map(row => <View key={row.label} style={styles.prefRow}>
        <Text style={[styles.prefLabel, { color: colors.muted }, textStyle(400)]}>{row.label}</Text>
        <View style={styles.chips}>{row.values.map(value => <View key={value} style={[styles.chip, { backgroundColor: colors.warm, borderColor: colors.line }]}><Text style={[styles.chipText, { color: colors.text }, textStyle(500)]}>{value}</Text></View>)}</View>
      </View>)}
  </Pressable>;
}

function RoomInviteSheet({ visible, onClose, repository, snapshot, busy, colors, onInvite, onFindFriends }: {
  visible: boolean;
  onClose: () => void;
  repository?: LobbyRepository;
  snapshot: RoomSnapshot;
  busy: boolean;
  colors: Colors;
  onInvite: (partnerId: string) => void;
  onFindFriends?: () => void;
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
  return <SheetDialog visible={visible} title="Mời thêm bạn" onClose={() => { if (!busy) close(); }} showClose={false} colors={colors}>
    {loading ? <LoadingState label="Đang tải bạn bè" colors={colors} /> : null}
    {error ? <StatusNotice title="Không tải được bạn bè" message={errorCopy[error as ErrorCode] ?? error} tone="error" actionLabel="Tải lại" onAction={reload} colors={colors} /> : null}
    {!loading && !error && eligible.length === 0 ? <View style={styles.inviteEmpty}>
      <View style={[styles.inviteEmptyIcon, { backgroundColor: colors.warm }]}><AppIcon name={full ? 'friends' : 'inviteUser'} size={28} color={colors.primary} /></View>
      <Text accessibilityRole="header" style={[styles.cardTitle, styles.centerText, { color: colors.text }, textStyle(700)]}>
        {full ? 'Phòng đã đủ 20 người' : friends.length === 0 ? 'Bạn chưa có bạn bè' : 'Bạn bè đều đã ở trong phòng'}
      </Text>
      <Text style={[styles.body, styles.centerText, { color: colors.muted }, textStyle(400)]}>
        {full ? 'Không thể mời thêm người vào phòng này.' : friends.length === 0 ? 'Kết bạn để lần sau mời nhanh hơn. Bạn vẫn có thể chia sẻ mã phòng ở trên.' : 'Chia sẻ mã phòng ở trên để mời thêm người khác.'}
      </Text>
      {!full && friends.length === 0 && onFindFriends ? <AppButton label="Tìm bạn bè" onPress={onFindFriends} colors={colors} /> : null}
    </View> : null}
    {!loading && !error && eligible.length > 0 ? <ScrollView style={styles.inviteList} contentContainerStyle={styles.inviteListContent} showsVerticalScrollIndicator={false}>
      {eligible.map(friend => <View key={friend.id} style={[styles.inviteRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={[styles.avatar, { backgroundColor: colors.soft, borderColor: colors.line }]}>
          <Text style={[styles.avatarText, { color: colors.text }, textStyle(600)]}>{(friend.displayName.trim() || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.memberCopy}>
          <Text numberOfLines={1} style={[styles.memberName, { color: colors.text }, textStyle(600)]}>{friend.displayName}</Text>
          <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{friend.friendCode}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Mời ${friend.displayName}`} accessibilityState={{ disabled: busy || full }} disabled={busy || full}
          onPress={() => { setLoaded(null); onInvite(friend.friendUserId); }}
          style={({ pressed }) => [styles.inviteButton, { backgroundColor: pressed ? colors.soft : colors.primary, opacity: busy || full ? 0.5 : 1 }]}>
          <Text style={[styles.inviteButtonText, { color: colors.onPrimary }, textStyle(600)]}>Mời</Text>
        </Pressable>
      </View>)}
    </ScrollView> : null}
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
  mealGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealItem: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  mealCaptionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealCopy: { flex: 1, minWidth: 0, gap: 2 },
  mealCaption: { fontSize: 12, lineHeight: 16 },
  editInline: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  anythingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  anythingIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inviteList: { maxHeight: 320 },
  inviteListContent: { gap: 8 },
  inviteRow: { minHeight: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteButton: { minHeight: 36, minWidth: 64, borderRadius: 18, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  inviteButtonText: { fontSize: 14, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogButton: { flex: 1 },
  inviteEmpty: { alignItems: 'stretch', gap: 12, paddingVertical: 8 },
  inviteEmptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  centerText: { textAlign: 'center' },
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
  caption: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 14, lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
