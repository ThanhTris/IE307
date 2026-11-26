import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { AppButton, AppHeader, AppIcon } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { spacing, typography } from '../../../shared/theme/tokens';

/**
 * `loading`: what to show while the session is being restored. A screen with its own skeleton passes it, so the person never
 * sees the home-style header and a "restoring" notice in between.
 */
export function RequireActiveSession({ children, onHome, onSignIn, loading }: {
  children: ReactNode; onHome: () => void; onSignIn?: () => void; loading?: ReactNode;
}) {
  const live = useRoomRepository();
  const { colors } = useShellTheme();
  const [busy, setBusy] = useState(false);

  if (live.status === 'active' && live.user) return children;
  if (loading && live.isInitializing) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>{loading}</SafeAreaView>;

  const retryRestore = async () => {
    setBusy(true);
    try { await live.restoreSession(); } finally { setBusy(false); }
  };
  const resetAndLeave = async (target: () => void) => {
    setBusy(true);
    try { await live.logout(); } finally { setBusy(false); target(); }
  };

  const isAccount = live.user?.isGuest === false || live.lastKnownGuest === false;
  let title = 'Chưa có phiên';
  let message = 'Về màn hình chính để bắt đầu phiên làm việc trước khi mở phòng.';
  let primaryLabel: string | undefined;
  let primaryAction: (() => void) | undefined;
  if (live.isInitializing) {
    title = 'Đang khôi phục phiên…';
    message = 'Chờ xác nhận danh tính trước khi tải dữ liệu phòng.';
  } else if (live.issue === 'session-recovery-required') {
    title = 'Phiên cần kết nối lại';
    message = 'Máy chủ chưa xác nhận phiên hiện tại. Thử kết nối lại để tiếp tục.';
    primaryLabel = 'Thử lại';
    primaryAction = () => { void retryRestore(); };
  } else if (live.issue === 'restore-unavailable') {
    title = 'Chưa kết nối được máy chủ';
    message = 'Thông tin của bạn vẫn được giữ trên máy. Kiểm tra mạng rồi thử lại.';
    primaryLabel = 'Thử lại';
    primaryAction = () => { void retryRestore(); };
  } else if (live.issue === 'session-revoked' || live.status === 'lost') {
    title = 'Phiên đăng nhập đã hết hạn';
    message = isAccount && onSignIn
      ? 'Đăng nhập lại để tiếp tục sử dụng phòng và dữ liệu của bạn.'
      : 'Về trang chủ để bắt đầu lại.';
    if (isAccount && onSignIn) {
      primaryLabel = 'Đăng nhập lại';
      primaryAction = () => { void resetAndLeave(onSignIn); };
    }
  } else if (live.issue === 'signup-uncertain' || live.issue === 'storage-unavailable' || live.status === 'blocked') {
    title = 'Cần làm mới phiên làm việc';
    message = 'Phiên trước chưa hoàn tất. Bắt đầu lại để tiếp tục.';
    primaryLabel = 'Bắt đầu lại';
    primaryAction = () => { void resetAndLeave(isAccount && onSignIn ? onSignIn : onHome); };
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <AppHeader title="Gì Cũng Được" onPressBrand={onHome} colors={colors} />
    <View style={styles.body}>
      <View style={[styles.badge, { backgroundColor: colors.warm }]}>
        <AppIcon name={live.isInitializing ? 'hourglass' : 'warning'} size={28} color={live.isInitializing ? colors.primary : colors.warning} />
      </View>
      <Text accessibilityRole="header" style={[typography.titleMedium, styles.center, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.body, styles.center, styles.message, { color: colors.muted }]}>{message}</Text>
      <View style={styles.actions}>
        {primaryLabel && primaryAction ? <AppButton label={primaryLabel} loading={busy} onPress={primaryAction} colors={colors} /> : null}
        <AppButton label="Về trang chủ" variant={primaryLabel ? 'secondary' : 'primary'} onPress={onHome} disabled={busy} colors={colors} />
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.xl, gap: spacing.md, justifyContent: 'center', alignItems: 'center' },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  center: { textAlign: 'center' },
  message: { maxWidth: 320 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
});
