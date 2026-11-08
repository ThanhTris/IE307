import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import type { ResultReadState } from '../services/resultPresentation';

export function ResultReadNotice({ state, onRetry }: { state: ResultReadState; onRetry: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const pending = state === 'loading' || state === 'finalizing';
  const title = state === 'finalizing' ? 'Đang chốt kết quả' : state === 'loading' ? 'Đang tải kết quả' : state === 'unknown' ? 'Chưa xác nhận kết quả' : 'Chưa tải được kết quả';
  return <View style={styles.center}><View accessibilityLiveRegion="polite" style={[styles.card, { borderColor: colors.line }]}>
    {pending ? <ActivityIndicator size="large" color={colors.primary} accessibilityLabel={title} /> : null}
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>{title}</Text>
    {!pending ? <><Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Kết quả của nhóm vẫn được giữ. Hãy thử tải lại để xem thông tin đã xác nhận.</Text><AppButton label="Thử lại" onPress={onRetry} colors={colors} /></> : null}
  </View></View>;
}
const styles = StyleSheet.create({ center: { flexGrow: 1, justifyContent: 'center', paddingVertical: 48 }, card: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 20 }, title: { fontSize: 20, lineHeight: 28, textAlign: 'center' }, body: { fontSize: 15, lineHeight: 23, textAlign: 'center' } });
