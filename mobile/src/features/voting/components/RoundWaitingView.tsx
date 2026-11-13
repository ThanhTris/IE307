import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton, AppIcon, WaitingSummary, type Palette } from '../../../shared/ui';
import { CountdownRing } from './CountdownRing';

/** Shown after the ballot is sent: who has voted, the 60 s window, and the host's early finish. */
export function RoundWaitingView({ pending, waiting, needsRoundTwo, countdown, acknowledged, total, isHost, canFinish, onFinish, onRoundTwo, colors }: {
  pending: boolean; waiting: boolean; needsRoundTwo: boolean; countdown?: number | null;
  acknowledged: number; total: number; isHost: boolean; canFinish: boolean;
  onFinish?: () => void; onRoundTwo?: () => void; colors: Palette;
}) {
  return <View style={styles.root}>
    {waiting && !pending
      ? <CountdownRing seconds={countdown ?? null} colors={colors} />
      : <View style={[styles.badge, { backgroundColor: colors.warm }]}>
        {pending ? <ActivityIndicator color={colors.primary} /> : <AppIcon name={needsRoundTwo ? 'next' : 'hourglass'} size={30} color={colors.primary} />}
      </View>}
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
      {pending ? 'Đang gửi phiếu…' : needsRoundTwo && !waiting ? 'Sang vòng 2' : 'Đã gửi phiếu'}
    </Text>
    <Text style={[styles.body, { color: colors.muted }]}>
      {pending
        ? 'Giữ ứng dụng mở trong giây lát.'
        : needsRoundTwo && !waiting
          ? 'Nhóm chưa chốt được món ở vòng 1. Cùng chọn lọc ở vòng 2 nhé.'
          : 'Đang chờ các thành viên khác chọn xong.'}
    </Text>
    {waiting && !pending ? <>
      <View style={styles.summary}>
        <WaitingSummary acknowledged={acknowledged} total={total}
          statusLabel={`${acknowledged}/${total} thành viên đã gửi phiếu`} colors={colors} />
      </View>
      {isHost && onFinish ? <AppButton label={canFinish ? 'Chốt ngay' : `Chốt ngay (${acknowledged}/${total})`} disabled={!canFinish} onPress={onFinish} colors={colors} style={styles.button} /> : null}
    </> : null}
    {needsRoundTwo && !waiting && onRoundTwo ? <AppButton label="Vào vòng 2" onPress={onRoundTwo} colors={colors} style={styles.button} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontFamily: 'InterBold', fontSize: 22, lineHeight: 30, textAlign: 'center' },
  body: { fontFamily: 'InterRegular', fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  summary: { alignSelf: 'stretch', marginTop: 8 },
  hint: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 4 },
});
