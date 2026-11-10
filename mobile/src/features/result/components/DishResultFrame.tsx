import { useEffect, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';

export function DishResultFrame({ children, onHome, onNewSession }: { children: ReactNode; onHome: () => void; onNewSession?: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { onHome(); return true; }); return () => listener.remove(); }, [onHome]);
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Đóng kết quả" onPress={onHome} style={styles.close}><Text style={[styles.cross, { color: colors.text }, textStyle(400)]}>×</Text></Pressable><Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Kết quả</Text><View style={styles.close} /></View>
    <ScrollView contentContainerStyle={styles.content}>
      {children}
      <View style={styles.footer}>{onNewSession ? <AppButton label="Tạo phòng mới" onPress={onNewSession} colors={colors} style={styles.action} /> : null}<AppButton label="Về trang chủ" variant="secondary" onPress={onHome} colors={colors} style={styles.action} /></View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, width: '100%', maxWidth: 480, alignSelf: 'center', minHeight: 60 }, close: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }, cross: { fontSize: 34, lineHeight: 40 }, title: { flex: 1, textAlign: 'center', fontSize: 20, lineHeight: 28 }, content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, paddingTop: 4, gap: 16 }, footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 'auto', paddingTop: 8 }, action: { flexGrow: 1, flexBasis: 140 } });
