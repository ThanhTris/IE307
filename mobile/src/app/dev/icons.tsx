import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { ChoiceIconView, type ChoiceIcon } from '../../shared/ui/icons/ChoiceIcon';
import { dishSetupCatalogue } from '../../features/context/services/dishSetupCatalogue';
import { budgetOptions, mealOptions } from '../../features/context/services/dishSetup';
import { fattyChoice, flavorChoices } from '../../features/preferences/services/dishPreferences';
import { preferenceAssets } from '../../features/preferences/components/preferenceAssets';

type Row = { label: string; icon?: ChoiceIcon };

/** Development-only: every preference / meal / budget choice with its icon, to review the icon set at a glance. */
export default function DevIconsRoute() {
  const { colors } = useShellTheme();
  if (!__DEV__) return <Redirect href="/" />;
  const groups: { title: string; rows: Row[] }[] = [
    { title: 'Bữa ăn', rows: mealOptions.map(item => ({ label: item.label, icon: item.icon })) },
    { title: 'Ngân sách', rows: budgetOptions.map(item => ({ label: item.label, icon: item.icon })) },
    { title: 'Loại món (bữa chính)', rows: dishSetupCatalogue.categories.map(item => ({ label: item.label, icon: preferenceAssets[item.code ?? ''] })) },
    { title: 'Loại món (Ăn vặt)', rows: (dishSetupCatalogue.snackCategories ?? []).map(item => ({ label: item.label, icon: preferenceAssets[item.code ?? ''] })) },
    { title: 'Ẩm thực', rows: dishSetupCatalogue.cuisines.map(item => ({ label: item.label, icon: preferenceAssets[item.code ?? ''] })) },
    { title: 'Hương vị', rows: [...flavorChoices.map(item => ({ label: item.label, icon: preferenceAssets[item.id] })), { label: fattyChoice.label, icon: preferenceAssets.fatty }] },
  ];
  return <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      {groups.map(group => <View key={group.title} style={styles.group}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{group.title}</Text>
        <View style={styles.grid}>{group.rows.map(row => <View key={row.label} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {row.icon ? <ChoiceIconView icon={row.icon} size={28} color={colors.primary} /> : <Text style={{ color: colors.danger }}>?</Text>}
          <Text style={[styles.label, { color: colors.text }]}>{row.label}</Text>
        </View>)}</View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 20 },
  group: { gap: 10 },
  title: { fontFamily: 'InterBold', fontSize: 17, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: 104, minHeight: 88, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  label: { fontFamily: 'InterMedium', fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
