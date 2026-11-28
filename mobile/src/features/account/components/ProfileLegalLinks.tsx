import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { spacing, typography, radii } from '../../../shared/theme/tokens';
import { Text } from '../../../shared/ui/forms/ScaledText';

const legalLinks = [
  { label: 'Chính sách quyền riêng tư', url: 'https://thanhtris.github.io/IE307/privacy/' },
  { label: 'Điều khoản sử dụng', url: 'https://thanhtris.github.io/IE307/terms/' },
  { label: 'Hỗ trợ', url: 'https://thanhtris.github.io/IE307/support/' },
];

export function ProfileLegalLinks() {
  const { colors } = useShellTheme();
  const [failed, setFailed] = useState(false);
  const version = Constants.expoConfig?.version;
  const open = async (url: string) => {
    setFailed(false);
    try { await Linking.openURL(url); }
    catch { setFailed(true); }
  };

  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[typography.titleMedium, { color: colors.text }]}>Thông tin ứng dụng</Text>
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {legalLinks.map(link => <Pressable key={link.url} accessibilityRole="link" accessibilityLabel={link.label} accessibilityHint="Mở trong trình duyệt"
        onPress={() => { void open(link.url); }} style={[styles.row, { borderBottomColor: colors.line }]}>
        <Text style={[styles.label, typography.body, { color: colors.text }]}>{link.label}</Text>
        <Text accessible={false} style={{ color: colors.muted }}>↗</Text>
      </Pressable>)}
      <View style={styles.version}>
        <Text style={[typography.body, { color: colors.muted }]}>Phiên bản {version ?? 'chưa xác định'}</Text>
      </View>
    </View>
    {failed ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>
      Không mở được liên kết. Hãy thử lại.
    </Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { borderRadius: radii.lg, borderWidth: 1 },
  row: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1 },
  version: { padding: spacing.lg },
});
