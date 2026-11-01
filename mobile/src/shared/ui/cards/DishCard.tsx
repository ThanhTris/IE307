import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ImageStyle,
} from 'react-native';
import { radii, spacing, typography, type ThemeColors } from '../../theme/tokens';
import { Chip } from '../buttons/Chip';
import type { ComponentThemeProps } from '../types';

export type DishCardData = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  tags?: string[];
  priceLabel?: string;
  venueLabel?: string;
};

export type VoteValue = 'WANT' | 'OK' | 'NO';

export type DishCardProps = ComponentThemeProps & {
  dish: DishCardData;
  selectedVote?: VoteValue;
  onVote?: (vote: VoteValue) => void;
  onPress?: () => void;
  disabled?: boolean;
  delayPressIn?: number;
};

export function DishCard({
  dish,
  selectedVote,
  onVote,
  onPress,
  colors,
  disabled,
  delayPressIn,
}: DishCardProps) {
  const imageKey = dish.imageSource ?? dish.imageUrl;
  const [failedImageKey, setFailedImageKey] = useState<typeof imageKey>(undefined);
  const imageFailed = failedImageKey === imageKey;
  const source = dish.imageSource ?? (dish.imageUrl ? { uri: dish.imageUrl } : undefined);
  return (
    <View style={[styles.dishCard, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Mở món ${dish.name}`}
        onPress={onPress}
        disabled={disabled || !onPress}
        unstable_pressDelay={delayPressIn ?? 100}
      >
        {source && !imageFailed ? (
          <Image
            accessibilityLabel={`Ảnh ${dish.name}`}
            source={source}
            onError={() => setFailedImageKey(imageKey)}
            style={styles.dishImage as ImageStyle}
          />
        ) : (
          <View
            accessibilityLabel={`Ảnh dự phòng ${dish.name}`}
            style={[styles.dishFallback, { backgroundColor: colors?.warm }]}
          >
            <Text style={styles.dishEmoji}>🍜</Text>
          </View>
        )}
        <View style={styles.dishBody}>
          <Text style={[styles.dishName, { color: colors?.text }]}>{dish.name}</Text>
          {dish.description ? <Text style={[styles.dishDescription, { color: colors?.muted }]}>{dish.description}</Text> : null}
          {dish.tags?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
              {dish.tags.map(tag => (
                <Chip key={tag} label={tag} colors={colors} />
              ))}
            </ScrollView>
          ) : null}
          <Text style={[styles.dishMeta, { color: colors?.muted }]}>
            {[dish.priceLabel ?? 'Giá chưa rõ', dish.venueLabel].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
      {onVote ? (
        <View style={styles.voteRow}>
          <VoteButton label="Muốn ăn" vote="WANT" selectedVote={selectedVote} onPress={onVote} colors={colors} disabled={disabled} />
          <VoteButton label="Ăn được" vote="OK" selectedVote={selectedVote} onPress={onVote} colors={colors} disabled={disabled} />
          <VoteButton label="Không ăn" vote="NO" selectedVote={selectedVote} onPress={onVote} colors={colors} disabled={disabled} />
        </View>
      ) : null}
    </View>
  );
}

function VoteButton({
  label,
  vote,
  selectedVote,
  onPress,
  colors,
  disabled,
}: {
  label: string;
  vote: VoteValue;
  selectedVote?: VoteValue;
  onPress: (vote: VoteValue) => void;
  colors?: ThemeColors;
  disabled?: boolean;
}) {
  const selected = selectedVote === vote;
  const color = vote === 'WANT' ? colors?.primary : vote === 'OK' ? colors?.green : colors?.danger;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      onPress={() => onPress(vote)}
      disabled={disabled}
      style={[
        styles.voteButton,
        {
          borderColor: color,
          backgroundColor: selected ? color : colors?.surface,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? colors?.onPrimary : color, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dishCard: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  dishImage: { width: '100%', height: 160, backgroundColor: '#E2E8F0' },
  dishFallback: { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center' },
  dishEmoji: { fontSize: 52 },
  dishBody: { padding: spacing.lg, gap: spacing.sm },
  dishName: { ...typography.titleMedium },
  dishDescription: { ...typography.body },
  tagRow: { gap: spacing.sm },
  dishMeta: { ...typography.caption },
  voteRow: { padding: spacing.md, gap: spacing.sm, flexDirection: 'row' },
  voteButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
});
