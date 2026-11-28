import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import ProfileBadge from '../../../../assets/brand/account/profile-badge.svg';
import type { SessionUser } from '../../../data/api/contracts';
import type { AccountService } from '../../../data/auth';
import { validDisplayName } from '../../../data/auth/validation';
import { AppButton, FormField } from '../../../shared/ui';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { AccountFormFrame } from '../components/AccountFormFrame';
import { PasswordField } from '../components/PasswordField';
import { useAccountAction } from '../hooks/useAccountAction';
import { accountErrorMessage, newPasswordError } from '../services/accountMessages';

type FieldErrors = Partial<Record<'name' | 'currentPassword' | 'password' | 'confirmation', string>>;

export function AccountEditScreen({ kind, user, account, onBack, onRecovery }: {
  kind: 'edit-profile' | 'change-password';
  user: SessionUser;
  account: AccountService;
  onBack: () => void;
  onRecovery: () => void;
}) {
  const { colors, dark } = useShellTheme();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const { pending, error, run, clearError } = useAccountAction();
  const editingProfile = kind === 'edit-profile';
  const busy = !!pending;
  const title = editingProfile ? 'Sửa hồ sơ' : 'Đổi mật khẩu';

  function clearNewPasswords() {
    setPassword('');
    setConfirmation('');
  }

  function clearPasswords() {
    setCurrentPassword('');
    clearNewPasswords();
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors(current => current[field] ? { ...current, [field]: undefined } : current);
  }

  function submit() {
    setSaved(false);
    clearError();
    if (editingProfile) {
      const name = !displayName.trim() ? 'Nhập tên hiển thị.'
        : !validDisplayName(displayName) ? 'Tên hiển thị cần từ 1 đến 24 ký tự hợp lệ.' : undefined;
      setFieldErrors({ name });
      if (name) return;
      void run('Đang lưu hồ sơ…', () => account.saveProfile(displayName), () => {
        setDisplayName(displayName.trim());
        setSaved(true);
      });
      return;
    }
    const invalid: FieldErrors = {
      currentPassword: !currentPassword ? 'Nhập mật khẩu hiện tại.' : undefined,
      password: !password ? 'Nhập mật khẩu mới.' : newPasswordError(password),
      confirmation: !confirmation ? 'Nhập lại mật khẩu mới.'
        : password !== confirmation ? 'Hai mật khẩu mới chưa khớp.' : undefined,
    };
    setFieldErrors(invalid);
    if (Object.values(invalid).some(Boolean)) {
      if (password && (invalid.password || (confirmation && invalid.confirmation))) clearNewPasswords();
      return;
    }
    void run('Đang cập nhật mật khẩu…', () => account.changePassword(currentPassword, password), () => {
      clearPasswords();
      setSaved(true);
    }, failure => {
      const reason = failure.details?.reason;
      if (reason === 'current_password_invalid' || reason === 'invalid_credentials') {
        setCurrentPassword('');
        setFieldErrors({ currentPassword: 'Mật khẩu hiện tại chưa đúng.' });
        clearError();
      } else if (reason === 'weak_password' || reason === 'same_password') {
        clearNewPasswords();
        setFieldErrors({ password: accountErrorMessage(failure) });
        clearError();
      } else clearPasswords();
    });
  }

  return <AccountFormFrame title={title} onBack={onBack} error={error} busy={busy}>
    {saved ? <ToastNotice tone="success" title={editingProfile ? 'Đã lưu hồ sơ' : 'Đã đổi mật khẩu thành công'} /> : null}
    {editingProfile ? <>
      <View style={[styles.avatarCard, { borderColor: colors.line, backgroundColor: dark ? colors.surface : '#FFFFFF' }]}>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ProfileBadge />
          <Text style={styles.avatarInitial}>{user.displayName.trim().slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={[typography.bodyBold, { color: colors.text }]}>Ảnh đại diện</Text>
        <Text style={[typography.caption, { color: colors.muted }]}>Hiển thị chữ cái đầu trong tên của bạn.</Text>
      </View>
      <FormField label="Tên hiển thị" value={displayName} error={fieldErrors.name} editable={!busy}
        onChangeText={value => { setDisplayName(value); clearFieldError('name'); }}
        autoCapitalize="words" helperText="Tên này xuất hiện với bạn bè và trong phòng ăn mới."
        colors={colors} inputStyle={{ minHeight: 54, backgroundColor: dark ? colors.soft : '#FFFFFF' }} />
    </> : <>
      <PasswordField label="Mật khẩu hiện tại" value={currentPassword} error={fieldErrors.currentPassword}
        onChange={value => { setCurrentPassword(value); clearFieldError('currentPassword'); }} disabled={busy} />
      <PasswordField label="Mật khẩu mới" value={password} error={fieldErrors.password}
        onChange={value => { setPassword(value); clearFieldError('password'); }} disabled={busy} isNew />
      <PasswordField label="Nhập lại mật khẩu mới" value={confirmation} error={fieldErrors.confirmation}
        onChange={value => { setConfirmation(value); clearFieldError('confirmation'); }} disabled={busy} isNew />
    </>}
    <AppButton label={pending ?? (editingProfile ? 'Lưu thay đổi' : 'Lưu mật khẩu mới')} loading={busy} onPress={submit} colors={colors} />
    {!editingProfile ? <AppButton label="Quên mật khẩu hiện tại?" variant="quiet" onPress={() => { clearPasswords(); onRecovery(); }} disabled={busy} colors={colors} /> : null}
  </AccountFormFrame>;
}

const styles = StyleSheet.create({
  avatarCard: { minHeight: 160, padding: spacing.lg, gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, borderWidth: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...typography.titleLarge, position: 'absolute', color: '#043B22' },
});
