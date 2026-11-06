import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PoolDish } from '../../../data/api';
import { DishCard, type DishCardData, type Palette, type VoteValue } from '../../../shared/ui';

export interface FlashcardDeckViewProps {
  dish: PoolDish;
  cardIndex: number;
  totalCards: number;
  votedCount: number;
  currentVote?: VoteValue;
  isLocked: boolean;
  canUndo: boolean;
  onVote: (vote: VoteValue) => void;
  onCardPress: () => void;
  onUndo: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClearVote: () => void;
  colors: Palette;
}

export function FlashcardDeckView({
  dish,
  cardIndex,
  totalCards,
  votedCount,
  currentVote,
  isLocked,
  canUndo,
  onVote,
  onCardPress,
  onUndo,
  onNext,
  onPrev,
  onClearVote,
  colors,
}: FlashcardDeckViewProps) {
  const priceLabel = dish.priceMin != null
    ? dish.priceMax != null && dish.priceMax !== dish.priceMin
      ? `${dish.priceMin.toLocaleString()} - ${dish.priceMax.toLocaleString()} đ`
      : `${dish.priceMin.toLocaleString()} đ`
    : undefined;

  const cardData: DishCardData = {
    id: dish.roundDishId,
    name: dish.name,
    description: dish.description ?? undefined,
    imageUrl: dish.artwork?.url ?? undefined,
    tags: [dish.origin, dish.temperature, ...(dish.cuisineIds || []), ...(dish.categoryIds || [])].filter(Boolean) as string[],
    priceLabel,
    venueLabel: dish.venueName,
  };

  const progressPercent = totalCards > 0 ? Math.round((votedCount / totalCards) * 100) : 0;

  return (
    <View style={styles.deckContainer}>
      {/* Deck Indicator Header */}
      <View style={styles.deckHeader}>
        <View style={[styles.cardCounterPill, { backgroundColor: colors.soft }]}>
          <Text style={[styles.cardCounterText, { color: colors.primary }]}>
            Thẻ {cardIndex + 1} / {totalCards}
          </Text>
        </View>

        <Text
          accessibilityRole="text"
          accessibilityLabel={`Trạng thái phiếu món ${dish.name}: ${currentVote ?? 'UNSET'}`}
          style={[
            styles.voteBadge,
            {
              color: currentVote
                ? currentVote === 'WANT'
                  ? colors.primary
                  : currentVote === 'OK'
                  ? colors.green
                  : colors.danger
                : colors.muted,
              backgroundColor: colors.soft,
            },
          ]}
        >
          {currentVote ? `Phiếu: ${currentVote}` : 'Chưa chọn (UNSET)'}
        </Text>
      </View>

      {/* Progress Track */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercent}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <Text style={[styles.progressHint, { color: colors.muted }]}>
        Đã bình chọn {votedCount}/{totalCards} món ({progressPercent}%)
      </Text>

      {/* Main Flashcard */}
      <View style={styles.cardWrapper}>
        <DishCard
          dish={cardData}
          selectedVote={currentVote}
          onVote={onVote}
          onPress={onCardPress}
          disabled={isLocked}
          delayPressIn={100}
          colors={colors}
        />
      </View>

      {/* Gesture Replacement Action Buttons (Touch target >= 48dp) */}
      <View style={styles.gestureButtonsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Không ăn (Vuốt trái · NO)"
          accessibilityState={{ selected: currentVote === 'NO', disabled: isLocked }}
          disabled={isLocked}
          onPress={() => onVote('NO')}
          style={[
            styles.gestureBtn,
            {
              backgroundColor: currentVote === 'NO' ? colors.danger : colors.surface,
              borderColor: colors.danger,
              opacity: isLocked ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.gestureBtnText,
              { color: currentVote === 'NO' ? '#FFFFFF' : colors.danger },
            ]}
          >
            ✕ Không ăn
          </Text>
          <Text
            style={[
              styles.gestureBtnHint,
              { color: currentVote === 'NO' ? '#FFFFFF' : colors.muted },
            ]}
          >
            (Vuốt trái)
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Muốn ăn (Chạm 2 lần · WANT)"
          accessibilityState={{ selected: currentVote === 'WANT', disabled: isLocked }}
          disabled={isLocked}
          onPress={() => onVote('WANT')}
          style={[
            styles.gestureBtn,
            styles.gestureBtnWant,
            {
              backgroundColor: currentVote === 'WANT' ? colors.primary : colors.surface,
              borderColor: colors.primary,
              opacity: isLocked ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.gestureBtnText,
              { color: currentVote === 'WANT' ? colors.onPrimary : colors.primary },
            ]}
          >
            ★ Muốn ăn
          </Text>
          <Text
            style={[
              styles.gestureBtnHint,
              { color: currentVote === 'WANT' ? colors.onPrimary : colors.muted },
            ]}
          >
            (Double-tap)
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ăn được (Vuốt phải · OK)"
          accessibilityState={{ selected: currentVote === 'OK', disabled: isLocked }}
          disabled={isLocked}
          onPress={() => onVote('OK')}
          style={[
            styles.gestureBtn,
            {
              backgroundColor: currentVote === 'OK' ? colors.green : colors.surface,
              borderColor: colors.green,
              opacity: isLocked ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.gestureBtnText,
              { color: currentVote === 'OK' ? '#FFFFFF' : colors.green },
            ]}
          >
            ✓ Ăn được
          </Text>
          <Text
            style={[
              styles.gestureBtnHint,
              { color: currentVote === 'OK' ? '#FFFFFF' : colors.muted },
            ]}
          >
            (Vuốt phải)
          </Text>
        </Pressable>
      </View>

      {/* Navigation & Undo Controls */}
      <View style={styles.navRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thẻ trước"
          disabled={cardIndex === 0 || isLocked}
          onPress={onPrev}
          style={[
            styles.navBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: cardIndex === 0 || isLocked ? 0.4 : 1,
            },
          ]}
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>← Thẻ trước</Text>
        </Pressable>

        {canUndo && !isLocked ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hoàn tác về thẻ trước`}
            onPress={onUndo}
            style={[styles.undoBtn, { backgroundColor: colors.soft }]}
          >
            <Text style={[styles.undoBtnText, { color: colors.primary }]}>
              ↺ Hoàn tác (Undo)
            </Text>
          </Pressable>
        ) : currentVote && !isLocked ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bỏ chọn phiếu cho ${dish.name}`}
            onPress={onClearVote}
            style={[styles.undoBtn, { backgroundColor: colors.soft }]}
          >
            <Text style={[styles.undoBtnText, { color: colors.muted }]}>
              ↺ Bỏ chọn về UNSET
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thẻ tiếp theo"
          disabled={cardIndex === totalCards - 1 || isLocked}
          onPress={onNext}
          style={[
            styles.navBtn,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: cardIndex === totalCards - 1 || isLocked ? 0.4 : 1,
            },
          ]}
        >
          <Text style={[styles.navBtnText, { color: colors.text }]}>Thẻ sau →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deckContainer: { gap: 12 },
  deckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCounterPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  cardCounterText: { fontSize: 13, fontWeight: '800' },
  voteBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressHint: { fontSize: 11, textAlign: 'center' },
  cardWrapper: { borderRadius: 16 },
  gestureButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  gestureBtn: {
    flex: 1,
    minHeight: 52, // >= 48dp accessibility requirement
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  gestureBtnWant: { flex: 1.1 },
  gestureBtnText: { fontSize: 14, fontWeight: '800' },
  gestureBtnHint: { fontSize: 10, marginTop: 2 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 },
  navBtn: { paddingHorizontal: 12, minHeight: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  navBtnText: { fontSize: 12, fontWeight: '700' },
  undoBtn: { paddingHorizontal: 12, minHeight: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  undoBtnText: { fontSize: 12, fontWeight: '700' },
});
