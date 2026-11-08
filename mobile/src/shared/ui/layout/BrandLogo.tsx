import type { SvgProps } from 'react-native-svg';
import LogoMark from '../../../../assets/brand/gi-cung-duoc-logo.svg';

export type BrandLogoProps = {
  size?: number;
  accessibilityLabel?: string;
} & Pick<SvgProps, 'testID'>;

/**
 * Vector brand mark for Gì Cũng Được.
 * Preserves source SVG colors and square aspect ratio.
 * When accessibilityLabel is omitted, behaves as decorative (accessible={false}).
 * When accessibilityLabel is provided, exposes an accessible image role.
 */
export function BrandLogo({ size = 44, accessibilityLabel, testID }: BrandLogoProps) {
  const isDecorative = !accessibilityLabel;

  return (
    <LogoMark
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      accessible={!isDecorative}
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={isDecorative ? 'no' : 'yes'}
      testID={testID}
    />
  );
}

