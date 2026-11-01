import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type PodiumDish = {
  id: string;
  name: string;
  rank: 1 | 2 | 3;
  scoreLabel?: string;
  winner?: boolean;
};

export function ResultPodium({ dishes, colors }: ComponentThemeProps & { dishes: PodiumDish[] }) {
  const podium = dishes.filter(dish => dish.rank >= 1 && dish.rank <= 3);
  return (
    <ScrollView
      horizontal
      accessibilityRole="summary"
      accessibilityLabel="Bảng xếp hạng món ăn"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.podium}
    >
      {podium.map(dish => (
        <View
          key={dish.id}
          style={[
            styles.podiumColumn,
            styles[`podiumRank${dish.rank}`],
            {
              backgroundColor: colors?.surface,
              borderColor: dish.winner ? colors?.primary : colors?.line,
            },
          ]}
        >
          <Text style={[styles.podiumRank, { color: colors?.primary }]}>{dish.rank}</Text>
          <Text numberOfLines={3} style={[styles.podiumName, { color: colors?.text }]}>
            {dish.name}
          </Text>
          {dish.scoreLabel ? <Text style={[styles.helper, { color: colors?.muted }]}>{dish.scoreLabel}</Text> : null}
          {dish.winner ? <Text style={[styles.winnerBadge, { color: colors?.primary }]}>Chiến thắng</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  podiumColumn: {
    width: 144,
    flexShrink: 0,
    padding: spacing.sm,
    borderWidth: 1,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  podiumRank1: { minHeight: 192 },
  podiumRank2: { minHeight: 160 },
  podiumRank3: { minHeight: 128 },
  podiumRank: { ...typography.titleLarge },
  podiumName: { ...typography.bodyBold, textAlign: 'center', flexShrink: 1 },
  helper: { ...typography.caption },
  winnerBadge: { ...typography.caption, textAlign: 'center' },
});
