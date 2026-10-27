import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import type { SessionUser } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppBottomNavigation, AppButton, AppHeader, AvatarRow, BrandBanner, FormField, SheetDialog, StatusNotice } from '../../../shared/ui';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { useRead } from '../../rooms/hooks/useRoomEntry';
import { EntryError, PreviewTools, type PreviewControlsProps } from '../../rooms/components/RoomEntryFrame';
import { errorCopy, validDisplayName, type RoomEntryReceipt, type RoomEntryRepository } from '../../rooms/services/roomEntry';
import type { SessionIssue, SessionStatus } from '../../rooms/services/sessionState';

export type HomeLiveSession = {
  status: SessionStatus;
  issue: SessionIssue;
  user: SessionUser | null;
  isInitializing: boolean;
  ensureSession: (displayName: string) => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<boolean>;
};

export type Gm25HomeScreenProps = PreviewControlsProps & {
  repository: RoomEntryRepository;
  sessionToken?: string;
  liveSession?: HomeLiveSession;
  activeRoom?: RoomEntryReceipt | null;
  onCreate: () => void;
  onJoin: () => void;
  onResume: () => void;
  onOpenFoundation?: () => void;
  onOpenRoomSetup?: () => void;
  onOpenGm24?: () => void;
  onFriends?: () => void;
  onHistory?: () => void;
  onInbox?: () => void;
  onProfile?: () => void;
};

export function Gm25HomeScreen({ repository, sessionToken, liveSession, activeRoom, onCreate, onJoin, onResume, onOpenFoundation, onOpenRoomSetup, onOpenGm24, onFriends, onHistory, onInbox, onProfile, previewControls }: Gm25HomeScreenProps) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  const insets = useSafeAreaInsets();
  const [panel, setPanel] = useState<string>();
  const [guestDestination, setGuestDestination] = useState<'create' | 'join'>();
  const [guestName, setGuestName] = useState('');
  const [guestError, setGuestError] = useState('');
  const [guestBusy, setGuestBusy] = useState(false);
  const guestLock = useRef(false);
  const loadSession = useCallback(() => repository.restoreSession(sessionToken as string), [repository, sessionToken]);
  const previewSession = useRead(loadSession, !liveSession);
  const sessionUser = liveSession ? liveSession.user : previewSession.data;
  const sessionLoading = liveSession ? liveSession.isInitializing : previewSession.loading;
  const loadFriends = useCallback(async () => {
    if (!sessionUser) return { ok: false as const, error: { messageKey: 'AUTH_REQUIRED' as const } };
    return repository.listFriends();
  }, [repository, sessionUser]);
  const friends = useRead(loadFriends, !!sessionUser && !guestDestination);
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
    if (!liveSession || sessionUser) {
      (destination === 'create' ? onCreate : onJoin)();
      return;
    }
    if (liveSession.issue === 'no-session') {
      setGuestDestination(destination);
      setGuestError('');
    }
  };
  const startGuest = async () => {
    if (!liveSession || guestLock.current) return;
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
  const sessionNotice = liveSession && !liveSession.isInitializing && !sessionUser
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
    || (!sessionUser && !!liveSession && liveSession.issue !== 'no-session')
    || (!liveSession && (!!previewSession.error || previewSession.loading))
    || !!activeRoom;
  const quickFriends = friends.data ?? [];
  const bottomTabs = [
    { id: 'home', label: 'Trang chủ', iconSource: require('../../../../assets/brand/icons/home.png'), onPress: () => undefined },
    { id: 'friends', label: 'Bạn bè', iconSource: require('../../../../assets/brand/icons/friends.png'), onPress: openFriends },
    { id: 'history', label: 'Lịch sử', iconSource: require('../../../../assets/brand/icons/history.png'), onPress: openHistory },
    { id: 'profile', label: 'Cá nhân', iconSource: require('../../../../assets/brand/icons/profile.png'), onPress: openProfile },
  ];

  return <SafeAreaView edges={['top', 'left', 'right']} style={[homeStyles.root, { backgroundColor: colors.background }]}>
    <AppHeader colors={colors} onInbox={openInbox} showFriends={false} showInbox showProfile={false} brandTextStyle={textStyle(700)} />
    <ScrollView contentContainerStyle={homeStyles.content}>
      {!liveSession ? <Text style={[homeStyles.modeLabel, { color: colors.muted, backgroundColor: colors.soft }, textStyle(500)]}>Mô phỏng · GM-09 · dữ liệu mẫu</Text> : null}
      {sessionNotice}
      {activeRoom ? <StatusNotice title={`Phòng mẫu #${activeRoom.code}`} message="Bạn đã nhận xác nhận tạo/vào phòng. Chưa có lobby hay trạng thái nhóm thật." actionLabel="Quay lại phòng mô phỏng" onAction={onResume} colors={colors} /> : null}

      <View style={homeStyles.intro}>
        <Text accessibilityRole="header" style={[homeStyles.title, { color: colors.text }, textStyle(700)]}>{'Hôm nay\ncả nhóm ăn gì?'}</Text>
        <Text style={[homeStyles.lead, { color: colors.text }, textStyle(400)]}>Chọn món hợp ý, cùng nhau đi ăn.</Text>
      </View>

      <BrandBanner colors={colors} titleTextStyle={textStyle(700)} />

      <View style={homeStyles.actions}>
        <AppButton
          label="Tạo phòng"
          onPress={() => openEntry('create')}
          disabled={entryDisabled}
          iconSource={require('../../../../assets/brand/icons/plus.png')}
          iconTintColor={colors.onPrimary}
          iconLayout="stacked"
          textStyle={textStyle(600)}
          style={[homeStyles.actionTile, { borderColor: colors.green }]}
          colors={colors}
        />
        <AppButton
          label="Tham gia phòng"
          variant="secondary"
          onPress={() => openEntry('join')}
          disabled={entryDisabled}
          iconSource={require('../../../../assets/brand/icons/enter.png')}
          iconTintColor={colors.text}
          iconLayout="stacked"
          textStyle={textStyle(600)}
          style={[homeStyles.actionTile, { borderColor: colors.line }]}
          colors={colors}
        />
      </View>
      <Text style={[homeStyles.actionHint, { color: colors.text }, textStyle(400)]}>Vào bằng mã phòng hoặc quét QR</Text>

      <View style={[homeStyles.quickCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={homeStyles.quickHeading}>
          <Image source={require('../../../../assets/brand/icons/lightning.png')} accessible={false} resizeMode="contain" style={[homeStyles.lightning, { tintColor: colors.text }]} />
          <Text numberOfLines={1} style={[homeStyles.quickTitle, { color: colors.text }, textStyle(700)]}>KÈO NHANH VỚI BẠN THÂN</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tất cả bạn bè" onPress={openFriends} style={homeStyles.allFriends}>
            <Text style={[homeStyles.allFriendsText, { color: colors.text }, textStyle(500)]}>{`Tất cả (${quickFriends.length}) ›`}</Text>
          </Pressable>
        </View>
        {friends.loading ? <StatusNotice title="Đang tải bạn bè…" colors={colors} /> : null}
        {friends.error ? <StatusNotice title="Chưa tải được bạn bè" message={errorCopy[friends.error]} actionLabel="Tải lại bạn bè" onAction={friends.retry} tone="error" colors={colors} /> : null}
        {!friends.loading && !friends.error && sessionUser && quickFriends.length === 0 ? <Text style={[homeStyles.emptyFriends, { color: colors.muted }, textStyle(400)]}>Mời bạn để bắt đầu kèo nhanh.</Text> : null}
        {quickFriends.length > 0 ? <AvatarRow items={quickFriends.slice(0, 4).map(friend => ({ id: friend.id, label: friend.displayName }))} onAdd={openFriends} labelTextStyle={textStyle(600)} colors={colors} /> : null}
        {quickFriends.length === 0 ? <AvatarRow items={[]} onAdd={openFriends} labelTextStyle={textStyle(600)} colors={colors} /> : null}
      </View>

      {sessionLoading ? <StatusNotice title={liveSession ? 'Đang khôi phục phiên…' : 'Đang khôi phục phiên mẫu…'} colors={colors} /> : null}
      {!liveSession && previewSession.error ? <EntryError code={previewSession.error} onRetry={previewSession.retry} /> : null}
      {previewControls || onOpenFoundation || onOpenRoomSetup || onOpenGm24 ? <PreviewTools>
        {previewControls?.(false)}
        {onOpenFoundation ? <AppButton label="Xem cấu trúc ứng dụng" variant="quiet" onPress={onOpenFoundation} colors={colors} /> : null}
        {onOpenRoomSetup ? <AppButton label="Chọn điểm ăn và khẩu vị" variant="quiet" onPress={onOpenRoomSetup} colors={colors} /> : null}
        {onOpenGm24 ? <AppButton label="Mở vị trí và bối cảnh GM-24" variant="quiet" onPress={onOpenGm24} colors={colors} /> : null}
      </PreviewTools> : null}
    </ScrollView>
    <AppBottomNavigation items={bottomTabs} activeId="home" bottomInset={insets.bottom} labelTextStyle={textStyle(500)} colors={colors} />
    {liveSession ? <SheetDialog visible={!!guestDestination} title={guestDestination === 'join' ? 'Bắt đầu phiên để vào phòng' : 'Bắt đầu phiên khách'} onClose={closeGuestSheet} colors={colors}>
      <Text style={[homeStyles.dialogBody, { color: colors.text }, textStyle(500)]}>Nhập tên hiển thị. Phiên sẽ được lưu trước khi tải điểm ăn hoặc mở yêu cầu phòng.</Text>
      <FormField label="Tên khách" value={guestName} onChangeText={value => { setGuestName(value); setGuestError(''); }} editable={!guestBusy} placeholder="Mọi người gọi bạn là…" helperText="Tên hiển thị · 1–24 ký tự" colors={colors} />
      {guestError ? <Text accessibilityRole="alert" style={[homeStyles.dialogBody, { color: colors.danger }]}>{guestError}</Text> : null}
      <AppButton label={guestDestination === 'join' ? 'Tạo phiên rồi nhập mã' : 'Tạo phiên rồi chọn bối cảnh'} onPress={() => { void startGuest(); }} loading={guestBusy} colors={colors} />
      {(liveSession.issue === 'signup-uncertain' || liveSession.issue === 'storage-unavailable' || liveSession.issue === 'unknown-error' || liveSession.status === 'blocked')
        ? <AppButton label="Xóa phiên cục bộ rồi thử lại" variant="danger" disabled={guestBusy} onPress={() => { void liveSession.logout(); setGuestError(''); }} colors={colors} />
        : null}
    </SheetDialog> : null}
    <SheetDialog visible={!!panel} title={panel ?? 'Thông tin'} onClose={() => setPanel(undefined)} colors={colors}>
      <Text style={[homeStyles.dialogBody, { color: colors.text }, textStyle(500)]}>Tính năng này đang được hoàn thiện. Bản mô phỏng chưa gửi lời mời, thông báo hoặc thay đổi hồ sơ.</Text>
    </SheetDialog>
  </SafeAreaView>;
}

const homeStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.xxl, paddingBottom: spacing.xxl, gap: spacing.xxl, width: '100%', maxWidth: 480, alignSelf: 'center' },
  modeLabel: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, fontSize: 12, lineHeight: 18 },
  intro: { gap: spacing.xs },
  title: { fontSize: 44, lineHeight: 53, fontWeight: '700' },
  lead: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionTile: { flex: 1, aspectRatio: 1, minHeight: 0, borderRadius: radii.xl, padding: spacing.md },
  actionHint: { marginTop: -spacing.xl, marginBottom: -spacing.sm, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  quickCard: { borderWidth: 1.5, borderRadius: radii.xl, padding: spacing.md, gap: spacing.md },
  quickHeading: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  lightning: { width: 16, height: 16 },
  quickTitle: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  allFriends: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.xs },
  allFriendsText: { fontSize: 12, lineHeight: 18 },
  emptyFriends: { ...typography.body },
  dialogBody: { ...typography.body },
});
