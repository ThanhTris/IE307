import { View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

export default function SvgMock({
  width,
  height,
  testID,
  accessible,
  accessibilityLabel,
  accessibilityRole,
  importantForAccessibility,
  ...rest
}: SvgProps) {
  return (
    <View
      testID={testID ?? 'svg-mock'}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      importantForAccessibility={importantForAccessibility}
      style={{ width: Number(width), height: Number(height) }}
      {...rest}
    />
  );
}

