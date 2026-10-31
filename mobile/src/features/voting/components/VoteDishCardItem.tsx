import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PoolDish } from '../../../data/api';
import { DishCard, type DishCardData, type Palette, type VoteValue } from '../../../shared/ui';

export interface VoteDishCardItemProps {
  dish: PoolDish;
  index: number;
  currentVote?: VoteValue;
  isLocked: boolean;
  onVote: (dishId: string, vote: VoteValue) => void;
  onCardPress: (dishId: string) => void;
  onClearVote: (dishId: string) => void;
  colors: Palette;
}

export function VoteDishCardItem({
  dish,
  index,
  currentVote,
  isLocked,
  onVote,
  onCardPress,
  onClearVote,
  colors,
}: VoteDishCardItemProps) {
  const cardData: DishCardData = {
    id: dish.roundDishId,
    name: dish.name,
    description: dish.description ?? undefined,
    imageUrl: dish.artwork?.url ?? undefined,
    tags: [dish.origin, dish.temperature, ...(dish.cuisineIds || []), ...(dish.categoryIds || [])].filter(Boolean) as string[],
    priceLabel:
      dish.priceMin != null && dish.priceMax != null
        ? `${dish.priceMin.toLocaleString()} - ${dish.priceMax.toLocaleString()} đ`
        : undefined,
    venueLabel: dish.venueName,
  };

  return (
    <View style={styles.dishCardContainer}>
      <View style={styles.cardHeader}>
        <Text style={[styles.dishIndex, { color: colors.primary }]}>
          Món #{index + 1}
        </Text>
        <Text
          accessibilityRole="text"
          accessibilityLabel={`Trạng thái phiếu món ${dish.name}: ${currentVote ?? 'UNSET'}`}
          style={[
            styles.voteBadge,
            {
              color: currentVote
                ? (currentVote === 'WANT' ? colors.primary : currentVote === 'OK' ? colors.green : colors.danger)
                : colors.muted,
              backgroundColor: colors.soft,
            },
          ]}
        >
          {currentVote ? `Phiếu: ${currentVote}` : 'Chưa chọn (UNSET)'}
        </Text>
      </View>

      <DishCard
        dish={cardData}
        selectedVote={currentVote}
        onVote={vote => onVote(dish.roundDishId, vote)}
        onPress={() => onCardPress(dish.roundDishId)}
        disabled={isLocked}
        delayPressIn={100}
        colors={colors}
      />

      {currentVote && !isLocked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Bỏ chọn phiếu cho ${dish.name}`}
          onPress={() => onClearVote(dish.roundDishId)}
          style={styles.undoRow}
        >
          <Text style={[styles.undoText, { color: colors.muted }]}>
            ↺ Bỏ chọn / Hoàn tác về UNSET
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dishCardContainer: { gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishIndex: { fontSize: 13, fontWeight: '700' },
  voteBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  undoRow: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8 },
  undoText: { fontSize: 12, fontWeight: '600' },
});
