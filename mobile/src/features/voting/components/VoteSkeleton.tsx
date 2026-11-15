import { StyleSheet, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { ComponentThemeProps } from '../../../shared/ui';
import { SkeletonBlock } from '../../../shared/ui/feedback/SkeletonBlock';
import { RoundHeader } from './RoundHeader';
import { CONTAINER_GUTTER, CONTAINER_STYLE } from '../../../shared/ui/layout/ScreenContainer';

/**
 * Skeleton of round 1 while the room loads: the same layout as the flashcard deck (title and the two round buttons,
 * progress bar, one big card, the answer buttons), so the screen does not jump when the cards arrive.
 */
export function VoteSkeleton({ label = 'Đang tải phòng bình chọn', colors }: Partial<ComponentThemeProps> & { label?: string }) {
  const theme = useShellTheme().colors;
  const palette = colors ?? theme;
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={styles.root}>
    <RoundHeader title="Vòng 1" colors={palette}>
      <SkeletonBlock width={44} height={44} radius={22} colors={palette} />
      <SkeletonBlock width={44} height={44} radius={22} colors={palette} />
    </RoundHeader>
    <SkeletonBlock width={72} height={16} radius={8} colors={palette} style={styles.progressText} />
    <SkeletonBlock height={6} radius={3} colors={palette} />
    <View style={styles.deck}><SkeletonBlock height={380} radius={24} colors={palette} /></View>
    <View style={styles.answers}>{[0, 1, 2].map(index => <SkeletonBlock key={index} width={64} height={64} radius={32} colors={palette} />)}</View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: CONTAINER_GUTTER, paddingBottom: 24, ...CONTAINER_STYLE },
  progressText: { marginBottom: 8 },
  deck: { flex: 1, justifyContent: 'center' },
  answers: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingTop: 12 },
});
