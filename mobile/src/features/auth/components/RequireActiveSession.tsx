import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { AppButton, AppHeader, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

export function RequireActiveSession({ children, onHome }: { children: ReactNode; onHome: () => void }) {
  const live = useRoomRepository();
  const { colors } = useShellTheme();
  const [busy, setBusy] = useState(false);

  if (live.mode !== 'real' || (live.status === 'active' && live.user)) return children;

  const retryRestore = async () => {
    setBusy(true);
    try { await live.restoreSession(); } finally { setBusy(false); }
  };

  let title = 'Chưa có phiên';
  let message = 'Về màn hình chính để khôi phục hoặc bắt đầu phiên khách trước khi mở phòng.';
  let retryLabel: string | undefined;
  let retryAction: (() => void) | undefined;
  if (live.isInitializing) {
    title = 'Đang khôi phục phiên…';
    message = 'Chờ xác nhận danh tính trước khi tải dữ liệu phòng.';
  } else if (live.issue === 'restore-unavailable') {
    title = 'Chưa khôi phục được phiên';
    message = 'Kiểm tra kết nối rồi thử lại. Thông tin phiên đã lưu được giữ nguyên.';
    retryLabel = 'Thử khôi phục lại';
    retryAction = () => { void retryRestore(); };
  } else if (live.issue === 'session-revoked' || live.status === 'lost') {
    title = 'Phiên đã hết hạn hoặc bị thu hồi';
    message = 'Về màn hình chính để xóa phiên cũ trước khi bắt đầu phiên mới.';
  } else if (live.issue === 'signup-uncertain' || live.issue === 'storage-unavailable' || live.status === 'blocked') {
    title = 'Phiên cần được xử lý';
    message = 'Về màn hình chính để chủ động xóa phiên cục bộ rồi thử lại.';
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <AppHeader title="Gì Cũng Được" onPressBrand={onHome} colors={colors} />
    <View style={{ flex: 1, padding: 20, gap: 16, justifyContent: 'center' }}>
      <StatusNotice title={title} message={message} tone={live.issue === 'restore-unavailable' || live.status === 'blocked' ? 'warning' : 'info'} actionLabel={retryLabel} onAction={retryAction} colors={colors} />
      {live.issue === 'signup-uncertain' || live.issue === 'storage-unavailable' || live.status === 'blocked'
        ? <Text style={{ color: colors.muted }}>Xóa cục bộ sẽ ngắt danh tính hiện tại trên thiết bị này.</Text>
        : null}
      <AppButton label="Về màn hình chính" onPress={onHome} disabled={busy} colors={colors} />
    </View>
  </SafeAreaView>;
}
