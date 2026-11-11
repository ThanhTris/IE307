import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { lightColors, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import type { PodiumDish } from './ResultPodium';
import { ResultDishArtwork } from './ResultDishArtwork';
import RankOneBase from '../../../../assets/brand/result/rank-1-base.svg';
import RankOneLaurel from '../../../../assets/brand/result/rank-1-laurel.svg';
import RankTwoBase from '../../../../assets/brand/result/rank-2-base.svg';
import RankTwoLaurel from '../../../../assets/brand/result/rank-2-laurel.svg';
import RankThreeBase from '../../../../assets/brand/result/rank-3-base.svg';
import RankThreeLaurel from '../../../../assets/brand/result/rank-3-laurel.svg';

const artworkWidth = 112;
const rankArt = {
  1: { Base: RankOneBase, Laurel: RankOneLaurel, height: 146 },
  2: { Base: RankTwoBase, Laurel: RankTwoLaurel, height: 112 },
  3: { Base: RankThreeBase, Laurel: RankThreeLaurel, height: 92 },
};

/** Dishes with the same server rank share one pedestal and retain their order. */
export function ResultPodiumGraphic({ dishes, colors = lightColors }: ComponentThemeProps & { dishes: PodiumDish[] }) {
  const { width, fontScale } = useWindowDimensions();
  const layoutKey = JSON.stringify([width, fontScale, dishes.map(item => [item.id, item.rank, item.name, item.imageAttribution])]);
  const [measured, setMeasured] = useState({ key: layoutKey, name: 0, attribution: 0 });
  const heights = measured.key === layoutKey ? measured : { name: 0, attribution: 0 };
  const measure = (slot: 'name' | 'attribution', height: number) => {
    const rounded = Math.ceil(height);
    setMeasured(previous => {
      const current = previous.key === layoutKey ? previous : { key: layoutKey, name: 0, attribution: 0 };
      return rounded > current[slot] ? { ...current, [slot]: rounded } : current;
    });
  };
  const byRank = new Map<PodiumDish['rank'], PodiumDish[]>();
  for (const dish of dishes) {
    const group = byRank.get(dish.rank);
    if (group) group.push(dish);
    else byRank.set(dish.rank, [dish]);
  }
  // Empty slots keep rank 1 centered at the same width in every result.
  const podiumOrder = [2, 1, 3] as const;
  const contentWidth = Math.min(width, 480) - 2 * spacing.xxl;
  const columnWidth = Math.min(artworkWidth, contentWidth / 3);
  const columnScale = columnWidth / artworkWidth;
  const heightScale = Math.max(columnScale, fontScale * 0.8);
  const hasAttribution = dishes.some(dish => dish.imageAttribution);
  return <View style={styles.group}>
    <View accessibilityLabel="Bảng xếp hạng món ăn" style={[styles.row, { borderBottomColor: colors?.line }]}>
      {podiumOrder.map(rank => {
        const group = byRank.get(rank);
        const rankedDishes = group ?? [];
        const compact = rankedDishes.length > 1;
        const dishWidth = compact ? Math.floor((columnWidth - spacing.xs) / 2) : columnWidth;
        const imageSize = compact || rank === 1 ? dishWidth : 96 * columnScale;
        const dishRows = rankedDishes.length === 3 ? [rankedDishes.slice(0, 1), rankedDishes.slice(1)] : [rankedDishes];
        return (
          <View key={rank} testID={`podium-slot-${rank}`} style={{ width: columnWidth }}>
            <View
              testID={`podium-group-${rank}`}
              style={rankedDishes.length === 0 ? styles.emptySlot : undefined}
            >
              {rankedDishes.length > 0 ? <View testID={`podium-dishes-${rank}`} style={styles.dishStack}>
                {dishRows.map(row => row.length > 0 ? (
                  <View key={row[0]!.id} testID={`podium-dish-row-${rank}`} style={styles.dishRow}>
                    {row.map(item => (
                      <View key={item.id} testID={`podium-${item.id}`} style={[styles.column, compact && styles.compactColumn, { width: dishWidth }]}>
                        <ResultDishArtwork source={item.imageSource} uri={item.imageUri} imageScale={item.imageScale} label={item.name} size={imageSize} winner={item.winner} compact={compact} colors={colors} />
                        <View testID={`podium-name-${item.id}`} style={[styles.textSlot, { minHeight: heights.name }]}>
                          <Text onLayout={event => measure('name', event.nativeEvent.layout.height)} style={[styles.name, compact && styles.compactName, { color: colors.text }]}>{item.name}</Text>
                        </View>
                        {hasAttribution ? <View style={[styles.textSlot, { minHeight: heights.attribution }]}>
                          {item.imageAttribution ? <Text onLayout={event => measure('attribution', event.nativeEvent.layout.height)} style={[styles.attribution, compact && styles.compactAttribution, { color: colors.muted }]}>{item.imageAttribution}</Text> : null}
                        </View> : null}
                      </View>
                    ))}
                  </View>
                ) : null)}
              </View> : null}
              <RankPedestal rank={rank} scoreLabel={rankedDishes.find(dish => dish.scoreLabel)?.scoreLabel} heightScale={heightScale} />
            </View>
          </View>
        );
      })}
    </View>
  </View>;
}
function RankPedestal({ rank, scoreLabel, heightScale }: {
  rank: PodiumDish['rank'];
  scoreLabel?: string;
  heightScale: number;
}) {
  const { Base, Laurel, height } = rankArt[rank];
  const artHeight = height * heightScale;
  return (
    <View
      accessible
      accessibilityLabel={scoreLabel ? `Hạng ${rank} · ${scoreLabel}` : `Hạng ${rank}`}
      testID={`podium-bar-${rank}`}
      style={[styles.bar, { minHeight: artHeight + (scoreLabel ? spacing.lg : 0) }]}
    >
      <Base width="100%" height="100%" style={styles.vector} accessible={false} pointerEvents="none" />
      <View style={styles.rankArea}>
        <Laurel
          width="100%"
          height={artHeight}
          style={[styles.vector, { top: '50%', transform: [{ translateY: -artHeight / 2 }] }]}
          accessible={false}
          pointerEvents="none"
        />
        <Text style={[styles.rank, { color: rank === 1 ? lightColors.onPrimary : lightColors.text }]}>{rank}</Text>
      </View>
      {scoreLabel ? <Text style={styles.score}>{scoreLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // An empty rank keeps its width so rank 1 stays centered, but shows no pedestal (Figma result frames).
  emptySlot: { opacity: 0 },
  group: { paddingTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  dishStack: { marginBottom: spacing.sm, gap: spacing.sm },
  dishRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: spacing.xs },
  column: { minWidth: 0, alignItems: 'center', gap: spacing.sm },
  compactColumn: { gap: spacing.xs },
  textSlot: { width: '100%', justifyContent: 'center' },
  name: { ...typography.bodyBold, fontSize: 18, lineHeight: 25, textAlign: 'center', paddingHorizontal: spacing.xs },
  compactName: { fontSize: 12, lineHeight: 16, paddingHorizontal: 0 },
  bar: { width: '100%', justifyContent: 'center', gap: spacing.xs },
  rankArea: { alignItems: 'center', marginTop: spacing.xs },
  rank: { fontFamily: 'InterBold', fontSize: 52, lineHeight: 64 },
  score: { ...typography.bodyBold, color: lightColors.text, textAlign: 'center', paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
  vector: { position: 'absolute', top: 0, left: 0 },
  attribution: { ...typography.caption, textAlign: 'center' },
  compactAttribution: { fontSize: 10, lineHeight: 14 },
});
