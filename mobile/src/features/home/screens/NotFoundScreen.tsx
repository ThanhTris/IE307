import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

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

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: 24, gap: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  button: { minHeight: 52, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonLabel: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
});
