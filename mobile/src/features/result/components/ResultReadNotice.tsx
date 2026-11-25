import { StyleSheet, View } from 'react-native';
import type { ErrorCode } from '../../../data/api/contracts';
import { describeError, shouldOfferHelp } from '../../../shared/errors/describeError';
import { useHelp } from '../../../shared/help/HelpContext';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { ErrorRecovery, SkeletonBlock } from '../../../shared/ui';
import type { ResultReadState } from '../services/resultPresentation';

/** Waiting for the result renders a skeleton; failures keep a calm centered empty-error state with progressive help. */
export function ResultReadNotice({ state, errorCode, retryCount = 0, onRetry }: {
  state: ResultReadState;
  errorCode?: ErrorCode;
  retryCount?: number;
  onRetry: () => void;
}) {
  const { colors } = useShellTheme();
  const help = useHelp();
  const pending = state === 'loading' || state === 'finalizing';
  const title = state === 'finalizing' ? 'Đang chốt kết quả' : state === 'loading' ? 'Đang tải kết quả' : state === 'unknown' ? 'Chưa xác nhận kết quả' : 'Chưa tải được kết quả';
  if (pending) return <View accessibilityRole="progressbar" accessibilityLabel={title} accessibilityLiveRegion="polite" style={styles.skeleton}>
    <SkeletonBlock width="60%" height={24} style={styles.center} colors={colors} />
    <SkeletonBlock width={180} height={180} radius={90} style={styles.center} colors={colors} />
    <SkeletonBlock width="70%" height={20} style={styles.center} colors={colors} />
    <View style={styles.row}>{[0, 1].map(index => <SkeletonBlock key={index} width="48%" height={96} radius={16} colors={colors} />)}</View>
    <SkeletonBlock height={160} radius={16} colors={colors} />
  </View>;
  const detail = errorCode ? describeError({ messageKey: errorCode }).message : undefined;
  const offerHelp = Boolean(help && errorCode && shouldOfferHelp(errorCode, retryCount + 1));
  return <View style={styles.retry}>
    <ErrorRecovery
      variant="empty"
      icon={state === 'unknown' ? 'hourglass' : 'warning'}
      heading={title}
      title={title}
      message={detail ?? 'Kết quả của nhóm vẫn được giữ. Hãy thử tải lại.'}
      note={detail ?? 'Kết quả của nhóm vẫn được giữ. Hãy thử tải lại để xem thông tin đã xác nhận.'}
      actionLabel="Thử lại"
      onAction={onRetry}
      onHelp={offerHelp && errorCode ? () => help?.open({ errorCode, screen: 'room/result', action: 'get_result', occurredAt: new Date().toISOString() }) : undefined}
      colors={colors}
    />
  </View>;
}
const styles = StyleSheet.create({
  skeleton: { gap: 20, paddingVertical: 24 },
  center: { alignSelf: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  retry: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, gap: 16 },
});
