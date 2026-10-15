import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

type Props = { onBack: () => void; onOpen: (route: 'lobby' | 'room-status' | 'friends' | 'inbox' | 'history') => void };

const destinations = [
  ['lobby', 'GM-11 · Phòng chờ', 'Host/member, ready chủ động và reset khi đổi bối cảnh.'],
  ['room-status', 'GM-11 · Trạng thái phòng', 'Loading, lỗi, offline, expired và xác nhận rời/hủy.'],
  ['friends', 'GM-14 · Bạn bè', 'Mời, chấp nhận, từ chối, xóa bạn và trạng thái hết hạn.'],
  ['inbox', 'GM-14 · Hộp thư', 'Lời mời/kết quả; inbox vẫn đọc được khi push bị từ chối.'],
  ['history', 'GM-14 · Lịch sử', 'Consent, xóa summary và thời điểm lấy fixture.'],
] as const;

export function FeaturePreviewHubScreen({ onBack, onOpen }: Props) {
  const { colors } = useShellTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Màn hình mock · GM-11/14</Text>
        <StatusNotice title="Preview có fixture tổng hợp" message="Các màn gọi ApiClient mock với mode hiển thị rõ. Không phải API/server thật hoặc native integration." colors={colors} />
        {destinations.map(([route, title, description]) => (
          <AppButton key={route} label={`${title} · Mở`} variant="secondary" onPress={() => onOpen(route)} accessibilityHint={description} colors={colors} />
        ))}
        <AppButton label="Quay lại cấu trúc ứng dụng" variant="quiet" onPress={onBack} colors={colors} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: 20, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800', marginTop: 12 },
});
