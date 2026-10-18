import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppHeader, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

export function IntegrationUnavailable({ title, onHome }: { title: string; onHome: () => void }) {
  const { colors } = useShellTheme();
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <AppHeader title={title} onPressBrand={onHome} colors={colors} />
    <View style={styles.content}>
      <StatusNotice title="API thật chưa được cấu hình" message="Màn này không dùng fixture. Cấu hình EXPO_PUBLIC_SUPABASE_URL và publishable key cho chế độ tích hợp rồi mở lại." tone="warning" colors={colors} />
      <Text style={[styles.helper, { color: colors.muted }]}>Không đặt service-role key trong ứng dụng. Dữ liệu mẫu nằm ở luồng demo riêng.</Text>
      <AppButton label="Về màn hình chính" onPress={onHome} colors={colors} />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, padding: 20, gap: 16, justifyContent: 'center' },
  helper: { fontSize: 13, lineHeight: 19 },
});
