import { Image, StyleSheet, View, type ImageSourcePropType, type TextStyle } from 'react-native';
import { Text } from '../forms/ScaledText';
import { radii, spacing } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export function BrandBanner({
  title = 'Hợp gu cả nhóm,\nvui trọn bữa ăn.',
  titleTextStyle,
  illustrationSource,
  dark = false,
  colors,
}: ComponentThemeProps & { title?: string; titleTextStyle?: TextStyle; illustrationSource?: ImageSourcePropType; dark?: boolean }) {
  const fullIllustration = require('../../../../assets/brand/friends-dining.png');
  return (
    <View style={[styles.brandBanner, { backgroundColor: colors?.warm }]}>
      <Text accessibilityRole="summary" style={[styles.brandBannerTitle, { color: colors?.text }, titleTextStyle]}>
        {title}
      </Text>
      <Image
        testID="brand-banner-illustration"
        source={dark ? fullIllustration : illustrationSource ?? fullIllustration}
        accessible={false}
        resizeMode={dark ? 'cover' : 'contain'}
        style={[styles.brandBannerImage, dark ? styles.darkSlot : illustrationSource ? styles.lightSlot : undefined]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandBanner: {
    minHeight: 116,
    borderRadius: radii.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xl,
  },
  brandBannerTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  brandBannerImage: { width: '46%', height: 116, alignSelf: 'flex-end' },
  // Offset the transparent padding or contain margin to meet the clipped banner edge.
  darkSlot: { transform: [{ translateY: 8 }] },
  lightSlot: { width: 148, transform: [{ translateY: 6 }] },
});
