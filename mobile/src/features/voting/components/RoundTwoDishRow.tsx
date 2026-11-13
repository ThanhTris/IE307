import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PoolDish } from '../../../data/api';
import { AppIcon, type Palette } from '../../../shared/ui';
import type { FinalChoice } from '../hooks/useRoundTwoVoting';

/**
 * One survivor of round 1: a checkbox on the left and the dish name. Ticking means REMOVE; unticked means KEEP.
 * Once the removal limit is used, the unticked boxes are disabled; a ticked box can always be unticked.
 */
export function RoundTwoDishRow({ dish, choice, locked, canRemove, onChoose, colors }: {
  dish: PoolDish; choice: FinalChoice; locked: boolean; canRemove: boolean;
  onChoose: (roundDishId: string, choice: FinalChoice) => void; colors: Palette;
}) {
  const ticked = choice === 'REMOVE';
  const disabled = locked || (!ticked && !canRemove);
  return <Pressable
    testID={`round-two-row-${dish.roundDishId}`}
    accessibilityRole="checkbox"
    accessibilityLabel={`Loại ${dish.name}`}
    accessibilityState={{ checked: ticked, disabled }}
    disabled={disabled}
    onPress={() => onChoose(dish.roundDishId, ticked ? 'KEEP' : 'REMOVE')}
    style={[styles.row, { backgroundColor: colors.surface, borderColor: ticked ? colors.danger : colors.line, opacity: disabled && !ticked ? 0.45 : 1 }]}
  >
    <View style={[styles.box, { borderColor: ticked ? colors.danger : colors.muted, backgroundColor: ticked ? colors.danger : 'transparent' }]}>
      {ticked ? <AppIcon name="check" size={18} color={colors.onPrimary} /> : null}
    </View>
    <Text textBreakStrategy="balanced" style={[styles.name, { color: colors.text }, ticked && [styles.struck, { color: colors.danger, textDecorationColor: colors.danger }]]}>{dish.name}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: 'InterSemiBold', fontSize: 16, lineHeight: 22 },
  struck: { textDecorationLine: 'line-through' },
});
