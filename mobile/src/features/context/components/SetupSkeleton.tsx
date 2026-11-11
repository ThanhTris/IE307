import { StyleSheet, View } from 'react-native';
import type { ComponentThemeProps } from '../../../shared/ui';
import { SkeletonBlock } from '../../../shared/ui/feedback/SkeletonBlock';

/** Skeleton of the room-setup form shown while the first read is in flight. */
export function SetupSkeleton({ colors, label = 'Đang tải' }: ComponentThemeProps & { label?: string }) {
  const section = (chips: number, chipHeight: number) => <View style={styles.section}>
    <SkeletonBlock width="38%" height={18} colors={colors} />
    <View style={styles.grid}>{Array.from({ length: chips }, (_, index) => <SkeletonBlock key={index} width="30%" height={chipHeight} radius={16} colors={colors} />)}</View>
  </View>;
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.root}>
    {section(3, 84)}
    <View style={styles.section}><SkeletonBlock width="30%" height={18} colors={colors} /><SkeletonBlock height={52} radius={16} colors={colors} /></View>
    <View style={styles.section}><SkeletonBlock width="52%" height={18} colors={colors} /><SkeletonBlock height={52} radius={16} colors={colors} /></View>
    {section(3, 52)}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 24 },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
