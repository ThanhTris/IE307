import { useEffect, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppHeader } from '../../../shared/ui';

export function DishSetupFrame({ title, onBack, busy, children, footer, action }: {
  title: string; onBack: () => void; busy?: boolean; children: ReactNode; footer: ReactNode; action?: ReactNode;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!busy) onBack(); return true; }); return () => listener.remove(); }, [busy, onBack]);
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <View style={styles.header}><View style={styles.title}><AppHeader variant="back" title={title} centeredTitle hideDivider allowTitleWrap colors={colors} onPressBack={busy ? undefined : onBack} backIconSource={require('../../../../assets/brand/home/back.png')} brandTextStyle={textStyle(700)} /></View>{action}</View>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.mock, { color: colors.muted }, textStyle(500)]}>Mô phỏng · thiết lập phòng · dữ liệu mẫu</Text>
        {children}<View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center' }, title: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingTop: 8, gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' }, mock: { fontSize: 12, lineHeight: 18 }, footer: { marginTop: 'auto', paddingTop: 24, gap: 12 } });
