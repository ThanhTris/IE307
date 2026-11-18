import { StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { AppButton, AppHeader, AppIcon } from '../../../shared/ui';
import { ApiFeatureFrame } from '../../../shared/ui/layout/ApiFeatureFrame';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';

const copy = {
  friends: { title: 'Bạn bè', message: 'Đăng nhập để kết bạn và rủ hội thân đi ăn dễ hơn.' },
  history: { title: 'Lịch sử', message: 'Đăng nhập để lưu lại những bữa đã chốt và xem lại bất cứ lúc nào.' },
};

export function GuestFeatureNotice({ feature, onNavigate, onHome, onBack }: {
  feature: keyof typeof copy;
  onNavigate: (path: string) => void;
  onHome: () => void;
  onBack?: () => void;
}) {
  const { colors } = useShellTheme();
  const { title, message } = copy[feature];
  const header = <AppHeader onPressBrand={onHome} showFriends={false} showInbox={false} showProfile={false}
    allowTitleWrap hideDivider colors={{ ...colors, surface: colors.background }} />;
  return <ApiFeatureFrame active={feature} title={title} onNavigate={onNavigate} onHome={onHome} onBack={onBack} topBar={header}>
    <View style={styles.content}>
      <View style={[styles.icon, { backgroundColor: colors.warm }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppIcon name={feature} size={36} color={colors.primary} />
      </View>
      <Text accessibilityRole="header" style={[typography.titleLarge, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.body, styles.message, { color: colors.muted }]}>{message}</Text>
      <AppButton label="Đăng nhập" onPress={() => onNavigate('/account/sign-in')} colors={colors} />
    </View>
  </ApiFeatureFrame>;
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  icon: { width: 80, height: 80, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  message: { textAlign: 'center', maxWidth: 300 },
});
