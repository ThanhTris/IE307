import { StyleSheet, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { ComponentThemeProps } from '../../../shared/ui';
import { SkeletonBlock } from '../../../shared/ui/feedback/SkeletonBlock';
import { RoundHeader } from './RoundHeader';
import { CONTAINER_GUTTER, CONTAINER_STYLE } from '../../../shared/ui/layout/ScreenContainer';

/** Skeleton of round 2 while the room loads: title, removal counter and bar, a list of dish rows and the send button. */
export function RoundTwoSkeleton({ label = 'Đang tải Vòng 2', colors }: Partial<ComponentThemeProps> & { label?: string }) {
  const theme = useShellTheme().colors;
  const palette = colors ?? theme;
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.root}>
    <RoundHeader title="Vòng 2" colors={palette}>
      <SkeletonBlock width={44} height={44} radius={22} colors={palette} />
    </RoundHeader>
    <View style={styles.summary}>
      <SkeletonBlock width={110} height={16} radius={8} colors={palette} />
      <SkeletonBlock width={56} height={16} radius={8} colors={palette} />
    </View>
    <SkeletonBlock height={6} radius={3} colors={palette} />
    <View style={styles.list}>{[0, 1, 2, 3, 4].map(index => <SkeletonBlock key={index} height={64} radius={16} colors={palette} />)}</View>
    <SkeletonBlock height={52} radius={16} colors={palette} style={styles.button} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: CONTAINER_GUTTER, paddingBottom: 24, ...CONTAINER_STYLE },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  list: { flex: 1, gap: 12, paddingVertical: 16 },
  button: { marginTop: 8 },
});
