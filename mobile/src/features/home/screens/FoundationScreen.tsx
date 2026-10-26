import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
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
  const { status: fontStatus, textStyle } = useAppFonts();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Cấu trúc ứng dụng</Text>
        <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Đây là kiểm tra điều hướng của GM-02, không phải màn nghiệp vụ hay danh sách tính năng đã hoàn thành.</Text>
        {layers.map(([name, description]) => (
          <View key={name} style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(600)]}>{name}</Text>
            <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>{description}</Text>
          </View>
        ))}
        <View accessibilityLabel="Mẫu bốn độ đậm của phông Inter" style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(600)]}>Kiểm phông · Inter 400 / 500 / 600 / 700</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.muted }, textStyle(400)]}>Trạng thái phông: {fontStatus === 'ready' ? 'Inter sẵn sàng' : fontStatus === 'loading' ? 'Đang tải · dùng phông hệ thống' : 'Dùng phông hệ thống dự phòng'}</Text>
          <Text style={[styles.body, { color: colors.text }, textStyle(400)]}>400 · Cả nhóm ăn gì? Phở, bún, cơm — tiếng Việt đầy đủ.</Text>
          <Text style={[styles.body, { color: colors.text }, textStyle(500)]}>500 · Cả nhóm ăn gì? Phở, bún, cơm — tiếng Việt đầy đủ.</Text>
          <Text style={[styles.body, { color: colors.text }, textStyle(600)]}>600 · Cả nhóm ăn gì? Phở, bún, cơm — tiếng Việt đầy đủ.</Text>
          <Text style={[styles.body, { color: colors.text }, textStyle(700)]}>700 · Cả nhóm ăn gì? Phở, bún, cơm — tiếng Việt đầy đủ.</Text>
        </View>
        {onOpenComponents ? <Pressable accessibilityRole="button" accessibilityLabel="Mở component mẫu GM-05" onPress={onOpenComponents} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }, textStyle(600)]}>Mở component mẫu GM-05</Text>
        </Pressable> : null}
        {onOpenFeaturePreview ? <Pressable accessibilityRole="button" accessibilityLabel="Mở các màn mock GM-11 và GM-14" onPress={onOpenFeaturePreview} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }, textStyle(600)]}>Mở màn mock GM-11/14</Text>
        </Pressable> : null}
        {onOpenGm25 ? <Pressable accessibilityRole="button" accessibilityLabel="Kiểm tra luồng GM-25" onPress={onOpenGm25} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.primary }, textStyle(600)]}>Kiểm tra luồng GM-25 (Flow Check)</Text>
        </Pressable> : null}
        {onOpenResultPreview ? <Pressable accessibilityRole="button" accessibilityLabel="Mở kết quả GM-13" onPress={onOpenResultPreview} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.text }, textStyle(600)]}>Mở kết quả và chưa đồng thuận · GM-13</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="button" onPress={onBack} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[styles.buttonLabel, { color: colors.onPrimary }, textStyle(600)]}>Quay lại</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
