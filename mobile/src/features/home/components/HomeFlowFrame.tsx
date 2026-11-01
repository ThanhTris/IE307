import { useEffect, type ReactNode } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppHeader } from '../../../shared/ui';

export function HomeFlowFrame({ title, onHome, isMock, children }: { title: string; onHome: () => void; isMock?: boolean; children: ReactNode }) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onHome(); return true; });
    return () => subscription.remove();
  }, [onHome]);
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <AppHeader variant="back" title={title} onPressBack={onHome} backIconSource={require('../../../../assets/brand/home/back.png')} brandTextStyle={textStyle(700)} colors={colors} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {isMock ? <Text style={[styles.mock, { color: colors.muted }, textStyle(500)]}>Mô phỏng · GM-09 · dữ liệu mẫu</Text> : null}
      {children}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 46, paddingBottom: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  mock: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
});
