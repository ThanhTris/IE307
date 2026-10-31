import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type AppButtonProps = ComponentThemeProps & {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  iconSource?: ImageSourcePropType;
  iconTintColor?: string;
  iconLayout?: 'inline' | 'stacked';
  textStyle?: TextStyle;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
  style,
  colors,
  iconSource,
  iconTintColor,
  iconLayout = 'inline',
  textStyle,
}: AppButtonProps) {
  const background =
    variant === 'primary'
      ? colors?.primary
      : variant === 'danger'
        ? colors?.danger
        : variant === 'secondary'
          ? colors?.surface
          : colors?.soft;
  const foreground = variant === 'primary' || variant === 'danger' ? colors?.onPrimary : colors?.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            pressed && variant === 'primary'
              ? colors?.primaryPressed
              : pressed && variant === 'secondary'
                ? colors?.soft
                : background,
          borderColor: colors?.line,
          opacity: disabled || loading ? 0.55 : pressed && variant === 'danger' ? 0.65 : 1,
        },
        variant === 'secondary' && styles.buttonSecondary,
        iconSource && iconLayout === 'stacked' ? styles.iconButtonStacked : undefined,
        style,
      ]}
    >
      {iconSource && !loading ? (
        <Image
          testID="app-button-icon"
          source={iconSource}
          accessible={false}
          resizeMode="contain"
          style={[styles.buttonIcon, { tintColor: iconTintColor ?? foreground }]}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          iconSource && iconLayout === 'stacked' ? styles.iconButtonText : undefined,
          { color: foreground },
          textStyle,
        ]}
      >
        {loading ? 'Đang xử lý…' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: radii.md, justifyContent: 'center', alignItems: 'stretch', borderWidth: 1 },
  buttonSecondary: { borderWidth: 1 },
  buttonText: {
    ...typography.bodyBold,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  buttonIcon: { width: 24, height: 24 },
  iconButtonStacked: { alignItems: 'center', gap: spacing.md },
  iconButtonText: { minHeight: 0, paddingHorizontal: 0, paddingVertical: 0 },
});
