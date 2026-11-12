import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, SheetDialog } from '../../../shared/ui';

const MINIMUM = 10;

/**
 * One dialog with exactly two ways out:
 * - enough dishes for a smaller vote (≥10): take that many, or change the settings;
 * - fewer than 10 (the server's minimum): change the time, or change the meal.
 */
export function SetupShortageDialog({ available, requested, onConfirmReduction, onEdit, onSchedule }: {
  available: number; requested: number; onConfirmReduction: () => void; onEdit: () => void; onSchedule?: () => void;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const canReduce = available >= MINIMUM;
  return <SheetDialog visible title="Không đủ món" presentation="dialog" showHandle={false} showClose={false} showTitle={false} onClose={onEdit} colors={colors}>
    <View style={styles.body}>
      <View style={[styles.badge, { backgroundColor: colors.warm }]}><AppIcon name="error" size={28} color={colors.danger} /></View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Không đủ món</Text>
      <Text style={[styles.text, { color: colors.muted }, textStyle(400)]}>
        {canReduce
          ? `Chỉ có ${available} món phù hợp, bạn đang chọn ${requested} món.`
          : `Chỉ có ${available} món phù hợp. Cần ít nhất ${MINIMUM} món để bình chọn, hãy đổi giờ hoặc buổi ăn.`}
      </Text>
      {canReduce ? <>
        <AppButton label={`Chọn ${available} món`} onPress={onConfirmReduction} colors={colors} singleLine style={styles.button} />
        <AppButton label="Đổi thiết lập" variant="secondary" onPress={onEdit} colors={colors} singleLine style={styles.button} />
      </> : <>
        {onSchedule ? <AppButton label="Đổi giờ hẹn" onPress={onSchedule} colors={colors} singleLine style={styles.button} /> : null}
        <AppButton label="Đổi buổi ăn" variant={onSchedule ? 'secondary' : 'primary'} onPress={onEdit} colors={colors} singleLine style={styles.button} />
      </>}
    </View>
  </SheetDialog>;
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 12 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 28, textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { alignSelf: 'stretch' },
});
