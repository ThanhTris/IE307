import { useEffect, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppHeader } from '../../../shared/ui';

export function HomeFlowFrame({ title, onHome, busy = false, children, centeredTitle = false, compact = false }: { title: string; onHome: () => void; busy?: boolean; children: ReactNode; centeredTitle?: boolean; compact?: boolean }) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { if (!busy) onHome(); return true; });
    return () => subscription.remove();
  }, [onHome, busy]);
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <AppHeader variant="back" title={title} onPressBack={busy ? undefined : onHome} allowTitleWrap hideDivider centeredTitle={centeredTitle} backIconSource={require('../../../../assets/brand/home/back.png')} brandTextStyle={textStyle(700)} colors={colors} />
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={[styles.content, compact && { paddingTop: 24 }]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 46, paddingBottom: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
