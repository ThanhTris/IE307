import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppHeader, StatusNotice } from '../../../shared/ui';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import type { ErrorCode } from '../../../data/api/contracts';
import { errorCopy } from '../services/roomEntry';

export type PreviewControlsProps = { previewControls?: (busy: boolean) => ReactNode };
export function RoomEntryFrame({ title, subtitle, onBack, busy = false, children, previewControls }: PreviewControlsProps & { title: string; subtitle?: string; onBack: () => void; busy?: boolean; children: ReactNode }) {
  const { colors } = useShellTheme();
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { if (busy) return true; onBack(); return true; });
    return () => handler.remove();
  }, [onBack, busy]);
  return <SafeAreaView style={[entryStyles.root, { backgroundColor: colors.background }]}>
    <AppHeader onPressBrand={busy ? undefined : onBack} colors={colors} />
    <KeyboardAvoidingView style={entryStyles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={entryStyles.content}>
        <AppButton label="‹ Quay lại" variant="quiet" onPress={onBack} disabled={busy} style={entryStyles.back} colors={colors} />
        <View style={entryStyles.section}>
          <MockLabel />
          <Text accessibilityRole="header" style={[entryStyles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[entryStyles.body, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
        {children}
        {previewControls ? <PreviewTools busy={busy}>{previewControls(busy)}</PreviewTools> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function MockLabel() {
  const { colors } = useShellTheme();
  return <View style={entryStyles.section}>
    <View style={[entryStyles.mockBadge, { backgroundColor: colors.soft }]}>
      <Text style={[entryStyles.caption, { color: colors.text }]}>Mô phỏng · GM-09</Text>
    </View>
    <Text style={[entryStyles.caption, { color: colors.muted }]}>Dữ liệu mẫu · chưa kết nối phòng thật</Text>
  </View>;
}

export function EntrySection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const { colors } = useShellTheme();
  return <View style={[entryStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text accessibilityRole="header" style={[entryStyles.sectionTitle, { color: colors.text }]}>{title}</Text>
    {description ? <Text style={[entryStyles.body, { color: colors.muted }]}>{description}</Text> : null}
    {children}
  </View>;
}

export function PreviewTools({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  const { colors } = useShellTheme();
  const [expanded, setExpanded] = useState(false);
  return <View style={[entryStyles.tools, { borderColor: colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Công cụ kiểm thử" accessibilityState={{ expanded, disabled: busy }} disabled={busy} onPress={() => setExpanded(value => !value)} style={({ pressed }) => [entryStyles.toolsToggle, { opacity: busy || pressed ? 0.6 : 1 }]}>
      <Text style={[entryStyles.body, { color: colors.muted, flex: 1 }]}>Công cụ kiểm thử</Text>
      <Text accessible={false} style={[entryStyles.body, { color: colors.muted }]}>{expanded ? '−' : '＋'}</Text>
    </Pressable>
    {expanded ? <View style={entryStyles.section}>{children}</View> : null}
  </View>;
}

export function EntryError({ code, onRetry }: { code: ErrorCode; onRetry?: () => void }) {
  const { colors } = useShellTheme();
  return <StatusNotice title="Chưa thể tiếp tục" message={errorCopy[code]} tone="error" actionLabel={onRetry ? 'Thử tải lại' : undefined} onAction={onRetry} colors={colors} />;
}

export const entryStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl, width: '100%', maxWidth: 600, alignSelf: 'center' },
  title: { ...typography.titleLarge }, body: { ...typography.body }, caption: { ...typography.caption },
  sectionTitle: { ...typography.titleMedium },
  section: { gap: spacing.md }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.lg },
  hero: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.lg },
  heroArt: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.md },
  plate: { width: 96, height: 96, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  foodEmoji: { fontSize: 52, lineHeight: 70 },
  artCaption: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mockBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill },
  back: { alignSelf: 'flex-start' },
  tools: { borderTopWidth: 1, gap: spacing.md },
  toolsToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  codeRow: { flexDirection: 'row', gap: spacing.xs },
  codeCell: { flex: 1, minWidth: 0, minHeight: 56, borderWidth: 1, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  codeLetter: { ...typography.titleMedium },
  scanner: { minHeight: 180, borderWidth: 2, borderStyle: 'dashed', borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
