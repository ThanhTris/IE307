import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import HeroRing from '../../../../assets/brand/account/hero-ring.svg';
import HeroPlate from '../../../../assets/brand/account/hero-plate.svg';
import HeroBowl from '../../../../assets/brand/account/hero-bowl.svg';
import SignupRing from '../../../../assets/brand/account/signup-ring.svg';
import SignupPlate from '../../../../assets/brand/account/signup-plate.svg';
import SignupBowl from '../../../../assets/brand/account/signup-bowl.svg';
import { AppHeader, AppIcon, BrandLogo } from '../../../shared/ui';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { FailureNotice } from '../../../shared/ui/feedback/FailureNotice';
import { FOCUSED_STYLE } from '../../../shared/ui/layout/ScreenContainer';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { spacing, typography } from '../../../shared/theme/tokens';
import type { ApiError } from '../../../data/api/contracts';
import { accountErrorMessage } from '../services/accountMessages';

type Hero = 'sign-in' | 'sign-up';

function AccountHero({ variant, onBack, busy }: { variant: Hero; onBack: () => void; busy: boolean }) {
  const { colors, dark } = useShellTheme();
  const compact = variant === 'sign-up';
  return <View style={[styles.hero, { backgroundColor: dark ? colors.primary : colors.green }, compact && styles.compactHero]}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <View style={[styles.ring, compact && styles.compactRing]}>{compact ? <SignupRing /> : <HeroRing />}</View>
      <View style={[styles.plate, compact && styles.compactPlate]}>{compact ? <SignupPlate /> : <HeroPlate />}</View>
      <View style={[styles.bowlBody, compact && styles.compactBowlBody]} />
      <View style={[styles.bowl, compact && styles.compactBowl]}>{compact ? <SignupBowl /> : <HeroBowl />}</View>
      <Text allowFontScaling={false} style={[styles.steam, compact && styles.compactSteam]}>〰</Text>
    </View>
    <View style={styles.brandRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} disabled={busy} style={styles.back}>
        <AppIcon color={colors.onPrimary} name="back" size={24} />
      </Pressable>
      <BrandLogo size={44} />
      <Text style={[typography.titleMedium, styles.brandName]}>Gì Cũng Được</Text>
    </View>
    <Text style={[styles.heroTitle, compact && styles.compactHeroTitle]}>{compact ? 'Tạo tài khoản' : 'Chọn món\ncùng cả nhóm.'}</Text>
  </View>;
}

export function AccountFormFrame({ title, hero, busy, onBack, error, children }: {
  title: string;
  hero?: Hero;
  busy?: boolean;
  onBack: () => void;
  error?: ApiError;
  children: ReactNode;
}) {
  const { colors, dark } = useShellTheme();
  const safeAreaColor = hero ? dark ? colors.primary : colors.green : colors.background;
  return <SafeAreaView style={[styles.root, { backgroundColor: safeAreaColor }]}>
    <StatusBar style={hero || dark ? 'light' : 'dark'} />
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!hero ? <AppHeader variant="back" title={title} allowTitleWrap hideDivider onPressBack={busy ? undefined : onBack}
        colors={{ ...colors, surface: colors.background }} /> : null}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          {hero ? <AccountHero variant={hero} busy={!!busy} onBack={onBack} /> : null}
          <View style={[styles.form, hero && styles.heroForm, { backgroundColor: colors.background }]}>
            {hero ? <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
            <FailureNotice destination="signIn" colors={colors} />
            {error ? <ToastNotice title="Chưa thể hoàn tất" message={accountErrorMessage(error)} tone="error" /> : null}
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1 }, column: { ...FOCUSED_STYLE, flexGrow: 1 },
  form: { flexGrow: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  heroForm: { marginTop: -28, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  title: { ...typography.titleLarge, fontSize: 33, lineHeight: 42 },
  hero: { minHeight: 268, paddingTop: spacing.lg, paddingBottom: 40, overflow: 'hidden' },
  compactHero: { minHeight: 212 },
  brandRow: { paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#FFFFFF', flexShrink: 1 },
  heroTitle: { ...typography.titleLarge, color: '#FFFFFF', fontSize: 30, lineHeight: 37, marginTop: 54, marginLeft: 30, maxWidth: '68%' },
  compactHeroTitle: { fontSize: 23, lineHeight: 29, marginTop: 42 },
  ring: { position: 'absolute', right: -43, top: 32 }, compactRing: { right: -18, top: 17 },
  plate: { position: 'absolute', right: -40, top: 122 }, compactPlate: { right: -23, top: 92 },
  bowl: { position: 'absolute', right: -7, top: 190 }, compactBowl: { right: 4, top: 143 },
  bowlBody: { position: 'absolute', right: -3, top: 201, width: 90, height: 52, borderRadius: 24, backgroundColor: '#043B22' },
  compactBowlBody: { right: 8, top: 153, width: 76, height: 42, borderRadius: 20 },
  steam: { ...typography.bodyBold, position: 'absolute', right: 17, top: 153, color: '#043B22' },
  compactSteam: { right: 26, top: 114 },
});
