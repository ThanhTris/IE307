import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomNavigation } from './AppBottomNavigation';
import { AppHeader } from './AppHeader';
import type { AppIconName } from '../icons/AppIcon';
import { useShellTheme } from '../../lib/useShellTheme';

export type ApiFeature = 'friends' | 'inbox' | 'history' | 'profile';

export function ApiFeatureFrame({ active, title, onNavigate, onHome, onBack, headerAction, children }: {
  active: ApiFeature;
  title: string;
  onNavigate: (path: string) => void;
  onHome: () => void;
  /** Opened from another flow (e.g. the lobby): back header with a centred title, no bottom navigation. */
  onBack?: () => void;
  /** Short text action on the right of the header (back-style headers only). */
  headerAction?: { label: string; icon?: AppIconName; onPress: () => void; disabled?: boolean };
  children: ReactNode;
}) {
  const { colors } = useShellTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.5;
  const isInbox = active === 'inbox';
  const standalone = isInbox || Boolean(onBack);
  const bottomTabs = [
    { id: 'home', label: 'Trang chủ', icon: 'home' as const, onPress: onHome },
    { id: 'friends', label: 'Bạn bè', icon: 'friends' as const, onPress: () => onNavigate('/friends') },
    { id: 'history', label: 'Lịch sử', icon: 'history' as const, onPress: () => onNavigate('/history') },
    { id: 'profile', label: 'Cá nhân', icon: 'profile' as const, onPress: () => onNavigate('/profile') },
  ];
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      {standalone ? (
        <AppHeader variant="back" title={title} centeredTitle hideDivider rightAction={headerAction} allowTitleWrap={largeText} onPressBack={onBack ?? onHome} showFriends={false} showInbox={false} showProfile={false} colors={{ ...colors, surface: colors.background }} />
      ) : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {!standalone ? <AppBottomNavigation items={bottomTabs} activeId={active} bottomInset={insets.bottom} allowLabelWrap={largeText} colors={colors} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
