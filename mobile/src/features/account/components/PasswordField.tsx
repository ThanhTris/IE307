import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { FormField } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import ShowPassword from '../../../../assets/brand/account/show-password.svg';

export function PasswordField({ label, value, onChange, disabled, isNew = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  isNew?: boolean;
}) {
  const { colors, dark } = useShellTheme();
  const [visible, setVisible] = useState(false);
  if (!value && visible) setVisible(false);
  const shown = visible && value !== '';
  return <FormField label={label} value={value} onChangeText={onChange} placeholder={label}
    secureTextEntry={!shown} editable={!disabled} autoCapitalize="none" autoCorrect={false}
    autoComplete={isNew ? 'new-password' : 'current-password'} colors={colors} inputStyle={{ minHeight: 54, backgroundColor: dark ? colors.soft : '#FFFFFF' }}
    trailingAction={<Pressable accessibilityRole="button" accessibilityLabel={`${shown ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}
      disabled={disabled || !value} onPress={() => setVisible(!shown)} style={styles.toggle}>
      {shown ? <EyeOff size={22} color={colors.muted} />
        : dark ? <Eye size={22} color={colors.muted} /> : <ShowPassword />}
    </Pressable>} />;
}

const styles = StyleSheet.create({
  toggle: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
});
