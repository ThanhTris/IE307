import { StyleSheet, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { SkeletonBlock, StatusNotice } from '../../../shared/ui';
import type { ResultReadState } from '../services/resultPresentation';

/** Waiting for the result renders a skeleton of the result screen; problems go out as a toast with a retry button. */
export function ResultReadNotice({ state, onRetry }: { state: ResultReadState; onRetry: () => void }) {
  const { colors } = useShellTheme();
  const pending = state === 'loading' || state === 'finalizing';
  const title = state === 'finalizing' ? 'Đang chốt kết quả' : state === 'loading' ? 'Đang tải kết quả' : state === 'unknown' ? 'Chưa xác nhận kết quả' : 'Chưa tải được kết quả';
  if (pending) return <View accessibilityRole="progressbar" accessibilityLabel={title} accessibilityLiveRegion="polite" style={styles.skeleton}>
    <SkeletonBlock width="60%" height={24} style={styles.center} colors={colors} />
    <SkeletonBlock width={180} height={180} radius={90} style={styles.center} colors={colors} />
    <SkeletonBlock width="70%" height={20} style={styles.center} colors={colors} />
    <View style={styles.row}>{[0, 1].map(index => <SkeletonBlock key={index} width="48%" height={96} radius={16} colors={colors} />)}</View>
    <SkeletonBlock height={160} radius={16} colors={colors} />
  </View>;
  return <View style={styles.retry}>
    <StatusNotice title={title} message="Kết quả của nhóm vẫn được giữ. Hãy thử tải lại để xem thông tin đã xác nhận." tone="error" actionLabel="Thử lại" onAction={onRetry} colors={colors} />
  </View>;
}
const styles = StyleSheet.create({
  skeleton: { gap: 20, paddingVertical: 24 },
  center: { alignSelf: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  retry: { flexGrow: 1, justifyContent: 'center', paddingVertical: 48, gap: 16 },
});
