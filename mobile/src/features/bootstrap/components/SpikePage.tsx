import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSpikeColors() {
  return useColorScheme() === 'dark'
    ? { background: '#151920', card: '#242c38', text: '#f5f7fa', muted: '#ccd4df', action: '#9ec5ff', onAction: '#112038' }
    : { background: '#f3f5f7', card: '#ffffff', text: '#18202b', muted: '#445267', action: '#184e9b', onAction: '#ffffff' };
}

export function SpikePage({ children }: PropsWithChildren) {
  const colors = useSpikeColors();
  const insets = useSafeAreaInsets();
  return <ScrollView style={{ backgroundColor: colors.background }} keyboardShouldPersistTaps="handled"
    contentContainerStyle={[styles.page, {
      paddingBottom: Math.max(insets.bottom, 20),
      paddingLeft: Math.max(insets.left, 16),
      paddingRight: Math.max(insets.right, 16),
    }]}>
    {children}
  </ScrollView>;
}

export function SpikeCard({ title, children }: PropsWithChildren<{ title: string }>) {
  const colors = useSpikeColors();
  return <View style={[styles.card, { backgroundColor: colors.card }]}>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
    {children}
  </View>;
}

export function SpikeText({ children, status = false }: PropsWithChildren<{ status?: boolean }>) {
  const colors = useSpikeColors();
  return <Text accessibilityLiveRegion={status ? 'polite' : 'none'} style={[styles.text, { color: colors.text }]}>{children}</Text>;
}

export function SpikeButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  const colors = useSpikeColors();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: colors.action, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
    <Text style={[styles.buttonText, { color: colors.onAction }]}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { padding: 16, gap: 12, borderRadius: 16 },
  title: { fontSize: 21, fontWeight: '700' },
  text: { fontSize: 16, lineHeight: 25 },
  button: { minHeight: 48, padding: 14, borderRadius: 10, justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
