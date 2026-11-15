import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppButton } from '../buttons/AppButton';
import type { ComponentThemeProps } from '../types';

export function InsufficientDishes({
  mode,
  count,
  minimum = 10,
  onReduce,
  onEdit,
  onBack,
  disabled = false,
  colors,
}: ComponentThemeProps & {
  mode: 'can-reduce' | 'below-minimum';
  count: number;
  minimum?: number;
  onReduce?: () => void;
  onEdit: () => void;
  /** Omit when Edit already covers going back, so the card never shows two buttons doing the same thing. */
  onBack?: () => void;
  disabled?: boolean;
}) {
  const belowMinimum = mode === 'below-minimum';
  return (
    <View
      accessibilityRole="summary"
      style={[styles.shortage, { backgroundColor: colors?.surface, borderColor: colors?.line }]}
    >
      <Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>
        {belowMinimum ? 'Chưa đủ món' : 'Có thể giảm số món'}
      </Text>
      <Text style={[styles.body, { color: colors?.muted }]}>
        {belowMinimum
          ? `Hiện có ${count} món. Cần ít nhất ${minimum} món để tạo phòng.`
          : `Hiện có ${count} món. Bạn có thể giảm, nhưng không thấp hơn ${minimum} món.`}
      </Text>
      {!belowMinimum && onReduce ? (
        <AppButton
          label="Giảm số món"
          onPress={onReduce}
          disabled={disabled || count <= minimum}
          colors={colors}
        />
      ) : null}
      <AppButton label="Sửa thiết lập" variant={!belowMinimum && onReduce ? 'secondary' : 'primary'} onPress={onEdit} disabled={disabled} colors={colors} />
      {onBack ? <AppButton label="Quay lại" variant="quiet" onPress={onBack} disabled={disabled} colors={colors} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shortage: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  contextTitle: { ...typography.titleMedium },
  body: { ...typography.body },
});
