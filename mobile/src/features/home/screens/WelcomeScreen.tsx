import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import { radii, spacing } from '../../../shared/theme/tokens';

type Props = {
  onGuest: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  disabled?: boolean;
  notice?: ReactNode;
};

/** Decorative rings, "G" and ribbons shared by the welcome and guest-name screens; anchored to the bottom so any screen height works. */
export function WelcomeArtwork({ bottomOffset = 0 }: { bottomOffset?: number }) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { bottom: bottomOffset }]}>
    <Image source={require('../../../../assets/brand/entry/welcome-ring-large.png')} style={artStyles.largeRing} />
    <Image source={require('../../../../assets/brand/entry/welcome-ring-small.png')} style={artStyles.smallRing} />
    <Text allowFontScaling={false} style={[artStyles.decorativeG, { color: colors.onPrimary }, textStyle(700)]}>G</Text>
    <View style={[artStyles.horizontalRibbon, { backgroundColor: colors.onPrimary }]} />
    <View style={[artStyles.verticalRibbon, { backgroundColor: colors.onPrimary }]} />
  </View>;
}

/** Figma 298:2309. System bars belong to Android, not to the screen artwork. */
export function WelcomeScreen({ onGuest, onSignIn, onSignUp, disabled, notice }: Props) {
  const { colors, dark } = useShellTheme();
  const heroColor = dark ? colors.primary : colors.green;
  const { textStyle } = useAppFonts();
  const insets = useSafeAreaInsets();

  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: heroColor }]}>
    <View style={styles.content}>
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        <WelcomeArtwork />
        <Text accessibilityRole="header" style={[styles.headline, { color: '#FFFFFF' }, textStyle(700)]}>{'Cả nhóm\năn gì?'}</Text>
        <Text style={[styles.subtitle, { color: '#FFFFFF' }, textStyle(400)]}>Tạo phòng, cùng chọn, rồi chốt món.</Text>
      </View>
      <View style={[styles.panel, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}>
        {notice}
        <AppButton label="Đăng nhập" onPress={onSignIn} style={styles.accountButton} textStyle={{ fontSize: 17, lineHeight: 24, ...textStyle(600) }} colors={colors} />
        <AppButton label="Đăng ký" variant="secondary" onPress={onSignUp} style={styles.accountButton} textStyle={{ fontSize: 17, lineHeight: 24, ...textStyle(600) }} colors={colors} />
        <Pressable accessibilityRole="button" accessibilityLabel="Tham gia với tư cách khách" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onGuest} style={({ pressed }) => [styles.guestButton, { opacity: disabled ? 0.55 : pressed ? 0.65 : 1 }]}>
          <Text style={[styles.guestLabel, { color: dark ? colors.text : '#08765F' }, textStyle(700)]}>Tham gia với tư cách khách</Text>
        </Pressable>
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  hero: { flex: 1, paddingHorizontal: 30, paddingTop: 25, paddingBottom: 64, overflow: 'hidden' },
  headline: { marginTop: 72, fontSize: 50, lineHeight: 61 },
  subtitle: { fontSize: 17, lineHeight: 24 },
  panel: { marginTop: -25, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: spacing.xxl, paddingTop: 40, gap: spacing.md },
  accountButton: { minHeight: 60, borderRadius: radii.md },
  guestButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  guestLabel: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  mockLabel: { fontSize: 12, lineHeight: 18 },
});

const artStyles = StyleSheet.create({
  largeRing: { position: 'absolute', left: 78, bottom: 35, width: 334, height: 390 },
  smallRing: { position: 'absolute', left: 205, bottom: 60, width: 207, height: 240 },
  decorativeG: { position: 'absolute', left: 105, bottom: -17, width: 330, fontSize: 338, lineHeight: 360, opacity: 0.17 },
  horizontalRibbon: { position: 'absolute', left: -21, bottom: 48, width: 448, height: 30, borderRadius: 15, opacity: 0.17, transform: [{ rotate: '29deg' }] },
  verticalRibbon: { position: 'absolute', left: 64, bottom: -22, width: 30, height: 360, borderRadius: 15, opacity: 0.17, transform: [{ rotate: '29deg' }] },
});
