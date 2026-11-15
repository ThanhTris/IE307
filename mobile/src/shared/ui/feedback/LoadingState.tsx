import { StyleSheet, View } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import { SkeletonBlock } from './SkeletonBlock';

/** Skeleton screen for content that waits on the API; the label is read by screen readers only. */
export function LoadingState({ label = 'Đang tải', rows = 3, colors }: ComponentThemeProps & { label?: string; rows?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.row, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
          <SkeletonBlock width={44} height={44} radius={radii.pill} colors={colors} />
          <View style={styles.copy}>
            <SkeletonBlock width="76%" height={12} colors={colors} />
            <SkeletonBlock width="48%" height={10} colors={colors} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { minHeight: 72, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: spacing.sm },
});
