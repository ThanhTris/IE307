import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { HomeFlowFrame } from '../components/HomeFlowFrame';

export function GuestSessionExpiredScreen({ onReset, onHome, isMock }: { onReset: () => Promise<boolean>; onHome: () => void; isMock?: boolean }) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const locked = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reset = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(false);
    let success = false;
    try { success = await onReset(); } catch { /* Show the same recoverable state without exposing errors. */ }
    if (!mounted.current) return;
    if (!success) { locked.current = false; setBusy(false); setError(true); }
  };
  return <HomeFlowFrame title="Phiên khách" onHome={() => { if (!locked.current) onHome(); }} isMock={isMock}>
    <View style={styles.message}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.symbol, { borderColor: colors.line, backgroundColor: colors.warm }]}><Text allowFontScaling={false} style={[styles.exclamation, { color: colors.text }, textStyle(700)]}>!</Text></View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Phiên khách đã hết hạn</Text>
      <Text style={[styles.description, { color: colors.muted }, textStyle(400)]}>Nhập tên để tiếp tục dùng ứng dụng.</Text>
    </View>
    {error ? <StatusNotice title="Chưa xóa được phiên cũ" message="Hãy thử lại trước khi nhập tên cho phiên mới." tone="error" colors={colors} /> : null}
    <View style={styles.spacer} />
    <AppButton label="Nhập tên" onPress={() => { void reset(); }} loading={busy} textStyle={textStyle(600)} colors={colors} />
  </HomeFlowFrame>;
}

const styles = StyleSheet.create({
  message: { alignItems: 'center', paddingTop: 77 },
  symbol: { width: 92, height: 92, borderRadius: 46, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  exclamation: { fontSize: 55, lineHeight: 67 },
  title: { fontSize: 25, lineHeight: 32, textAlign: 'center', marginTop: 36 },
  description: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 20, maxWidth: 336 },
  spacer: { flexGrow: 1, minHeight: 32 },
});
