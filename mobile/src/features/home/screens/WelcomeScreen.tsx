import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, BrandLogo } from '../../../shared/ui';
import { radii, spacing } from '../../../shared/theme/tokens';

type Props = {
  onGuest: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  disabled?: boolean;
  notice?: ReactNode;
  isMock?: boolean;
};

/** Figma 298:2309. System bars belong to Android, not to the screen artwork. */
export function WelcomeScreen({ onGuest, onSignIn, onSignUp, disabled, notice, isMock }: Props) {
  const { colors, dark } = useShellTheme();
  const heroColor = dark ? colors.primary : colors.green;
  const { textStyle } = useAppFonts();
  const insets = useSafeAreaInsets();

  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: heroColor }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
          <Image source={require('../../../../assets/brand/entry/welcome-ring-large.png')} style={styles.largeRing} />
          <Image source={require('../../../../assets/brand/entry/welcome-ring-small.png')} style={styles.smallRing} />
          <Text allowFontScaling={false} style={[styles.decorativeG, { color: colors.onPrimary }, textStyle(700)]}>G</Text>
          <View style={[styles.horizontalRibbon, { backgroundColor: colors.onPrimary }]} />
          <View style={[styles.verticalRibbon, { backgroundColor: colors.onPrimary }]} />
        </View>
        <View style={styles.brand}>
          <View style={[styles.logoTile, { backgroundColor: colors.surface }]}><BrandLogo size={44} /></View>
          <Text style={[styles.brandName, { color: colors.text }, textStyle(700)]}>Gì Cũng Được</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.headline, { color: colors.text }, textStyle(700)]}>{'Cả nhóm\năn gì?'}</Text>
        <Text style={[styles.subtitle, { color: colors.text }, textStyle(400)]}>Tạo phòng, cùng chọn, rồi chốt món.</Text>
      </View>
      <View style={[styles.panel, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.xxl) }]}>
        {isMock ? <Text style={[styles.mockLabel, { color: colors.text }, textStyle(500)]}>Mô phỏng · GM-09 · dữ liệu mẫu</Text> : null}
        {notice}
        <AppButton label="Đăng nhập" onPress={onSignIn} style={styles.accountButton} textStyle={{ fontSize: 17, lineHeight: 24, ...textStyle(600) }} colors={colors} />
        <AppButton label="Đăng ký" variant="secondary" onPress={onSignUp} style={styles.accountButton} textStyle={{ fontSize: 17, lineHeight: 24, ...textStyle(600) }} colors={colors} />
        <Pressable accessibilityRole="button" accessibilityLabel="Tham gia với tư cách khách" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onGuest} style={({ pressed }) => [styles.guestButton, { opacity: disabled ? 0.55 : pressed ? 0.65 : 1 }]}>
          <Text style={[styles.guestLabel, { color: dark ? colors.text : '#08765F' }, textStyle(700)]}>Tham gia với tư cách khách</Text>
        </Pressable>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  hero: { flexGrow: 1, minHeight: 637, paddingHorizontal: 30, paddingTop: 25, paddingBottom: 64, overflow: 'hidden' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  logoTile: { width: 48, height: 48, borderRadius: 11, padding: 2 },
  logo: { width: 44, height: 44 },
  brandName: { flex: 1, fontSize: 22, lineHeight: 28 },
  headline: { marginTop: 103, fontSize: 50, lineHeight: 61 },
  subtitle: { fontSize: 17, lineHeight: 24 },
  largeRing: { position: 'absolute', left: 78, top: 212, width: 334, height: 390 },
  smallRing: { position: 'absolute', left: 205, top: 337, width: 207, height: 240 },
  decorativeG: { position: 'absolute', left: 105, top: 294, width: 330, fontSize: 338, lineHeight: 360, opacity: 0.17 },
  horizontalRibbon: { position: 'absolute', left: -21, top: 559, width: 448, height: 30, borderRadius: 15, opacity: 0.17, transform: [{ rotate: '29deg' }] },
  verticalRibbon: { position: 'absolute', left: 64, top: 299, width: 30, height: 360, borderRadius: 15, opacity: 0.17, transform: [{ rotate: '29deg' }] },
  panel: { marginTop: -25, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: spacing.xxl, paddingTop: 40, gap: spacing.md },
  accountButton: { minHeight: 60, borderRadius: radii.md },
  guestButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  guestLabel: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  mockLabel: { fontSize: 12, lineHeight: 18 },
});
