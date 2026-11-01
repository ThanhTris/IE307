import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type DishCountProps = ComponentThemeProps & {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function DishCount({ value, onChange, min = 10, max = 20, disabled = false, colors }: DishCountProps) {
  const count = Math.min(max, Math.max(min, value));
  return (
    <View
      accessibilityRole="summary"
      style={[styles.dishCount, { backgroundColor: colors?.surface, borderColor: colors?.line }]}
    >
      <Text style={[styles.dishCountLabel, { color: colors?.muted }]}>SỐ MÓN</Text>
      <View style={styles.dishCountControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Giảm số món"
          accessibilityState={{ disabled: disabled || count <= min }}
          disabled={disabled || count <= min}
          onPress={() => onChange(Math.max(min, count - 1))}
          style={({ pressed }) => [
            styles.countButton,
            {
              borderColor: colors?.line,
              backgroundColor: pressed ? colors?.soft : colors?.surface,
              opacity: disabled || count <= min ? 0.45 : 1,
            },
          ]}
        >
          <Text style={[styles.countButtonText, { color: colors?.text }]}>−</Text>
        </Pressable>
        <Text
          accessibilityLabel={`${count} món`}
          accessibilityRole="text"
          style={[styles.dishCountValue, { color: colors?.text }]}
        >
          {count}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tăng số món"
          accessibilityState={{ disabled: disabled || count >= max }}
          disabled={disabled || count >= max}
          onPress={() => onChange(Math.min(max, count + 1))}
          style={({ pressed }) => [
            styles.countButton,
            {
              borderColor: colors?.line,
              backgroundColor: pressed ? colors?.soft : colors?.surface,
              opacity: disabled || count >= max ? 0.45 : 1,
            },
          ]}
        >
          <Text style={[styles.countButtonText, { color: colors?.text }]}>+</Text>
        </Pressable>
      </View>
      <Text style={[styles.helper, { color: colors?.muted }]}>
        Chọn từ {min} đến {max} món
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dishCount: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  dishCountLabel: { ...typography.caption },
  dishCountControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  countButton: { width: 48, height: 48, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  countButtonText: { fontSize: 24, lineHeight: 28, fontWeight: '700' },
  dishCountValue: { ...typography.titleLarge, minWidth: 56, textAlign: 'center' },
  helper: { ...typography.caption },
});
