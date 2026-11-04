import { StyleSheet, Text, View } from 'react-native';
import { MOCK_CURRENT_USER } from '../../../data/api';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void };

export function GuestProfileScreen({ onNavigate, onHome }: Props) {
  const colors = useDemoColors();
  return (
    <DemoFrame title="Cá nhân" subtitle="GM-14 · hồ sơ khách mẫu" active="profile" onNavigate={onNavigate} onHome={onHome} mode="default" onModeChange={() => undefined} showModePicker={false}>
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={[styles.avatar, { backgroundColor: colors.warm }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{MOCK_CURRENT_USER.displayName.slice(0, 1)}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.name, { color: colors.text }]}>{MOCK_CURRENT_USER.displayName}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>Phiên khách · dữ liệu mock</Text>
        <Text style={[styles.body, { color: colors.text }]}>Hồ sơ này chỉ dùng để xem giao diện. Không có email, số điện thoại hoặc tài khoản thật được hiển thị.</Text>
      </View>
      <StatusNotice title="Chưa liên kết tài khoản" message="Đăng ký, đăng nhập, khôi phục và quản lý tài khoản thật thuộc phạm vi P1." tone="info" colors={colors} />
      <AppButton label="Mở cài đặt" onPress={() => onNavigate('settings')} colors={colors} />
    </DemoFrame>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 20, gap: 10 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '800' },
  name: { fontSize: 20, lineHeight: 26, fontWeight: '800', textAlign: 'center' },
  meta: { fontSize: 13, lineHeight: 19 },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
