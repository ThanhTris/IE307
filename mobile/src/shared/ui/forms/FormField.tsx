import {
  StyleSheet,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { Text, TextInput } from './ScaledText';
import type { ReactNode } from 'react';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type FormFieldProps = ComponentThemeProps &
  Pick<TextInputProps, 'autoCapitalize' | 'autoComplete' | 'autoCorrect' | 'editable' | 'keyboardType' | 'maxLength' | 'secureTextEntry' | 'testID'> & {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    helperText?: string;
    error?: string;
    keyboardType?: KeyboardTypeOptions;
    hideLabel?: boolean;
    inputStyle?: StyleProp<TextStyle>;
    trailingAction?: ReactNode;
  };

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  error,
  colors,
  hideLabel = false,
  inputStyle,
  trailingAction,
  ...inputProps
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      {!hideLabel ? <Text style={[styles.fieldLabel, { color: colors?.text }]}>{label}</Text> : null}
      <View style={trailingAction ? styles.withAction : undefined}>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={error || helperText}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors?.muted}
        style={[
          styles.input,
          {
            backgroundColor: colors?.soft,
            borderColor: error ? colors?.danger : colors?.line,
            color: colors?.text,
          },
          inputStyle,
          trailingAction ? styles.actionInset : undefined,
        ]}
      />
      {trailingAction ? <View style={styles.action}>{trailingAction}</View> : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.helper, { color: colors?.danger }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: colors?.muted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.bodyBold },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, ...typography.body },
  withAction: { justifyContent: 'center' },
  actionInset: { paddingRight: 52 },
  action: { position: 'absolute', right: 2 },
  helper: { ...typography.caption },
});
