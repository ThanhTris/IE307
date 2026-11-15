import { StyleSheet, Text, View } from 'react-native';
import type { ErrorCode } from '../../../data/api/contracts';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, type AppIconName } from '../../../shared/ui';
import { errorCopy } from '../services/roomEntry';

/** Only these can change on their own, so only these get a retry button. */
const RETRYABLE: ErrorCode[] = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'UNKNOWN_ERROR', 'ROOM_FULL', 'INVALID_ROOM_STATE'];

function copyFor(error: ErrorCode): { title: string; body: string; icon: AppIconName } {
  if (error === 'ROOM_FULL') return { title: 'Phòng đã đủ 20 người', body: 'Bạn chưa thể tham gia phòng này.', icon: 'friends' };
  if (error === 'ROOM_EXPIRED') return { title: 'Phòng đã hết hạn', body: 'Xin mã phòng mới từ người tạo phòng.', icon: 'hourglass' };
  if (error === 'ROOM_TERMINAL') return { title: 'Phòng đã kết thúc', body: 'Phòng này không còn nhận thành viên.', icon: 'close' };
  if (error === 'NETWORK_ERROR' || error === 'TIMEOUT') return { title: 'Chưa kết nối được', body: errorCopy[error], icon: 'warning' };
  return { title: 'Không vào được phòng', body: errorCopy[error], icon: 'warning' };
}

export function JoinEntryProblem({ code, error, busy, onRetry, onEdit, onHome }: { code: string; error: ErrorCode; busy: boolean; onRetry: () => void; onEdit: () => void; onHome: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const copy = copyFor(error);
  const retryable = RETRYABLE.includes(error);
  return <>
    <View accessibilityLiveRegion="polite" style={styles.message}>
      <View style={[styles.symbol, { backgroundColor: colors.warm }]}><AppIcon name={copy.icon} size={32} color={colors.text} /></View>
      <Text accessibilityRole="header" numberOfLines={2} style={[styles.title, { color: colors.text }, textStyle(700)]}>{copy.title}</Text>
      <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>{copy.body}</Text>
      {code ? <View style={[styles.codePill, { backgroundColor: colors.soft }]}>
        <Text style={[styles.codeLabel, { color: colors.muted }, textStyle(400)]}>Mã phòng</Text>
        <Text selectable style={[styles.codeValue, { color: colors.text }, textStyle(700)]}>{code}</Text>
      </View> : null}
    </View>
    <View style={styles.spacer} />
    <View style={styles.actions}>
      {retryable
        ? <AppButton label={error === 'ROOM_FULL' ? 'Kiểm tra lại' : 'Thử lại'} loading={busy} onPress={onRetry} colors={colors} singleLine />
        : null}
      <AppButton label="Nhập mã khác" variant={retryable ? 'secondary' : 'primary'} disabled={busy} onPress={onEdit} colors={colors} singleLine />
      {retryable ? null : <AppButton label="Về trang chủ" variant="quiet" disabled={busy} onPress={onHome} colors={colors} singleLine />}
    </View>
  </>;
}

const styles = StyleSheet.create({
  message: { alignItems: 'center', paddingTop: 64, gap: 12 },
  symbol: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, lineHeight: 30, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 300 },
  codePill: { flexDirection: 'row', alignItems: 'baseline', gap: 8, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  codeLabel: { fontSize: 13, lineHeight: 18 },
  codeValue: { fontSize: 16, lineHeight: 22, letterSpacing: 2 },
  spacer: { flexGrow: 1, minHeight: 32 },
  actions: { gap: 12 },
});
