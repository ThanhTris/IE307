import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppIcon, type AppIconName } from '../../../shared/ui/icons/AppIcon';

const tabs: { label: string; icon: AppIconName }[] = [
  { label: 'Trang chủ', icon: 'home' },
  { label: 'Bạn bè', icon: 'friends' },
  { label: 'Lịch sử', icon: 'history' },
  { label: 'Cá nhân', icon: 'profile' },
];
/** Noninteractive, hidden-from-accessibility scenery of the T01 example. */
export function TutorialHomeFooter() {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.root}>
    <View style={[styles.friends, { borderColor: colors.text }]}>{['Linh', 'Nam', 'Thêm'].map((label, index) => <View key={label} style={styles.friend}><View style={[styles.avatar, { borderColor: colors.text }]}><Text style={[styles.initial, { color: colors.text }, textStyle(600)]}>{index === 2 ? '+' : label[0]}</Text></View><Text style={[styles.label, { color: colors.text }, textStyle(600)]}>{label}</Text></View>)}</View>
    <View style={[styles.tabs, { borderColor: colors.text }]}>{tabs.map(tab => <View key={tab.label} style={styles.tab}><AppIcon name={tab.icon} size={24} color={colors.text} /><Text style={[styles.label, { color: colors.text }, textStyle(500)]}>{tab.label}</Text></View>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  root: { opacity: 0.38 }, friends: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', gap: 24, padding: 16, marginTop: -24 }, friend: { gap: 8, alignItems: 'center' }, avatar: { width: 48, height: 48, borderWidth: 1, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }, initial: { fontSize: 20, lineHeight: 28 }, label: { fontSize: 12, lineHeight: 18, textAlign: 'center' }, tabs: { borderTopWidth: 1, flexDirection: 'row', paddingTop: 16, marginTop: 8, marginHorizontal: -24 }, tab: { flex: 1, gap: 8, alignItems: 'center' }, icon: { width: 24, height: 24 },
});
