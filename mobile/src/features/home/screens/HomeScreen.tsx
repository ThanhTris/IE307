import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import type { SessionUser } from '../../../data/api/contracts';
import { useInboxBadge } from '../../../shared/lib/inboxBadge';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { AppBottomNavigation, AppButton, AppHeader, AppIcon, AvatarRow, BrandBanner, FormField, LoadingState, SheetDialog, StatusNotice } from '../../../shared/ui';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { useRead } from '../../rooms/hooks/useRoomEntry';
import { errorCopy, validDisplayName, type RoomEntryReceipt, type RoomEntryRepository } from '../../rooms/services/roomEntry';
import type { SessionIssue, SessionStatus } from '../../rooms/services/sessionState';
import { useHomeRoom } from '../hooks/useHomeRoom';
import { GuestSessionExpiredScreen } from './GuestSessionExpiredScreen';

export type HomeLiveSession = {
  status: SessionStatus;
  issue: SessionIssue;
  user: SessionUser | null;
  isInitializing: boolean;
  ensureSession: (displayName: string) => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<boolean>;
};

export type HomeScreenProps = {
  repository: RoomEntryRepository;
  liveSession: HomeLiveSession;
  activeRoom?: RoomEntryReceipt | null;
  roomRevision?: number;
  onCreate: () => void;
  onJoin: () => void;
  onResume: () => void;
  onFriends?: () => void;
  /** Quick room with one friend: setup opens with that friend invited. */
  onQuickInvite?: (friendUserId: string) => void;
  /** Development builds only: opens the result-screen preview. */
  onDevResult?: () => void;
  onHistory?: () => void;
  onInbox?: () => void;
  onProfile?: () => void;
  onTutorial?: () => void;
};


export function HomeScreen({ repository, liveSession, activeRoom, roomRevision, onCreate, onJoin, onResume, onFriends, onQuickInvite, onDevResult, onHistory, onInbox, onProfile, onTutorial }: HomeScreenProps) {
  const { colors } = useShellTheme();
  const { unread: unreadInbox } = useInboxBadge();
  const { textStyle } = useAppFonts();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const [dismissedExpiry, setDismissedExpiry] = useState<HomeLiveSession>();
  const [panel, setPanel] = useState<string>();
  const [guestDestination, setGuestDestination] = useState<'create' | 'join'>();
  const [guestName, setGuestName] = useState('');
  const [guestError, setGuestError] = useState('');
  const [guestBusy, setGuestBusy] = useState(false);
  const guestLock = useRef(false);
  const sessionUser = liveSession.user;
  const sessionLoading = liveSession.isInitializing;
  const sessionReady = !!sessionUser && !sessionLoading && liveSession.status === 'active' && liveSession.issue === 'none';
  const room = useHomeRoom(repository, activeRoom, sessionUser?.id, sessionReady, roomRevision);
  const loadFriends = useCallback(async () => {
    if (!sessionUser) return { ok: false as const, error: { messageKey: 'AUTH_REQUIRED' as const } };
    return repository.listFriends();
  }, [repository, sessionUser]);
  const friends = useRead(loadFriends, sessionReady && !guestDestination);
  const openFriends = onFriends ?? (() => setPanel('Bạn bè'));
  const openInbox = onInbox ?? (() => setPanel('Thông báo'));
  const openHistory = onHistory ?? (() => setPanel('Lịch sử'));
  const openProfile = onProfile ?? (() => setPanel('Cá nhân'));
  const closeGuestSheet = () => {
    if (guestBusy) return;
    setGuestDestination(undefined);
    setGuestError('');
    setGuestName('');
  };
  const openEntry = (destination: 'create' | 'join') => {
    if (entryDisabled) return;
    if (sessionReady) {
      (destination === 'create' ? onCreate : onJoin)();
      return;
    }
    if (liveSession.issue === 'no-session') {
      setGuestDestination(destination);
      setGuestError('');
    }
  };
  const startGuest = async () => {
    if (guestLock.current) return;
    if (!validDisplayName(guestName)) {
      setGuestError('Tên cần từ 1 đến 24 ký tự.');
      return;
    }
    guestLock.current = true;
    setGuestBusy(true);
    setGuestError('');
    try {
      const ready = await liveSession.ensureSession(guestName.trim());
      if (!ready) {
        setGuestError('Chưa tạo được phiên. Kiểm tra trạng thái bên dưới trước khi thử lại.');
        return;
      }
      const destination = guestDestination;
      setGuestDestination(undefined);
      setGuestName('');
      if (destination === 'create') onCreate();
      else if (destination === 'join') onJoin();
    } catch {
      setGuestError('Chưa tạo được phiên. Hãy kiểm tra kết nối rồi thử lại.');
    } finally {
      guestLock.current = false;
      setGuestBusy(false);
    }
  };
  const sessionNotice = !liveSession.isInitializing && !sessionReady
    ? liveSession.issue === 'no-session'
      ? <StatusNotice title="Chưa có phiên" message="Chọn Tạo phòng hoặc Tham gia phòng để bắt đầu phiên khách bằng tên của bạn." colors={colors} />
      : liveSession.issue === 'session-recovery-required'
        ? <StatusNotice title="Phiên cần khôi phục" message="Máy chủ từ chối phiên hiện tại. Hãy làm mới phiên trước khi tiếp tục; nếu phiên đã bị thu hồi, bạn có thể xóa phiên cục bộ rồi bắt đầu phiên mới." actionLabel="Thử khôi phục phiên" onAction={() => { void liveSession.restoreSession(); }} tone="warning" colors={colors} />
        : liveSession.issue === 'restore-unavailable'
          ? <StatusNotice title="Chưa khôi phục được phiên" message="Thông tin phiên đã lưu được giữ nguyên. Kiểm tra kết nối rồi thử lại." actionLabel="Thử khôi phục phiên" onAction={() => { void liveSession.restoreSession(); }} tone="warning" colors={colors} />
          : liveSession.issue === 'session-revoked' || liveSession.status === 'lost'
            ? <StatusNotice title="Phiên đã hết hạn hoặc bị thu hồi" message="Xóa phiên cũ trên thiết bị trước khi bắt đầu một phiên mới." actionLabel="Xóa phiên cục bộ" onAction={() => { void liveSession.logout(); }} tone="warning" colors={colors} />
            : liveSession.issue === 'storage-unavailable' || liveSession.issue === 'unknown-error'
              ? <StatusNotice title="Không thể kiểm tra phiên đã lưu" message="Không tạo phiên thay thế khi chưa đọc được phiên trên thiết bị. Thử xóa dữ liệu phiên cục bộ rồi bắt đầu lại." actionLabel="Xóa phiên cục bộ" onAction={() => { void liveSession.logout(); }} tone="error" colors={colors} />
              : liveSession.issue === 'signup-uncertain' || liveSession.status === 'blocked'
                ? <StatusNotice title="Chưa xác định được kết quả tạo phiên" message="Để tránh tạo khách trùng, hãy xóa phiên cục bộ trước khi thử lại." actionLabel="Xóa phiên cục bộ" onAction={() => { void liveSession.logout(); }} tone="error" colors={colors} />
                : null
    : null;
  const entryDisabled = sessionLoading
    || (!sessionReady && liveSession.issue !== 'no-session')
    || room.blocksEntry;
  const quickFriends = friends.data ?? [];
  const bottomTabs = [
    { id: 'home', label: 'Trang chủ', icon: 'home' as const, onPress: () => undefined },
    { id: 'friends', label: 'Bạn bè', icon: 'friends' as const, onPress: openFriends },
    { id: 'history', label: 'Lịch sử', icon: 'history' as const, onPress: openHistory },
    { id: 'profile', label: 'Cá nhân', icon: 'profile' as const, onPress: openProfile },
  ];

  if (liveSession.issue === 'session-revoked' && !liveSession.isInitializing && dismissedExpiry !== liveSession) {
    return <GuestSessionExpiredScreen onReset={liveSession.logout} onHome={() => setDismissedExpiry(liveSession)} />;
  }

  return <SafeAreaView edges={['top', 'left', 'right']} style={[homeStyles.root, { backgroundColor: colors.background }]}>
    <AppHeader colors={colors} onInbox={openInbox} inboxBadge={unreadInbox} showFriends={false} showInbox showProfile={false} allowTitleWrap hideDivider brandTextStyle={textStyle(700)} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={homeStyles.content}>
      {sessionNotice}
      {room.loading ? <StatusNotice title="Đang kiểm tra phòng đã lưu…" colors={colors} /> : null}
      {room.active && room.data ? <StatusNotice title={`Phòng #${room.data.code}`} message="Bạn có thể tiếp tục phiên hiện tại." actionLabel="Tiếp tục phiên" onAction={onResume} colors={colors} /> : null}
      {room.error ? <StatusNotice title={room.unavailable ? 'Không thể tiếp tục phòng đã lưu' : 'Chưa kiểm tra được phòng đã lưu'} message={errorCopy[room.error]} actionLabel={room.unavailable ? undefined : 'Kiểm tra lại phòng'} onAction={room.unavailable ? undefined : room.retry} tone="warning" colors={colors} /> : null}
      {room.data && !room.active ? <StatusNotice title={room.data.state === 'EXPIRED' ? 'Phòng đã hết hạn' : 'Phòng đã kết thúc'} message="Bạn có thể tạo hoặc tham gia một phòng khác." colors={colors} /> : null}

      <View style={homeStyles.intro}>
        <Text accessibilityRole="header" style={[homeStyles.title, { color: colors.text }, textStyle(700)]}>{'Hôm nay\ncả nhóm ăn gì?'}</Text>
      </View>

      <BrandBanner colors={colors} titleTextStyle={textStyle(700)} illustrationSource={require('../../../../assets/brand/home/friends-dining-slot.png')} />

      <View style={homeStyles.entryGroup}>
      <View style={homeStyles.actions}>
        <AppButton
          label="Tạo phòng"
          onPress={() => openEntry('create')}
          disabled={entryDisabled}
          icon="plus"
          iconSize={32}
          iconTintColor={colors.onPrimary}
          iconLayout="stacked"
          textStyle={{ fontSize: 18, lineHeight: 25, minHeight: 25, ...textStyle(700) }}
          style={[homeStyles.actionTile, fontScale > 1.3 && homeStyles.scaledTile, { borderColor: colors.green }]}
          colors={colors}
        />
        <AppButton
          label="Tham gia phòng"
          variant="secondary"
          onPress={() => openEntry('join')}
          disabled={entryDisabled}
          icon="join"
          iconSize={32}
          iconTintColor={colors.text}
          iconLayout="stacked"
          textStyle={{ fontSize: 18, lineHeight: 25, minHeight: 25, ...textStyle(700) }}
          style={[homeStyles.actionTile, fontScale > 1.3 && homeStyles.scaledTile, { borderColor: colors.line }]}
          colors={colors}
        />
      </View>
      </View>

      <View style={[homeStyles.quickCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={homeStyles.quickHeading}>
          <AppIcon name="lightning" size={16} color={colors.text} />
          <Text style={[homeStyles.quickTitle, { color: colors.text }, textStyle(700)]}>KÈO NHANH VỚI BẠN THÂN</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tất cả bạn bè" onPress={openFriends} style={homeStyles.allFriends}>
            <Text style={[homeStyles.allFriendsText, { color: colors.text }, textStyle(500)]}>{friends.data ? `Tất cả (${quickFriends.length}) ›` : 'Tất cả ›'}</Text>
          </Pressable>
        </View>
        {friends.loading ? <LoadingState label="Đang tải bạn bè" colors={colors} /> : null}
        {friends.error ? <StatusNotice title="Chưa tải được bạn bè" message={errorCopy[friends.error]} actionLabel="Tải lại bạn bè" onAction={friends.retry} tone="error" colors={colors} /> : null}
        {friends.data && sessionReady && quickFriends.length === 0 ? <Text style={[homeStyles.emptyFriends, { color: colors.muted }, textStyle(400)]}>Mời bạn để bắt đầu kèo nhanh.</Text> : null}
        {sessionReady && !friends.loading && !friends.error ? <AvatarRow items={quickFriends.slice(0, 4).map(friend => ({ id: friend.friendUserId, label: friend.displayName }))} onAdd={openFriends} onSelect={onQuickInvite} labelTextStyle={textStyle(600)} colors={colors} /> : null}
      </View>

      {onDevResult ? <Pressable accessibilityRole="button" onPress={onDevResult} style={homeStyles.devLink}><Text style={[homeStyles.devLinkText, { color: colors.muted }, textStyle(500)]}>Xem thử giao diện kết quả (chỉ bản dev)</Text></Pressable> : null}

      {sessionLoading ? <StatusNotice title="Đang khôi phục phiên…" colors={colors} /> : null}
    </ScrollView>
    <AppBottomNavigation items={bottomTabs} activeId="home" bottomInset={insets.bottom} allowLabelWrap labelTextStyle={textStyle(500)} colors={colors} />
    <SheetDialog visible={!!guestDestination} title={guestDestination === 'join' ? 'Bắt đầu phiên để vào phòng' : 'Bắt đầu phiên khách'} onClose={closeGuestSheet} colors={colors}>
      <Text style={[homeStyles.dialogBody, { color: colors.text }, textStyle(500)]}>Nhập tên hiển thị để bắt đầu phiên khách trên thiết bị này.</Text>
      <FormField label="Tên khách" value={guestName} onChangeText={value => { setGuestName(value); setGuestError(''); }} editable={!guestBusy} placeholder="Mọi người gọi bạn là…" helperText="Tên hiển thị · 1–24 ký tự" colors={colors} />
      {guestError ? <ToastNotice title={guestError} tone="error" /> : null}
      <AppButton label={guestDestination === 'join' ? 'Tạo phiên rồi nhập mã' : 'Tạo phiên rồi tạo phòng'} onPress={() => { void startGuest(); }} loading={guestBusy} colors={colors} />
      {(liveSession.issue === 'signup-uncertain' || liveSession.issue === 'storage-unavailable' || liveSession.issue === 'unknown-error' || liveSession.status === 'blocked')
        ? <AppButton label="Xóa phiên cục bộ rồi thử lại" variant="danger" disabled={guestBusy} onPress={() => { void liveSession.logout(); setGuestError(''); }} colors={colors} />
        : null}
    </SheetDialog>
    <SheetDialog visible={!!panel} title={panel ?? 'Thông tin'} onClose={() => setPanel(undefined)} colors={colors}>
      <Text style={[homeStyles.dialogBody, { color: colors.text }, textStyle(500)]}>Tính năng này đang được hoàn thiện.</Text>
      {panel === 'Cá nhân' && onTutorial ? <AppButton label="Xem lại hướng dẫn" onPress={() => { setPanel(undefined); onTutorial(); }} colors={colors} /> : null}
    </SheetDialog>
  </SafeAreaView>;
}


const homeStyles = StyleSheet.create({
  devLink: { alignItems: 'center', paddingVertical: 12 },
  devLinkText: { fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
  root: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xxl, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.xxl, width: '100%', maxWidth: 480, alignSelf: 'center' },
  modeLabel: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, fontSize: 12, lineHeight: 18 },
  intro: { gap: spacing.sm },
  title: { fontSize: 36, lineHeight: 44, fontWeight: '700' },
  entryGroup: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.lg, alignItems: 'stretch' },
  actionTile: { flex: 1, minWidth: 0, aspectRatio: 1, minHeight: 0, borderRadius: radii.xl, padding: spacing.md },
  scaledTile: { aspectRatio: undefined, minHeight: 174 },
  quickCard: { borderWidth: 1.5, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.lg },
  quickHeading: { minHeight: 48, marginVertical: -15, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  quickTitle: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  allFriends: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
  allFriendsText: { fontSize: 12, lineHeight: 18 },
  emptyFriends: { ...typography.body },
  dialogBody: { ...typography.body },
});
