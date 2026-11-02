import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';

const meals = [
  { label: 'Ăn sáng', icon: require('../../../../assets/brand/entry-ui/sun.png') },
  { label: 'Ăn trưa', icon: require('../../../../assets/brand/entry-ui/rice.png') },
  { label: 'Ăn tối', icon: require('../../../../assets/brand/entry-ui/moon.png') },
  { label: 'Ăn vặt', icon: require('../../../../assets/brand/entry-ui/snack.png') },
];
const budgets = [
  { label: 'Dưới 50K', icon: require('../../../../assets/brand/entry-ui/wallet.png') },
  { label: '50–100K', icon: require('../../../../assets/brand/entry-ui/coins.png') },
  { label: '100–200K', icon: require('../../../../assets/brand/entry-ui/box.png') },
  { label: 'Không giới hạn', icon: require('../../../../assets/brand/entry-ui/infinity.png') },
];
/** Tutorial's own local example. Not a production GM-10 settings form/writer. */
export function TutorialSetupStage({ onNext }: { onNext: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [meal, setMeal] = useState('Ăn trưa'), [scheduled, setScheduled] = useState(false);
  return <>
    <View style={[styles.notice, { backgroundColor: colors.warm, borderColor: colors.line }]}><Text style={[styles.body, { color: colors.text }, textStyle(400)]}>Chọn buổi ăn và thời gian. Các mục khác tùy nhu cầu.</Text></View>
    <Text style={[styles.label, { color: colors.text }, textStyle(700)]}>Buổi ăn</Text>
    <View style={styles.grid}>{meals.map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: meal === item.label }} onPress={() => setMeal(item.label)} style={[styles.option, { borderColor: meal === item.label ? colors.green : colors.line, backgroundColor: meal === item.label ? colors.warm : colors.surface }]}>
      <Image source={item.icon} accessible={false} resizeMode="contain" style={[styles.icon, { tintColor: colors.text }]} /><Text style={[styles.body, { color: colors.text }, textStyle(600)]}>{item.label}</Text>
    </Pressable>)}</View>
    <Text style={[styles.label, { color: colors.text }, textStyle(700)]}>Thời gian</Text>
    <View style={styles.segment}>{['Ăn ngay', 'Hẹn giờ'].map((label, index) => <AppButton key={label} label={label} variant={scheduled === !!index ? 'primary' : 'secondary'} onPress={() => setScheduled(!!index)} style={styles.segmentButton} colors={colors} />)}</View>
    {scheduled ? <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Hẹn giờ là lựa chọn mẫu trong hướng dẫn; không đặt lịch thật.</Text> : null}
    <Text style={[styles.label, { color: colors.text }, textStyle(700)]}>Số món để lựa chọn · 10–20</Text>
    <View style={[styles.count, { borderColor: colors.line }]}><Text style={[styles.body, { color: colors.muted }]}>−</Text><Text style={[styles.countText, { color: colors.text }, textStyle(700)]}>12 <Text style={styles.body}>món</Text></Text><Text style={[styles.body, { color: colors.muted }]}>+</Text></View>
    <Text style={[styles.label, { color: colors.text }, textStyle(700)]}>Ngân sách mỗi người</Text>
    <View style={styles.grid}>{budgets.map(({ label, icon }) => <View key={label} style={[styles.budget, { borderColor: label === '50–100K' ? colors.green : colors.line, backgroundColor: label === '50–100K' ? colors.warm : colors.surface }]}><Image source={icon} accessible={false} resizeMode="contain" style={[styles.icon, { tintColor: colors.text }]} /><Text style={[styles.body, { color: colors.text }, textStyle(500)]}>{label}</Text></View>)}</View>
    <View style={[styles.notice, { borderColor: colors.line }]}><Text style={[styles.body, { color: colors.text }, textStyle(600)]}>Ưu tiên món khác 3 bữa gần đây ✓</Text></View>
    <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Thiết lập mẫu · 12 món · không tạo phòng thật</Text>
    <View style={styles.spacer} /><AppButton label="Thử thiết lập mẫu" onPress={onNext} colors={colors} />
  </>;
}
const styles = StyleSheet.create({
  notice: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 20 }, body: { fontSize: 15, lineHeight: 22 }, label: { fontSize: 18, lineHeight: 25, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, option: { width: '48%', minHeight: 76, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 8 }, icon: { width: 28, height: 28 },
  segment: { flexDirection: 'row', gap: 0, marginBottom: 24 }, segmentButton: { flex: 1 }, count: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, countText: { fontSize: 28, lineHeight: 36 },
  budget: { width: '48%', borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }, spacer: { flexGrow: 1, minHeight: 24 },
});
