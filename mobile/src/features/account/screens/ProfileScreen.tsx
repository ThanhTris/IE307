import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { AppButton, ApiFeatureFrame, SheetDialog } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

type Props = {
  displayName: string;
  onNavigate: (path: string) => void;
  onHome: () => void;
};

/** Figma 232:349 "Cá nhân · Khách". Accounts are P1, so both account actions explain that guests can keep playing. */
export function ProfileScreen({ displayName, onNavigate, onHome }: Props) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  const [accountPanel, setAccountPanel] = useState<'Đăng nhập' | 'Tạo tài khoản'>();
  const initial = (displayName.trim() || 'Khách').slice(0, 1).toUpperCase();
  return (
    <ApiFeatureFrame active="profile" title="Cá nhân" onNavigate={onNavigate} onHome={onHome}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Cá nhân</Text>
      <View style={[styles.card, { backgroundColor: colors.warm }]}>
        <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.avatarText, { color: colors.text }, textStyle(500)]}>{initial}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.text }, textStyle(700)]}>Đăng nhập</Text>
        <Text style={[styles.cardBody, { color: colors.muted }, textStyle(400)]}>Giữ bạn bè và lịch sử khi đổi máy.</Text>
      </View>
      <AppButton label="Đăng nhập" onPress={() => setAccountPanel('Đăng nhập')} colors={colors} textStyle={textStyle(600)} />
      <AppButton label="Tạo tài khoản" variant="secondary" onPress={() => setAccountPanel('Tạo tài khoản')} colors={colors} textStyle={textStyle(600)} />
      <Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Bạn vẫn có thể tạo hoặc tham gia phòng với tư cách khách.</Text>
      <SheetDialog visible={!!accountPanel} title={accountPanel ?? 'Tài khoản'} onClose={() => setAccountPanel(undefined)} colors={colors}>
        <Text style={[styles.cardBody, { color: colors.text }, textStyle(400)]}>Tài khoản sẽ có trong bản cập nhật tới. Bạn vẫn dùng đầy đủ tính năng với tư cách khách.</Text>
        <AppButton label="Đã hiểu" onPress={() => setAccountPanel(undefined)} colors={colors} textStyle={textStyle(600)} />
      </SheetDialog>
    </ApiFeatureFrame>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 36 },
  card: { alignItems: 'center', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 20, gap: 10 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, lineHeight: 36 },
  cardTitle: { fontSize: 20, lineHeight: 28, textAlign: 'center' },
  cardBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  note: { fontSize: 13, lineHeight: 20 },
});
