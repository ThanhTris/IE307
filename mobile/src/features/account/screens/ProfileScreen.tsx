import { StyleSheet, Text, View } from 'react-native';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { ApiFeatureFrame } from '../../shared/components/ApiFeatureFrame';

type Props = {
  displayName: string;
  onNavigate: (path: string) => void;
  onHome: () => void;
  onTutorial?: () => void;
};

export function ProfileScreen({ displayName, onNavigate, onHome, onTutorial }: Props) {
  const { colors } = useShellTheme();
  const name = displayName.trim() || 'Khách';
  return (
    <ApiFeatureFrame active="profile" title="Cá nhân" onNavigate={onNavigate} onHome={onHome}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Cá nhân</Text>
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={[styles.avatar, { backgroundColor: colors.warm }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>Phiên khách trên thiết bị này</Text>
      </View>
      <StatusNotice title="Chưa liên kết tài khoản" message="Bạn đang dùng với tư cách khách. Lịch sử và bạn bè gắn với phiên trên thiết bị này." tone="info" colors={colors} />
      <AppButton label="Cài đặt" onPress={() => onNavigate('/settings')} colors={colors} />
      {onTutorial ? <AppButton label="Xem lại hướng dẫn" variant="secondary" onPress={onTutorial} colors={colors} /> : null}
    </ApiFeatureFrame>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'InterBold', fontSize: 28, lineHeight: 36 },
  profileCard: { alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 20, gap: 10 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'InterBold', fontSize: 30 },
  name: { fontFamily: 'InterBold', fontSize: 20, lineHeight: 26, textAlign: 'center' },
  meta: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 19 },
});
