import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

export type ApiFeature = 'friends' | 'inbox' | 'history';

const features: { id: ApiFeature; label: string; path: string }[] = [
  { id: 'friends', label: 'Bạn bè', path: '/gm28/friends' },
  { id: 'inbox', label: 'Hộp thư', path: '/gm28/inbox' },
  { id: 'history', label: 'Lịch sử', path: '/gm28/history' },
];

export function ApiFeatureFrame({ active, title, onNavigate, onHome, children }: {
  active: ApiFeature;
  title: string;
  onNavigate: (path: string) => void;
  onHome: () => void;
  children: ReactNode;
}) {
  const { colors } = useShellTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={title} onPressBrand={onHome} colors={colors} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View accessibilityRole="tablist" style={styles.tabs}>
          {features.map(feature => {
            const selected = feature.id === active;
            return (
              <Pressable
                key={feature.id}
                accessibilityRole="tab"
                accessibilityLabel={feature.label}
                accessibilityState={{ selected }}
                onPress={() => onNavigate(feature.path)}
                style={[styles.tab, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: colors.line }]}
              >
                <Text style={[styles.tabText, { color: selected ? colors.onPrimary : colors.text }]}>{feature.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, minHeight: 48, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  tabText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
