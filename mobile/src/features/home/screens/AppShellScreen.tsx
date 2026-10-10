import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

type Props = { onOpenFoundation: () => void };

export function AppShellScreen({ onOpenFoundation }: Props) {
  const { colors } = useShellTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>GÌ CŨNG ĐƯỢC</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Chọn một món.{ '\n' }Vui cả nhóm.</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Không cần tranh luận ăn gì. Cùng chọn món phù hợp cho cả nhóm.</Text>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>Nền ứng dụng đã sẵn sàng</Text>
          <Text style={[styles.body, { color: colors.muted }]}>Bản GM-02 chỉ có app shell và điều hướng. Tạo phòng, chọn món và kết quả sẽ được triển khai trong các task tiếp theo.</Text>
          <Text style={[styles.body, { color: colors.muted }]}>Chưa kết nối API. Không yêu cầu tài khoản hay quyền vị trí để mở bản nền này.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Xem cấu trúc ứng dụng" onPress={onOpenFoundation} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>Xem cấu trúc ứng dụng</Text>
        </Pressable>
        <Text style={[styles.caption, { color: colors.muted }]}>Expo Go · Android-first · GM-02</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: 24, gap: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  eyebrow: { fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 24 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  panel: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 16 },
  button: { minHeight: 52, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonLabel: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  caption: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
