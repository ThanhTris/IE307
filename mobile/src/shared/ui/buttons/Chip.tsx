import { Pressable, StyleSheet, Text } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type ChipProps = ComponentThemeProps & {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leadingIcon?: string;
};

export function Chip({ label, selected = false, disabled = false, onPress, leadingIcon, colors }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors?.warm : colors?.soft,
          borderColor: selected ? colors?.primary : colors?.line,
          opacity: pressed || disabled ? 0.65 : 1,
        },
      ]}
    >
      {leadingIcon ? <Text style={styles.chipIcon}>{leadingIcon}</Text> : null}
      {selected ? <Text style={[styles.chipIcon, { color: colors?.primary }]}>✓</Text> : null}
      <Text style={[styles.chipText, { color: selected ? colors?.primary : colors?.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chipIcon: { fontSize: 14, fontWeight: '700' },
  chipText: { ...typography.caption },
});
