import { Image, Pressable, StyleSheet, Text, View, type ImageStyle } from 'react-native';
import type { PoolDish } from '../../../data/api';
import type { Palette } from '../../../shared/ui';
import type { FinalChoice } from '../hooks/useRoundTwoVoting';
import { formatDishPrice } from '../services/priceLabel';

export interface CandidateKeepRemoveCardProps {
  dish: PoolDish;
  index: number;
  currentChoice: FinalChoice;
  isLocked: boolean;
  canRemove?: boolean;
  onToggleChoice: (dishId: string, choice: FinalChoice) => void;
  colors: Palette;
}

export function CandidateKeepRemoveCard({
  dish,
  index,
  currentChoice,
  isLocked,
  canRemove = true,
  onToggleChoice,
  colors,
}: CandidateKeepRemoveCardProps) {
  const isKeep = currentChoice === 'KEEP';
  const source = dish.artwork?.url ? { uri: dish.artwork.url } : undefined;
  const isRemoveDisabled = isLocked || (isKeep && !canRemove);
  const priceLabel = formatDishPrice(dish);

  return (
    <View
      style={[
        styles.candidateCard,
        {
          backgroundColor: colors.surface,
          borderColor: isKeep ? colors.primary : colors.line,
          borderWidth: isKeep ? 2 : 1,
        },
      ]}
    >
      <View style={styles.candidateHeader}>
        <Text style={[styles.candidateIndex, { color: colors.primary }]}>
          Ứng viên #{index + 1}
        </Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: isKeep ? colors.primary : colors.danger },
          ]}
        >
          <Text style={styles.statusPillText}>
            {isKeep ? '✓ GIỮ' : '✕ ĐÃ LOẠI'}
          </Text>
        </View>
      </View>

      <View style={styles.candidateBody}>
        {source ? (
          <Image source={source} style={styles.candidateImage as ImageStyle} />
        ) : (
          <View style={[styles.candidateFallback, { backgroundColor: colors.warm }]}>
            <Text style={styles.candidateEmoji}>🍜</Text>
          </View>
        )}
        <View style={styles.candidateMeta}>
          <Text style={[styles.candidateName, { color: colors.text }]}>
            {dish.name}
          </Text>
          {dish.venueName ? (
            <Text style={[styles.candidateVenue, { color: colors.muted }]}>
              {dish.venueName}
            </Text>
          ) : null}
          {priceLabel ? (
            <Text style={[styles.candidatePrice, { color: colors.primary }]}>
              {priceLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Giữ món ${dish.name}`}
          accessibilityState={{ selected: isKeep, disabled: isLocked }}
          disabled={isLocked}
          onPress={() => onToggleChoice(dish.roundDishId, 'KEEP')}
          style={[
            styles.toggleBtn,
            {
              backgroundColor: isKeep ? colors.primary : colors.surface,
              borderColor: colors.primary,
              opacity: isLocked ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.toggleBtnText,
              { color: isKeep ? colors.onPrimary : colors.primary },
            ]}
          >
            ✓ Giữ
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Loại món ${dish.name}`}
          accessibilityState={{ selected: !isKeep, disabled: isRemoveDisabled }}
          disabled={isRemoveDisabled}
          onPress={() => onToggleChoice(dish.roundDishId, 'REMOVE')}
          style={[
            styles.toggleBtn,
            {
              backgroundColor: !isKeep ? colors.danger : colors.surface,
              borderColor: isRemoveDisabled && isKeep ? colors.border : colors.danger,
              opacity: isRemoveDisabled && isKeep ? 0.4 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.toggleBtnText,
              { color: !isKeep ? colors.onPrimary : isRemoveDisabled && isKeep ? colors.muted : colors.danger },
            ]}
          >
            ✕ Đã loại
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  candidateCard: { borderRadius: 16, padding: 14, gap: 12 },
  candidateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  candidateIndex: { fontSize: 13, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  candidateBody: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  candidateImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#E2E8F0' },
  candidateFallback: { width: 72, height: 72, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  candidateEmoji: { fontSize: 32 },
  candidateMeta: { flex: 1, gap: 4 },
  candidateName: { fontSize: 16, fontWeight: '700' },
  candidateVenue: { fontSize: 13 },
  candidatePrice: { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  toggleBtnText: { fontSize: 14, fontWeight: '700' },
});
