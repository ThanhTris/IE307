import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppHeader } from '../../../shared/ui';
import { radii, spacing, typography } from '../../../shared/theme/tokens';

export function SetupFrame({ title, onBack, onHome, busy = false, controls, children }: { title: string; onBack: () => void; onHome?: () => void; busy?: boolean; controls?: ReactNode; children: ReactNode }) {
  const { colors } = useShellTheme();
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { if (!busy) onBack(); return true; });
    return () => handler.remove();
  }, [busy, onBack]);
  return <SafeAreaView style={[setupStyles.root, { backgroundColor: colors.background }]}>
    <AppHeader colors={colors} onPressBrand={busy ? undefined : onHome} />
    <KeyboardAvoidingView style={setupStyles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={setupStyles.content}>
        <AppButton label="‹ Quay lại" variant="quiet" disabled={busy} onPress={onBack} colors={colors} />
        <Text style={[setupStyles.caption, { color: colors.muted }]}>Mô phỏng · GM-10 · dữ liệu mẫu</Text>
        <Text accessibilityRole="header" style={[setupStyles.title, { color: colors.text }]}>{title}</Text>
        {children}
        {controls ? <SetupTools disabled={busy}>{controls}</SetupTools> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function SetupSection({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useShellTheme();
  return <View style={[setupStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text accessibilityRole="header" style={[setupStyles.heading, { color: colors.text }]}>{title}</Text>{children}
  </View>;
}

export function SetupToggle({ label, accessibilityLabel = label, value, disabled, onValueChange }: {
  label: string; accessibilityLabel?: string; value: boolean; disabled: boolean; onValueChange: (value: boolean) => void;
}) {
  const { colors } = useShellTheme();
  return <View style={setupStyles.toggleRow}>
    <Text style={[setupStyles.body, setupStyles.toggleLabel, { color: colors.text }]}>{label}</Text>
    <Switch accessibilityLabel={accessibilityLabel} disabled={disabled} value={value} onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }} style={setupStyles.toggle} />
  </View>;
}

function SetupTools({ disabled, children }: { disabled: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { colors } = useShellTheme();
  return <View style={setupStyles.section}>
    <Pressable accessibilityRole="button" accessibilityLabel="Công cụ kiểm thử GM-10" accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen(v => !v)} style={setupStyles.toolToggle}>
      <Text style={[setupStyles.body, { color: colors.muted }]}>{open ? '−' : '+'} Công cụ kiểm thử GM-10</Text>
    </Pressable>
    {open ? children : null}
  </View>;
}

export const setupStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg, width: '100%', maxWidth: 600, alignSelf: 'center' },
  title: { ...typography.titleLarge }, heading: { ...typography.titleMedium }, body: { ...typography.body }, caption: { ...typography.caption },
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  section: { gap: spacing.md }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  anchorGroup: { borderRadius: radii.md, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  toggleLabel: { flex: 1, flexShrink: 1 }, toggle: { flexShrink: 0 },
  confirmation: { minHeight: 72, borderRadius: radii.xl, borderWidth: 2, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  confirmationLabel: { flex: 1, flexShrink: 1, gap: spacing.xs },
  checkbox: { width: 28, height: 28, borderRadius: radii.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxTick: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  hero: { borderRadius: radii.xl, borderWidth: 2, padding: spacing.xl, minHeight: 88, justifyContent: 'center', gap: spacing.sm },
  toolToggle: { minHeight: 48, justifyContent: 'center' },
});
