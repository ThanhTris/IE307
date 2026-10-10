import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { styles } from './AppShellScreen';

export function NotFoundScreen({ onHome }: { onHome: () => void }) {
  const { colors } = useShellTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Không tìm thấy trang</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Đường dẫn này chưa có trong ứng dụng.</Text>
        <Pressable accessibilityRole="button" onPress={onHome} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Về trang đầu</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
