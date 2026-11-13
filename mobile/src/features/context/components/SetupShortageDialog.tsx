import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, SheetDialog } from '../../../shared/ui';
import { MIN_REDUCED_DISHES } from '../hooks/useDishSetupFlow';

/**
 * Not enough dishes for the chosen count. Two ways out: change the time, or go on with the dishes there are
 * (at least 5). Below 5 only changing the time is offered.
 */
export function SetupShortageDialog({ available, requested, onConfirmReduction, onEdit, onSchedule }: {
  available: number; requested: number; onConfirmReduction: () => void; onEdit: () => void; onSchedule?: () => void;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const canReduce = available >= MIN_REDUCED_DISHES && available < requested;
  return <SheetDialog visible title="Không đủ món" presentation="dialog" showHandle={false} showClose={false} showTitle={false} onClose={onEdit} colors={colors}>
    <View style={styles.body}>
      <View style={[styles.badge, { backgroundColor: colors.warm }]}><AppIcon name="warning" size={28} color={colors.warning} /></View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Không đủ món</Text>
      <Text style={[styles.text, { color: colors.muted }, textStyle(400)]}>
        {canReduce
          ? `Chỉ có ${available}/${requested} món phù hợp.`
          : `Chỉ có ${available} món phù hợp, cần ít nhất ${MIN_REDUCED_DISHES} món. Hãy đổi giờ hẹn.`}
      </Text>
      <AppButton label="Đổi giờ hẹn" variant={canReduce ? 'secondary' : 'primary'} onPress={onSchedule ?? onEdit} colors={colors} singleLine style={styles.button} />
      {canReduce ? <AppButton label={`Dùng ${available} món`} onPress={onConfirmReduction} colors={colors} singleLine style={styles.button} /> : null}
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
