import { Image, StyleSheet, Text, View } from 'react-native';
import type { ErrorCode } from '../../../data/api/contracts';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import { errorCopy } from '../services/roomEntry';

export function JoinEntryProblem({ code, error, busy, onRetry, onEdit, onHome }: { code: string; error: ErrorCode; busy: boolean; onRetry: () => void; onEdit: () => void; onHome: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const full = error === 'ROOM_FULL', expired = error === 'ROOM_EXPIRED';
  return <>
    <View accessibilityLiveRegion="polite" style={styles.message}>
      <View style={[styles.symbol, { backgroundColor: colors.warm, borderColor: colors.line }]}>
        {full || expired ? <Image accessible={false} source={full ? require('../../../../assets/brand/icons/friends.png') : require('../../../../assets/brand/entry-ui/hourglass.png')} resizeMode="contain" style={[styles.icon, { tintColor: colors.text }]} /> : <Text style={[styles.exclamation, { color: colors.text }, textStyle(700)]}>!</Text>}
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>{full ? 'Phòng đã đủ 20 người' : expired ? 'Phòng đã hết hạn' : 'Không thể kiểm tra phòng'}</Text>
      <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>{full ? 'Bạn chưa thể tham gia phòng này.' : expired ? 'Xin mã phòng mới từ người tạo phòng.' : errorCopy[error]}</Text>
      {!expired ? <View style={[styles.codeCard, { borderColor: colors.line }]}><Text selectable style={[styles.body, { color: colors.text }, textStyle(600)]}>{code}</Text></View> : null}
    </View>
    <View style={styles.spacer} />
    <View style={styles.actions}>
      <AppButton label={expired ? 'Nhập mã khác' : full ? 'Kiểm tra lại' : 'Thử lại'} loading={busy} onPress={expired ? onEdit : onRetry} colors={colors} />
      <AppButton label={expired ? 'Về trang chủ' : 'Sửa mã phòng'} variant="secondary" disabled={busy} onPress={expired ? onHome : onEdit} colors={colors} />
    </View>
  </>;
}
const styles = StyleSheet.create({
  message: { alignItems: 'center', paddingTop: 100, gap: 24 }, symbol: { width: 92, height: 92, borderRadius: 46, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  icon: { width: 40, height: 40 }, exclamation: { fontSize: 56, lineHeight: 68 }, title: { fontSize: 25, lineHeight: 32, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' }, codeCard: { borderWidth: 1, borderRadius: 12, padding: 16, alignSelf: 'stretch' },
  spacer: { flexGrow: 1, minHeight: 32 }, actions: { gap: 16 },
});
