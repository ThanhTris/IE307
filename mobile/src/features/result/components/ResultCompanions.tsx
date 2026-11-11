import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppIcon } from '../../../shared/ui/icons/AppIcon';
import type { ResultCompanion } from '../services/resultPresentation';

export function ResultCompanions({ members }: { members: readonly ResultCompanion[] }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  if (!members.length) return null;
  return <View style={[styles.card, { borderColor: colors.line }]}><Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(600)]}>Cùng ăn</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list} accessibilityLabel="Thành viên được phép hiển thị">
      {members.map(member => <View key={member.id} style={[styles.chip, { backgroundColor: colors.soft }]}><AppIcon name="profile" size={18} color={colors.text} /><Text style={[styles.label, { color: colors.text }, textStyle(500)]}>{member.label}</Text></View>)}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }, heading: { fontSize: 14, lineHeight: 20 }, list: { gap: 8 }, chip: { borderRadius: 24, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }, icon: { width: 18, height: 18 }, label: { fontSize: 13, lineHeight: 20 } });
