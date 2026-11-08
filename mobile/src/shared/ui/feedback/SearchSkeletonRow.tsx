import { StyleSheet, View } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export function SearchSkeletonRow({
  label = 'Đang tải danh sách',
  colors,
}: ComponentThemeProps & { label?: string }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.skeletonRow, { backgroundColor: colors?.surface, borderColor: colors?.line }]}
    >
      <View style={[styles.skeletonAvatar, { backgroundColor: colors?.soft }]} />
      <View style={styles.skeletonCopy}>
        <View style={[styles.skeletonLine, styles.skeletonLineWide, { backgroundColor: colors?.soft }]} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort, { backgroundColor: colors?.soft }]} />
      </View>
      <View style={[styles.skeletonAction, { backgroundColor: colors?.soft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonRow: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonAvatar: { width: 44, height: 44, borderRadius: radii.pill },
  skeletonCopy: { flex: 1, gap: spacing.sm },
  skeletonLine: { height: 10, borderRadius: radii.pill },
  skeletonLineWide: { width: '76%' },
  skeletonLineShort: { width: '48%' },
  skeletonAction: { width: 56, height: 36, borderRadius: radii.md },
});
