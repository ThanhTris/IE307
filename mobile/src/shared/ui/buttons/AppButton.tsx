import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppIcon, type AppIconName } from '../icons/AppIcon';
import type { ComponentThemeProps } from '../types';

export type AppButtonProps = ComponentThemeProps & {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  icon?: AppIconName;
  iconTintColor?: string;
  iconLayout?: 'inline' | 'stacked';
  iconSize?: number;
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
  icon,
  iconTintColor,
  iconLayout = 'inline',
  iconSize = 24,
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
        icon && iconLayout === 'stacked' ? styles.iconButtonStacked : undefined,
        style,
      ]}
    >
      {icon && !loading ? <AppIcon testID="app-button-icon" name={icon} size={iconSize} color={iconTintColor ?? foreground} /> : null}
      <Text
        style={[
          styles.buttonText,
          icon && iconLayout === 'stacked' ? styles.iconButtonText : undefined,
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
  iconButtonStacked: { alignItems: 'center', gap: spacing.md },
  iconButtonText: { minHeight: 0, paddingHorizontal: 0, paddingVertical: 0 },
});
