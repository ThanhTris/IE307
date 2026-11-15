import { useEffect, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppHeader } from '../../../shared/ui';
import { CONTAINER_STYLE, CONTAINER_GUTTER } from '../../../shared/ui/layout/ScreenContainer';

export function DishSetupFrame({ title, onBack, busy, children, footer, action }: {
  title: string; onBack: () => void; busy?: boolean; children: ReactNode; footer: ReactNode; action?: ReactNode;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!busy) onBack(); return true; }); return () => listener.remove(); }, [busy, onBack]);
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <View style={styles.header}><View style={styles.title}><AppHeader variant="back" title={title} centeredTitle hideDivider allowTitleWrap colors={colors} onPressBack={busy ? undefined : onBack} brandTextStyle={textStyle(700)} /></View>{action ? <View pointerEvents="box-none" style={styles.actionLayer}><View pointerEvents="box-none" style={styles.actionInner}><View style={styles.action}>{action}</View></View></View> : null}</View>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView testID="screen-content" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}<View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, actionLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, actionInner: { ...CONTAINER_STYLE, flex: 1 }, action: { position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' }, title: { flex: 1 }, content: { flexGrow: 1, padding: CONTAINER_GUTTER, paddingTop: 8, gap: 16, ...CONTAINER_STYLE }, footer: { marginTop: 'auto', paddingTop: 24, gap: 12 } });
