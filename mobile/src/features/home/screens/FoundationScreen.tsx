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

export function FoundationScreen({
  onBack, onOpenComponents, onOpenFeaturePreview, onOpenGm25, onOpenResultPreview,
}: {
  onBack: () => void;
  onOpenComponents?: () => void;
  onOpenFeaturePreview?: () => void;
  onOpenGm25?: () => void;
  onOpenResultPreview?: () => void;
}) {
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
        {onOpenComponents ? <Pressable accessibilityRole="button" accessibilityLabel="Mở component mẫu GM-05" onPress={onOpenComponents} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }]}>Mở component mẫu GM-05</Text>
        </Pressable> : null}
        {onOpenFeaturePreview ? <Pressable accessibilityRole="button" accessibilityLabel="Mở các màn mock GM-11 và GM-14" onPress={onOpenFeaturePreview} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }]}>Mở màn mock GM-11/14</Text>
        </Pressable> : null}
        {onOpenGm25 ? <Pressable accessibilityRole="button" accessibilityLabel="Kiểm tra luồng GM-25" onPress={onOpenGm25} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }]}>Kiểm tra luồng GM-25 (Flow Check)</Text>
        </Pressable> : null}
        {onOpenResultPreview ? <Pressable accessibilityRole="button" accessibilityLabel="Mở kết quả GM-13" onPress={onOpenResultPreview} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.text }]}>Mở kết quả và chưa đồng thuận · GM-13</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="button" onPress={onBack} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Quay lại</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
