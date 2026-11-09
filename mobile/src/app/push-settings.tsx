import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PushSettingsScreen } from '../features/inbox/screens/PushSettingsScreen';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { AppButton, AppHeader, StatusNotice } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';

export default function PushSettingsRoute() {
  const router = useRouter();
  const session = useRoomRepository();
  const { colors } = useShellTheme();
  if (session.mode !== 'real') return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <AppHeader title="Thông báo" onPressBrand={() => router.replace('/')} colors={colors} />
    <Text style={[styles.title, { color: colors.text }]}>Cài đặt thông báo trên thiết bị</Text>
    <StatusNotice title="Cần đăng nhập" message="Đăng nhập bằng kết nối thật để quản lý đăng ký push. Hộp thư mô phỏng vẫn hoạt động." tone="info" colors={colors} />
    <AppButton label="Quay lại Hộp thư" variant="quiet" onPress={() => router.replace('/inbox')} colors={colors} />
  </SafeAreaView>;
  if (session.isInitializing) return null;
  if (!session.user || session.status !== 'active') return <Redirect href="/welcome" />;
  return <PushSettingsScreen
    repository={session.repository}
    onHome={() => router.replace('/')}
    onInbox={() => router.replace('/inbox')}
  />;
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '800' },
});
