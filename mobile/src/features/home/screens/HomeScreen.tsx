import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppHeader, AvatarRow, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useRead } from '../../rooms/hooks/useRoomEntry';
import { EntryError, EntrySection, MockLabel, PreviewTools, entryStyles, type PreviewControlsProps } from '../../rooms/components/RoomEntryFrame';
import { errorCopy, type RoomEntryReceipt, type RoomEntryRepository } from '../../rooms/services/roomEntry';

export type HomeScreenProps = PreviewControlsProps & {
  repository: RoomEntryRepository;
  sessionToken?: string;
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

export function HomeScreen({ repository, sessionToken, activeRoom, onCreate, onJoin, onResume, onOpenFoundation, onOpenRoomSetup, onOpenGm24, onFriends, onInbox, onProfile, previewControls }: HomeScreenProps) {
  const { colors } = useShellTheme();
  const [panel, setPanel] = useState<string>();
  const loadSession = useCallback(() => repository.restoreSession(sessionToken as string), [repository, sessionToken]);
  const session = useRead(loadSession);
  const loadFriends = useCallback(async () => {
    if (!session.data) return { ok: false as const, error: { messageKey: 'AUTH_REQUIRED' as const } };
    return repository.listFriends();
  }, [repository, session.data]);
  const friends = useRead(loadFriends, !!session.data);
  const openFriends = onFriends ?? (() => setPanel('Bạn ăn cùng'));
  return <SafeAreaView style={[entryStyles.root, { backgroundColor: colors.background }]}>
    <AppHeader colors={colors} onFriends={openFriends} onInbox={onInbox ?? (() => setPanel('Thông báo'))} onProfile={onProfile ?? (() => setPanel('Hồ sơ'))} />
    <ScrollView contentContainerStyle={entryStyles.content}>
      <MockLabel />
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
          {session.data ? <Text style={[entryStyles.body, { color: colors.muted }]}>{`Chào ${session.data.displayName}! 👋`}</Text> : null}
          <Text accessibilityRole="header" style={[entryStyles.title, { color: colors.text }]}>{'Đói rồi,\nmình ăn gì đây?'}</Text>
          <Text style={[entryStyles.body, { color: colors.muted }]}>Chọn một món. Vui cả nhóm.</Text>
          {session.data ? <Text style={[entryStyles.caption, { color: colors.muted }]}>{session.data.isGuest ? 'Khách · phiên mô phỏng' : 'Phiên mô phỏng'}</Text> : null}
        </View>
        {session.loading ? <StatusNotice title="Đang khôi phục phiên mẫu…" colors={colors} /> : null}
        {session.error ? <EntryError code={session.error} onRetry={session.retry} /> : null}
        <View style={entryStyles.section}>
          <AppButton label="＋ Tạo kèo ăn" onPress={onCreate} disabled={session.loading || !!session.error || !!activeRoom} colors={colors} />
          <AppButton label="Tôi có mã phòng" variant="secondary" onPress={onJoin} disabled={session.loading || !!session.error || !!activeRoom} colors={colors} />
        </View>
      </View>
      <EntrySection title="Bạn ăn cùng" description="Một bữa ngon bắt đầu từ những người quen.">
        {friends.loading ? <StatusNotice title="Đang tải bạn ăn cùng…" colors={colors} /> : null}
        {friends.error ? <StatusNotice title="Chưa tải được bạn ăn cùng" message={errorCopy[friends.error]} actionLabel="Tải lại bạn ăn cùng" onAction={friends.retry} colors={colors} /> : null}
        {friends.data?.length ? <AvatarRow items={friends.data.slice(0, 5).map(friend => ({ id: friend.id, label: friend.displayName }))} onAdd={onFriends ?? (() => setPanel('Thêm bạn'))} colors={colors} /> : session.data && friends.data ? <StatusNotice title="Chưa có bạn ăn cùng" message="Bạn vẫn có thể tạo phòng và gửi mã cho nhóm." colors={colors} /> : null}
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
    <SheetDialog visible={!!panel} title={panel ?? 'Thông tin'} onClose={() => setPanel(undefined)} colors={colors}>
      <Text style={[entryStyles.body, { color: colors.text }]}>Tính năng này đang được hoàn thiện. Bản mô phỏng chưa gửi lời mời, thông báo hoặc thay đổi hồ sơ.</Text>
    </SheetDialog>
  </SafeAreaView>;
}
