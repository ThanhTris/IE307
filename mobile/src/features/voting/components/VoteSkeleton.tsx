import { StyleSheet, View } from 'react-native';
import type { ComponentThemeProps } from '../../../shared/ui';
import { SkeletonBlock } from '../../../shared/ui/feedback/SkeletonBlock';

/** Skeleton of a voting round (progress, dish card, vote buttons) while the room snapshot loads. */
export function VoteSkeleton({ label, colors }: ComponentThemeProps & { label: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.root}>
    <SkeletonBlock width="45%" height={18} colors={colors} />
    <SkeletonBlock height={8} radius={4} colors={colors} />
    <SkeletonBlock height={320} radius={24} colors={colors} />
    <View style={styles.row}>{[0, 1, 2].map(index => <SkeletonBlock key={index} width="31%" height={52} radius={16} colors={colors} />)}</View>
  </View>;
}

const styles = StyleSheet.create({
  root: { padding: 20, gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
