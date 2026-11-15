import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SheetDialog } from '../../../shared/ui';
import type { MealTimeConflict } from '../services/dishSetup';

/** Asks which side to fix when the scheduled hour does not belong to the chosen meal. */
export function MealTimeConflictDialog({ conflict, onKeepTime, onKeepMeal, onClose }: {
  conflict: MealTimeConflict | null; onKeepTime: () => void; onKeepMeal: () => void; onClose: () => void;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <SheetDialog visible={!!conflict} title="Giờ và buổi ăn chưa khớp" presentation="dialog" showClose={false} showHandle={false} onClose={onClose} colors={colors}>
    {conflict ? <View style={styles.body}>
      <Text style={[styles.text, { color: colors.muted }, textStyle(400)]}>{`${conflict.time} không phải giờ của ${conflict.mealLabel.toLowerCase()}. Bạn muốn:`}</Text>
      <AppButton label={`Đổi thành ${conflict.fittingLabel}`} accessibilityHint={`Giữ giờ ${conflict.time}`} onPress={onKeepTime} colors={colors} singleLine />
      <AppButton label={`Giữ ${conflict.mealLabel}, đổi giờ`} accessibilityHint="Chuyển giờ vào khung của buổi ăn đã chọn" variant="secondary" onPress={onKeepMeal} colors={colors} singleLine />
    </View> : null}
  </SheetDialog>;
}

const styles = StyleSheet.create({ body: { gap: 12 }, text: { fontSize: 15, lineHeight: 22 } });
