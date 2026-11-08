import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

const choices = [{ label: 'Ăn ngay', icon: require('../../../../assets/brand/icons/lightning.png') }, { label: 'Hẹn giờ', icon: require('../../../../assets/brand/icons/history.png') }];
export function SetupTimeMode({ scheduled, disabled, onNow, onSchedule }: { scheduled: boolean; disabled?: boolean; onNow: () => void; onSchedule?: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <View style={[styles.segment, { borderColor: colors.line }]}>{choices.map((item, index) => {
    const selected = scheduled === (index === 1), unavailable = disabled || (index === 1 && !onSchedule);
    const foreground = selected ? colors.onPrimary : colors.text;
    return <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected, disabled: unavailable }} disabled={unavailable} onPress={index === 0 ? onNow : onSchedule} style={[styles.option, { backgroundColor: selected ? colors.primary : colors.surface, opacity: unavailable ? 0.5 : 1 }]}>
      <Image source={item.icon} accessible={false} resizeMode="contain" style={[styles.icon, { tintColor: foreground }]} /><Text style={[styles.label, { color: foreground }, textStyle(600)]}>{item.label}</Text>
    </Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({ segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden' }, option: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, icon: { width: 20, height: 20 }, label: { fontSize: 14, lineHeight: 21, flexShrink: 1 } });
