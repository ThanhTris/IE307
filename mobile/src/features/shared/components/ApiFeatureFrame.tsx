import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomNavigation, AppHeader } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

export type ApiFeature = 'friends' | 'inbox' | 'history';

export function ApiFeatureFrame({ active, title, onNavigate, onHome, children }: {
  active: ApiFeature;
  title: string;
  onNavigate: (path: string) => void;
  onHome: () => void;
  children: ReactNode;
}) {
  const { colors } = useShellTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.5;
  const isInbox = active === 'inbox';
  const bottomTabs = [
    { id: 'home', label: 'Trang chủ', iconSource: require('../../../../assets/brand/icons/home.png'), onPress: onHome },
    { id: 'friends', label: 'Bạn bè', iconSource: require('../../../../assets/brand/icons/friends.png'), onPress: () => onNavigate('/friends') },
    { id: 'history', label: 'Lịch sử', iconSource: require('../../../../assets/brand/icons/history.png'), onPress: () => onNavigate('/history') },
    { id: 'profile', label: 'Cá nhân', iconSource: require('../../../../assets/brand/icons/profile.png'), onPress: () => onNavigate('/profile') },
  ];
  const inboxPath = active === 'friends' || active === 'history'
    ? `/inbox?returnTo=${active}`
    : '/inbox';
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      {isInbox ? (
        <AppHeader variant="back" title={title} allowTitleWrap={largeText} onPressBack={onHome} showFriends={false} showInbox={false} showProfile={false} colors={colors} />
      ) : (
        <AppHeader title="Gì Cũng Được" allowTitleWrap={largeText} brandTextStyle={{ fontSize: 18, lineHeight: 24 }} onPressBrand={onHome} onInbox={() => onNavigate(inboxPath)} showFriends={false} showInbox showProfile={false} colors={colors} />
      )}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {!isInbox ? <AppBottomNavigation items={bottomTabs} activeId={active} bottomInset={insets.bottom} allowLabelWrap={largeText} colors={colors} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
});
