import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography, type ThemeColors } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type ContextSummaryProps = ComponentThemeProps & {
  anchorName: string;
  mealLabel: string;
  desiredAtLabel: string;
  radiusLabel: string;
  serviceModeLabel?: string;
};

export function ContextSummary({
  anchorName,
  mealLabel,
  desiredAtLabel,
  radiusLabel,
  serviceModeLabel,
  colors,
}: ContextSummaryProps) {
  return (
    <View style={[styles.contextCard, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
      <Text style={[styles.caption, { color: colors?.muted }]}>BỐI CẢNH PHÒNG</Text>
      <Text style={[styles.contextTitle, { color: colors?.text }]}>{anchorName}</Text>
      <View style={styles.contextGrid}>
        <ContextValue label="Bữa" value={mealLabel} colors={colors} />
        <ContextValue label="Thời gian" value={desiredAtLabel} colors={colors} />
        <ContextValue label="Bán kính" value={radiusLabel} colors={colors} />
        {serviceModeLabel ? <ContextValue label="Hình thức" value={serviceModeLabel} colors={colors} /> : null}
      </View>
    </View>
  );
}

function ContextValue({ label, value, colors }: { label: string; value: string; colors?: ThemeColors }) {
  return (
    <View style={styles.contextValue}>
      <Text style={[styles.helper, { color: colors?.muted }]}>{label}</Text>
      <Text style={[styles.contextValueText, { color: colors?.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contextCard: { padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, gap: spacing.sm },
  caption: { ...typography.caption },
  contextTitle: { ...typography.titleMedium },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  contextValue: { minWidth: 84, gap: spacing.xs },
  contextValueText: { ...typography.bodyBold },
  helper: { ...typography.caption },
});
