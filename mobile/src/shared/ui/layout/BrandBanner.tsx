import { Image, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export function BrandBanner({
  title = 'Hợp gu cả nhóm,\nvui trọn bữa ăn.',
  titleTextStyle,
  colors,
}: ComponentThemeProps & { title?: string; titleTextStyle?: TextStyle }) {
  return (
    <View style={[styles.brandBanner, { backgroundColor: colors?.warm }]}>
      <Text accessibilityRole="summary" style={[styles.brandBannerTitle, { color: colors?.text }, titleTextStyle]}>
        {title}
      </Text>
      <Image
        testID="brand-banner-illustration"
        source={require('../../../../assets/brand/friends-dining.png')}
        accessible={false}
        resizeMode="contain"
        style={styles.brandBannerImage}
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
  brandBannerTitle: { flex: 1, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  brandBannerImage: { width: '46%', height: 116, alignSelf: 'center' },
});
