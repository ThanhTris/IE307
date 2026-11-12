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
  /** Keep the label on one line (shrinks slightly) so the button height never changes with the text. */
  singleLine?: boolean;
};

export function AppButton({
  label,
  singleLine,
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
        {...(singleLine ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.8 } : null)}
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
  // The button itself keeps the minimum height and centres its label. A tall Text box with textAlignVertical only
  // works on Android: on iOS the label sat at the top of the box, so it looked pushed up.
  buttonText: {
    ...typography.bodyBold,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
  iconButtonStacked: { alignItems: 'center', gap: spacing.md },
  iconButtonText: { minHeight: 0, paddingHorizontal: 0, paddingVertical: 0 },
});
