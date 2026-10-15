import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppHeader, AvatarRow, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useRead } from '../../rooms/hooks/useRoomEntry';
import { EntryError, EntrySection, MockLabel, PreviewTools, entryStyles, type PreviewControlsProps } from '../../rooms/components/RoomEntryFrame';
import type { RoomEntryReceipt, RoomEntryRepository } from '../../rooms/services/roomEntry';
import type { Friend, ReadResult, SessionUser } from '../../../data/api/contracts';

type Props = PreviewControlsProps & {
  repository: RoomEntryRepository;
  sessionToken: string;
  activeRoom?: RoomEntryReceipt | null;
  onCreate: () => void;
  onJoin: () => void;
  onResume: () => void;
  onOpenFoundation: () => void;
};

export function HomeScreen({ repository, sessionToken, activeRoom, onCreate, onJoin, onResume, onOpenFoundation, previewControls }: Props) {
  const { colors } = useShellTheme();
  const [panel, setPanel] = useState<string>();
  const load = useCallback(async (): Promise<ReadResult<{ user: SessionUser; friends: Friend[] }>> => {
    const user = await repository.restoreSession(sessionToken);
    if (!user.ok) return user;
    const friends = await repository.listFriends();
    if (!friends.ok) return friends;
    return { ok: true, data: { user: user.data, friends: friends.data } };
  }, [repository, sessionToken]);
  const state = useRead(load);
  return <SafeAreaView style={[entryStyles.root, { backgroundColor: colors.background }]}>
    <AppHeader colors={colors} onPressBrand={() => undefined} onFriends={() => setPanel('Bạn ăn cùng')} onInbox={() => setPanel('Thông báo')} onProfile={() => setPanel('Hồ sơ')} />
    <ScrollView contentContainerStyle={entryStyles.content}>
      <MockLabel />
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
          {state.data ? <Text style={[entryStyles.body, { color: colors.muted }]}>{`Chào ${state.data.user.displayName}! 👋`}</Text> : null}
          <Text accessibilityRole="header" style={[entryStyles.title, { color: colors.text }]}>{'Đói rồi,\nmình ăn gì đây?'}</Text>
          <Text style={[entryStyles.body, { color: colors.muted }]}>Chọn một món. Vui cả nhóm.</Text>
          {state.data ? <Text style={[entryStyles.caption, { color: colors.muted }]}>{state.data.user.isGuest ? 'Khách · phiên mô phỏng' : 'Phiên mô phỏng'}</Text> : null}
        </View>
        {state.loading ? <StatusNotice title="Đang khôi phục phiên mẫu…" colors={colors} /> : null}
        {state.error ? <EntryError code={state.error} onRetry={state.retry} /> : null}
        <View style={entryStyles.section}>
          <AppButton label="＋ Tạo kèo ăn" onPress={onCreate} disabled={state.loading || !!state.error || !!activeRoom} colors={colors} />
          <AppButton label="Tôi có mã phòng" variant="secondary" onPress={onJoin} disabled={state.loading || !!state.error || !!activeRoom} colors={colors} />
        </View>
      </View>
      {activeRoom ? <StatusNotice title={`Phòng mẫu #${activeRoom.code}`} message="Bạn đã nhận xác nhận tạo/vào phòng. Chưa có lobby hay trạng thái nhóm thật." actionLabel="Quay lại phòng mô phỏng" onAction={onResume} colors={colors} /> : null}
      <EntrySection title="Bạn ăn cùng" description="Một bữa ngon bắt đầu từ những người quen.">
        {state.data?.friends.length ? <AvatarRow items={state.data.friends.slice(0, 5).map(friend => ({ id: friend.id, label: friend.displayName }))} onAdd={() => setPanel('Thêm bạn')} colors={colors} /> : !state.loading && !state.error ? <StatusNotice title="Chưa có bạn ăn cùng" message="Bạn vẫn có thể tạo phòng và gửi mã cho nhóm." colors={colors} /> : null}
        <AppButton label="Xem tất cả bạn ăn cùng" variant="quiet" onPress={() => setPanel('Bạn ăn cùng')} colors={colors} />
      </EntrySection>
      <View style={entryStyles.section}>
        <Text style={[entryStyles.body, { color: colors.text }]}>Điểm ăn chung, không chia sẻ GPS</Text>
        <Text style={[entryStyles.body, { color: colors.muted }]}>Chọn một điểm công cộng để cả nhóm dễ hẹn nhau. Bạn luôn có thể chọn bằng tay.</Text>
      </View>
      <PreviewTools>
        {previewControls?.(false)}
        <AppButton label="Xem cấu trúc ứng dụng" variant="quiet" onPress={onOpenFoundation} colors={colors} />
      </PreviewTools>
    </ScrollView>
    <SheetDialog visible={!!panel} title={panel ?? 'Thông tin'} onClose={() => setPanel(undefined)} colors={colors}>
      <Text style={[entryStyles.body, { color: colors.text }]}>Đây là điểm điều hướng dành cho task tiếp theo. GM-09 chỉ hiển thị preview; chưa gửi lời mời hay sửa hồ sơ thật.</Text>
    </SheetDialog>
  </SafeAreaView>;
}
