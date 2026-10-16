import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppHeader, AvatarRow, FormField, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useRead } from '../../rooms/hooks/useRoomEntry';
import { EntryError, EntrySection, MockLabel, PreviewTools, entryStyles, type PreviewControlsProps } from '../../rooms/components/RoomEntryFrame';
import { errorCopy, validDisplayName, type RoomEntryReceipt, type RoomEntryRepository } from '../../rooms/services/roomEntry';
import type { SessionIssue, SessionStatus } from '../../rooms/services/sessionState';
import type { SessionUser } from '../../../data/api/contracts';

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
  onInbox?: () => void;
  onProfile?: () => void;
};

export function Gm25HomeScreen({ repository, sessionToken, liveSession, activeRoom, onCreate, onJoin, onResume, onOpenFoundation, onOpenRoomSetup, onOpenGm24, onFriends, onInbox, onProfile, previewControls }: Gm25HomeScreenProps) {
  const { colors } = useShellTheme();
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
  const openFriends = onFriends ?? (() => setPanel('Bạn ăn cùng'));
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
      ? <StatusNotice title="Chưa có phiên" message="Chọn Tạo kèo ăn hoặc Tôi có mã phòng để bắt đầu phiên khách bằng tên của bạn." colors={colors} />
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
  return <SafeAreaView style={[entryStyles.root, { backgroundColor: colors.background }]}>
    <AppHeader colors={colors} onFriends={openFriends} onInbox={onInbox ?? (() => setPanel('Thông báo'))} onProfile={onProfile ?? (() => setPanel('Hồ sơ'))} />
    <ScrollView contentContainerStyle={entryStyles.content}>
      {!liveSession ? <MockLabel /> : null}
      {sessionNotice}
      {activeRoom ? <StatusNotice title={`Phòng mẫu #${activeRoom.code}`} message="Bạn đã nhận xác nhận tạo/vào phòng. Chưa có lobby hay trạng thái nhóm thật." actionLabel="Quay lại phòng mô phỏng" onAction={onResume} colors={colors} /> : null}
      <View style={[entryStyles.hero, { backgroundColor: colors.warm, borderColor: colors.border }]}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={entryStyles.heroArt}>
          <View style={[entryStyles.plate, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text allowFontScaling={false} style={entryStyles.foodEmoji}>🍜</Text>
          </View>
          <View style={[entryStyles.artCaption, { backgroundColor: colors.surface }]}>
            <Text style={[entryStyles.caption, { color: colors.text }]}>Cùng chọn nha ✓</Text>
          </View>
        </View>
        <View style={entryStyles.section}>
          {sessionUser ? <Text style={[entryStyles.body, { color: colors.muted }]}>{`Chào ${sessionUser.displayName}! 👋`}</Text> : null}
          <Text accessibilityRole="header" style={[entryStyles.title, { color: colors.text }]}>{'Đói rồi,\nmình ăn gì đây?'}</Text>
          <Text style={[entryStyles.body, { color: colors.muted }]}>Chọn một món. Vui cả nhóm.</Text>
          {sessionUser ? <Text style={[entryStyles.caption, { color: colors.muted }]}>{sessionUser.isGuest ? (liveSession ? 'Phiên khách' : 'Khách · phiên mô phỏng') : liveSession ? 'Phiên tài khoản' : 'Phiên mô phỏng'}</Text> : null}
        </View>
        {sessionLoading ? <StatusNotice title={liveSession ? 'Đang khôi phục phiên…' : 'Đang khôi phục phiên mẫu…'} colors={colors} /> : null}
        {!liveSession && previewSession.error ? <EntryError code={previewSession.error} onRetry={previewSession.retry} /> : null}
        <View style={entryStyles.section}>
          <AppButton label="＋ Tạo kèo ăn" onPress={() => openEntry('create')} disabled={sessionLoading || (!sessionUser && !!liveSession && liveSession.issue !== 'no-session') || (!liveSession && (!!previewSession.error || previewSession.loading)) || !!activeRoom} colors={colors} />
          <AppButton label="Tôi có mã phòng" variant="secondary" onPress={() => openEntry('join')} disabled={sessionLoading || (!sessionUser && !!liveSession && liveSession.issue !== 'no-session') || (!liveSession && (!!previewSession.error || previewSession.loading)) || !!activeRoom} colors={colors} />
        </View>
      </View>
      <EntrySection title="Bạn ăn cùng" description="Một bữa ngon bắt đầu từ những người quen.">
        {friends.loading ? <StatusNotice title="Đang tải bạn ăn cùng…" colors={colors} /> : null}
        {friends.error ? <StatusNotice title="Chưa tải được bạn ăn cùng" message={errorCopy[friends.error]} actionLabel="Tải lại bạn ăn cùng" onAction={friends.retry} colors={colors} /> : null}
        {friends.data?.length ? <AvatarRow items={friends.data.slice(0, 5).map(friend => ({ id: friend.id, label: friend.displayName }))} onAdd={onFriends ?? (() => setPanel('Thêm bạn'))} colors={colors} /> : sessionUser && friends.data ? <StatusNotice title="Chưa có bạn ăn cùng" message="Bạn vẫn có thể tạo phòng và gửi mã cho nhóm." colors={colors} /> : null}
        <AppButton label="Xem tất cả bạn ăn cùng" variant="quiet" onPress={openFriends} colors={colors} />
      </EntrySection>
      <View style={entryStyles.section}>
        <Text style={[entryStyles.body, { color: colors.text }]}>Điểm ăn chung, không chia sẻ GPS</Text>
        <Text style={[entryStyles.body, { color: colors.muted }]}>Chọn một điểm công cộng để cả nhóm dễ hẹn nhau. Bạn luôn có thể chọn bằng tay.</Text>
      </View>
      {previewControls || onOpenFoundation || onOpenRoomSetup || onOpenGm24 ? <PreviewTools>
        {previewControls?.(false)}
        {onOpenFoundation ? <AppButton label="Xem cấu trúc ứng dụng" variant="quiet" onPress={onOpenFoundation} colors={colors} /> : null}
        {onOpenRoomSetup ? <AppButton label="Chọn điểm ăn và khẩu vị" variant="quiet" onPress={onOpenRoomSetup} colors={colors} /> : null}
        {onOpenGm24 ? <AppButton label="Mở vị trí và bối cảnh GM-24" variant="quiet" onPress={onOpenGm24} colors={colors} /> : null}
      </PreviewTools> : null}
    </ScrollView>
    {liveSession ? <SheetDialog visible={!!guestDestination} title={guestDestination === 'join' ? 'Bắt đầu phiên để vào phòng' : 'Bắt đầu phiên khách'} onClose={closeGuestSheet} colors={colors}>
      <Text style={[entryStyles.body, { color: colors.text }]}>Nhập tên hiển thị. Phiên sẽ được lưu trước khi tải điểm ăn hoặc mở yêu cầu phòng.</Text>
      <FormField label="Tên khách" value={guestName} onChangeText={value => { setGuestName(value); setGuestError(''); }} editable={!guestBusy} placeholder="Mọi người gọi bạn là…" helperText="Tên hiển thị · 1–24 ký tự" colors={colors} />
      {guestError ? <Text accessibilityRole="alert" style={[entryStyles.body, { color: colors.danger }]}>{guestError}</Text> : null}
      <AppButton label={guestDestination === 'join' ? 'Tạo phiên rồi nhập mã' : 'Tạo phiên rồi chọn bối cảnh'} onPress={() => { void startGuest(); }} loading={guestBusy} colors={colors} />
      {(liveSession.issue === 'signup-uncertain' || liveSession.issue === 'storage-unavailable' || liveSession.issue === 'unknown-error' || liveSession.status === 'blocked')
        ? <AppButton label="Xóa phiên cục bộ rồi thử lại" variant="danger" disabled={guestBusy} onPress={() => { void liveSession.logout(); setGuestError(''); }} colors={colors} />
        : null}
    </SheetDialog> : null}
    <SheetDialog visible={!!panel} title={panel ?? 'Thông tin'} onClose={() => setPanel(undefined)} colors={colors}>
      <Text style={[entryStyles.body, { color: colors.text }]}>Tính năng này đang được hoàn thiện. Bản mô phỏng chưa gửi lời mời, thông báo hoặc thay đổi hồ sơ.</Text>
    </SheetDialog>
  </SafeAreaView>;
}
