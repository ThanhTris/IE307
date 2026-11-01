import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export function WaitingSummary({
  acknowledged,
  total,
  deadlineLabel,
  statusLabel,
  colors,
}: ComponentThemeProps & {
  acknowledged: number;
  total: number;
  deadlineLabel: string;
  statusLabel?: string;
}) {
  const safeTotal = Math.max(total, 0);
  const safeAcknowledged = Math.min(safeTotal, Math.max(0, acknowledged));
  const progress = safeTotal ? Math.round((safeAcknowledged / safeTotal) * 100) : 0;
  return (
    <View
      accessibilityRole="summary"
      style={[styles.waitingSummary, { backgroundColor: colors?.surface, borderColor: colors?.line }]}
    >
      <Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>
        Đang chờ nhóm
      </Text>
      <Text style={[styles.body, { color: colors?.text }]}>
        {statusLabel ?? `${safeAcknowledged}/${safeTotal} thành viên đã gửi`}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Tiến độ thành viên đã gửi"
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={[styles.progressTrack, { backgroundColor: colors?.soft }]}
      >
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors?.primary }]} />
      </View>
      <Text style={[styles.helper, { color: colors?.muted }]}>Hạn gửi: {deadlineLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  waitingSummary: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  contextTitle: { ...typography.titleMedium },
  body: { ...typography.body },
  progressTrack: { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: radii.pill },
  helper: { ...typography.caption },
});
