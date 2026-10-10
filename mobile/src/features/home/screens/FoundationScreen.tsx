import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { styles } from './AppShellScreen';

const layers = [
  ['app', 'Routes mỏng và navigation; màn chi tiết ở features.'],
  ['features', 'Home, rooms, context, preferences, voting, result, friends, inbox, history, account.'],
  ['shared', 'UI, theme, lib và types dùng chung; component hoàn thiện tại GM-05.'],
  ['domain', 'Decision và eligibility thuần, không UI/network.'],
  ['data', 'API, auth và local adapters; contract/client tại GM-07.'],
] as const;

export function FoundationScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useShellTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Cấu trúc ứng dụng</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Đây là kiểm tra điều hướng của GM-02, không phải màn nghiệp vụ hay danh sách tính năng đã hoàn thành.</Text>
        {layers.map(([name, description]) => (
          <View key={name} style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.body, { color: colors.muted }]}>{description}</Text>
          </View>
        ))}
        <Pressable accessibilityRole="button" onPress={onBack} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Quay lại</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
