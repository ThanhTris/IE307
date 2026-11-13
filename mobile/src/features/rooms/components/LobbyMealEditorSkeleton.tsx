import { StyleSheet, View } from 'react-native';
import type { ComponentThemeProps } from '../../../shared/ui';
import { SkeletonBlock } from '../../../shared/ui/feedback/SkeletonBlock';
import type { MealField } from './LobbyMealEditor';

/** Skeleton that mirrors the layout of the one field being edited, so loading and loaded states line up. */
export function LobbyMealEditorSkeleton({ field, colors }: ComponentThemeProps & { field: MealField }) {
  const tiles = (height: number) => <View style={styles.grid}>
    {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} width="48%" height={height} radius={12} colors={colors} style={styles.tile} />)}
  </View>;
  return <View accessibilityRole="progressbar" accessibilityLabel="Đang tải" accessibilityLiveRegion="polite" style={styles.root}>
    {field === 'meal' ? tiles(76) : null}
    {field === 'budget' ? tiles(52) : null}
    {field === 'time' ? <>
      <SkeletonBlock height={50} radius={12} colors={colors} />
      <SkeletonBlock width="60%" height={14} colors={colors} />
    </> : null}
    {field === 'count' ? <>
      <View style={styles.counter}>
        <SkeletonBlock width={48} height={48} radius={24} colors={colors} />
        <SkeletonBlock width={72} height={32} colors={colors} />
        <SkeletonBlock width={48} height={48} radius={24} colors={colors} />
      </View>
      <SkeletonBlock height={52} radius={16} colors={colors} />
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1 },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
