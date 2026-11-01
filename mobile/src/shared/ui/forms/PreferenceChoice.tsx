import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type PreferenceChoiceOption = { id: string; label: string; unknown?: boolean };

export function PreferenceChoice({
  options,
  selectedId,
  onSelect,
  disabled = false,
  colors,
}: ComponentThemeProps & {
  options: PreferenceChoiceOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.preferenceChoice}>
      {options.map(option => {
        const selected = option.id === selectedId;
        const unavailable = disabled || option.unknown === true;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled: unavailable }}
            disabled={unavailable}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.preferenceOption,
              {
                backgroundColor: selected ? colors?.warm : colors?.surface,
                borderColor: selected ? colors?.primary : colors?.line,
                opacity: unavailable && !option.unknown ? 0.5 : pressed ? 0.72 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.preferenceOptionText,
                { color: option.unknown ? colors?.muted : selected ? colors?.primary : colors?.text },
              ]}
            >
              {option.label}
            </Text>
            {selected ? (
              <Text accessibilityLabel="Đã chọn" style={[styles.preferenceCheck, { color: colors?.primary }]}>
                ✓
              </Text>
            ) : null}
            {option.unknown ? <Text style={[styles.helper, { color: colors?.muted }]}>Chưa rõ</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  preferenceChoice: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preferenceOption: {
    minHeight: 48,
    minWidth: 72,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  preferenceOptionText: { ...typography.bodyBold },
  preferenceCheck: { fontSize: 16, fontWeight: '800' },
  helper: { ...typography.caption },
});
