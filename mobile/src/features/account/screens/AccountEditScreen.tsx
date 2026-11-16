import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ProfileBadge from '../../../../assets/brand/account/profile-badge.svg';
import type { SessionUser } from '../../../data/api/contracts';
import type { AccountService } from '../../../data/auth';
import { validDisplayName, validNewPassword } from '../../../data/auth/validation';
import { AppButton, FormField } from '../../../shared/ui';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { AccountFormFrame } from '../components/AccountFormFrame';
import { PasswordField } from '../components/PasswordField';
import { useAccountAction } from '../hooks/useAccountAction';

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
  const [validation, setValidation] = useState('');
  const [saved, setSaved] = useState(false);
  const { pending, error, run, clearError } = useAccountAction();
  const editingProfile = kind === 'edit-profile';
  const busy = !!pending;
  const title = editingProfile ? 'Sửa hồ sơ' : 'Đổi mật khẩu';

  function clearPasswords() {
    setCurrentPassword('');
    setPassword('');
    setConfirmation('');
  }

  function submit() {
    setSaved(false);
    clearError();
    setValidation('');
    if (editingProfile) {
      if (!validDisplayName(displayName)) return setValidation('Tên hiển thị cần từ 1 đến 24 ký tự.');
      void run('Đang lưu hồ sơ…', () => account.saveProfile(displayName), () => {
        setDisplayName(displayName.trim());
        setSaved(true);
      });
      return;
    }
    if (!currentPassword) return setValidation('Nhập mật khẩu hiện tại.');
    if (!validNewPassword(password)) return setValidation('Mật khẩu mới cần ít nhất 8 ký tự và tối đa 72 byte.');
    if (password === currentPassword) return setValidation('Chọn mật khẩu khác với mật khẩu hiện tại.');
    if (password !== confirmation) return setValidation('Hai mật khẩu mới chưa khớp.');
    void run('Đang cập nhật mật khẩu…', () => account.changePassword(currentPassword, password), () => {
      clearPasswords();
      setSaved(true);
    }, clearPasswords);
  }

  return <AccountFormFrame title={title} onBack={onBack} error={error} busy={busy}>
    {saved ? <ToastNotice tone="success" title={editingProfile ? 'Đã lưu hồ sơ' : 'Đã đổi mật khẩu'} /> : null}
    {validation ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{validation}</Text> : null}
    {editingProfile ? <>
      <View style={[styles.avatarCard, { borderColor: colors.line, backgroundColor: dark ? colors.surface : '#FFFFFF' }]}>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ProfileBadge />
          <Text style={styles.avatarInitial}>{user.displayName.trim().slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={[typography.bodyBold, { color: colors.text }]}>Ảnh đại diện</Text>
        <Text style={[typography.caption, { color: colors.muted }]}>Hiển thị chữ cái đầu trong tên của bạn.</Text>
      </View>
      <FormField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} editable={!busy}
        autoCapitalize="words" helperText="Tên này xuất hiện với bạn bè và trong phòng ăn mới."
        colors={colors} inputStyle={{ minHeight: 54, backgroundColor: dark ? colors.soft : '#FFFFFF' }} />
    </> : <>
      <PasswordField label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} disabled={busy} />
      <PasswordField label="Mật khẩu mới" value={password} onChange={setPassword} disabled={busy} isNew />
      <PasswordField label="Nhập lại mật khẩu mới" value={confirmation} onChange={setConfirmation} disabled={busy} isNew />
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
