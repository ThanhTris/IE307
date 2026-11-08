import { useEffect, type ReactNode } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppHeader, StatusNotice } from '../../../shared/ui';
import { radii, spacing, typography } from '../../../shared/theme/tokens';

export function ResultFrame({ onHome, children }: { onHome: () => void; children: ReactNode }) {
  const { colors } = useShellTheme();
  useEffect(() => {
    // Terminal screens never navigate back into an already submitted voting round.
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { onHome(); return true; });
    return () => handler.remove();
  }, [onHome]);
  return <SafeAreaView style={[resultStyles.root, { backgroundColor: colors.bg }]}>
    <AppHeader onPressBrand={() => onHome()} colors={colors} />
    {children}
  </SafeAreaView>;
}
export function ResultPreviewLabel({ label }: { label?: string }) {
  const { colors } = useShellTheme();
  return label ? <StatusNotice title={label} message="Dữ liệu tổng hợp cố định. Thao tác nơi bán chỉ mô phỏng, không mở ứng dụng ngoài hoặc sao chép thật." colors={colors} /> : null;
}
export function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useShellTheme();
  return <View style={[resultStyles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
    <Text accessibilityRole="header" style={[resultStyles.heading, { color: colors.text }]}>{title}</Text>{children}
  </View>;
}
export const resultStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1 },
  stack: { gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  title: { ...typography.titleLarge, textAlign: 'center' },
  heading: typography.titleMedium,
  body: typography.body,
  caption: typography.caption,
  center: { textAlign: 'center' },
  emoji: { fontSize: 64, lineHeight: 88 },
  badge: { padding: spacing.md, borderRadius: radii.pill },
  card: { padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, flexBasis: 130 },
});
