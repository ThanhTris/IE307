import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mail } from 'lucide-react-native';
import EmailBadge from '../../../../assets/brand/account/email-badge.svg';
import RecoveryBadge from '../../../../assets/brand/account/recovery-badge.svg';
import RecoveryLock from '../../../../assets/brand/account/recovery-lock.svg';
import type { AccountService } from '../../../data/auth';
import type { ApiError } from '../../../data/api/contracts';
import { normalizeEmail, validDisplayName, validEmail } from '../../../data/auth/validation';
import { AppButton, FormField } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { spacing, typography } from '../../../shared/theme/tokens';
import { AccountFormFrame } from '../components/AccountFormFrame';
import { PasswordField } from '../components/PasswordField';
import { useAccountAction } from '../hooks/useAccountAction';
import { accountErrorMessage, newPasswordError } from '../services/accountMessages';

export type AccountAccessFlow = 'sign-in' | 'sign-up' | 'link' | 'recovery';
type Stage = 'details' | 'code' | 'password' | 'done';
type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmation', string>>;
const titles = { 'sign-in': 'Đăng nhập', 'sign-up': 'Đăng ký', link: 'Liên kết email', recovery: 'Quên mật khẩu' };

export function AccountAccessScreen({ flow, account, isGuest, recoveryForCurrentAccount = false, onBack, onNavigate, onComplete }: {
  flow: AccountAccessFlow;
  account: AccountService;
  isGuest: boolean;
  recoveryForCurrentAccount?: boolean;
  onBack: () => void;
  onNavigate: (flow: AccountAccessFlow) => void;
  onComplete: () => void;
}) {
  const { colors, dark } = useShellTheme();
  const [stage, setStage] = useState<Stage>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [codeError, setCodeError] = useState<string>();
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const proof = useRef<AbortController | null>(null);
  const action = useAccountAction();
  const { pending, error, clearError, run } = action;
  const busy = !!pending;
  const recovery = flow === 'recovery';
  const linking = flow === 'link';
  const signingIn = flow === 'sign-in';
  const signingUp = flow === 'sign-up';
  const hero = stage === 'details' && (signingIn || signingUp) ? flow : undefined;
  const hasAccountConflict = error?.details?.reason === 'email_exists' || error?.details?.reason === 'user_already_exists';
  const inputStyle = { minHeight: 54, backgroundColor: dark ? colors.soft : '#FFFFFF' };

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useEffect(() => () => {
    const active = proof.current;
    if (active) {
      active.abort();
      account.discardPasswordProof(active.signal);
      proof.current = null;
    }
  }, [account]);

  function resetPasswords() { setPassword(''); setConfirmation(''); }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors(current => current[field] ? { ...current, [field]: undefined } : current);
  }

  function navigate(next: AccountAccessFlow) {
    resetPasswords();
    setCode('');
    onNavigate(next);
  }

  function goTo(next: Stage) {
    setValidation('');
    setFieldErrors({});
    setCodeError(undefined);
    setNotice('');
    clearTimeout(noticeTimer.current);
    clearError();
    resetPasswords();
    setCode('');
    setStage(next);
  }

  function back() {
    if (stage === 'details' || stage === 'password' || stage === 'done') onBack();
    else goTo('details');
  }

  function sendRecoveryCode(address: string) {
    return recoveryForCurrentAccount ? account.sendAccountRecoveryCode(address) : account.sendCode(address, 'recovery');
  }

  function showRequestError(error: ApiError) {
    resetPasswords();
    if (error.details?.reason !== 'recovery_email_mismatch') return;
    goTo('details');
    setFieldErrors({ email: 'Nhập email của tài khoản đang đăng nhập.' });
  }

  function submitDetails() {
    const address = normalizeEmail(email);
    const invalid: FieldErrors = {
      email: !address ? 'Nhập địa chỉ email.' : !validEmail(address) ? 'Nhập địa chỉ email hợp lệ.' : undefined,
    };
    if (signingUp) {
      invalid.name = !name.trim() ? 'Nhập tên hiển thị.' : !validDisplayName(name) ? 'Tên hiển thị cần từ 1 đến 24 ký tự hợp lệ.' : undefined;
      invalid.password = password ? newPasswordError(password) : 'Nhập mật khẩu.';
      invalid.confirmation = !confirmation ? 'Nhập lại mật khẩu.' : password !== confirmation ? 'Hai mật khẩu chưa khớp.' : undefined;
    }
    if (signingIn && !password) invalid.password = 'Nhập mật khẩu của bạn.';
    setFieldErrors(invalid);
    clearError();
    setValidation('');
    if (Object.values(invalid).some(Boolean)) return;
    setEmail(address);
    if (signingUp) return void run('Đang gửi mã…', () => account.signUp({ email: address, password, displayName: name.trim() }),
      () => goTo('code'), showSignupError);
    if (signingIn) return void run('Đang đăng nhập…', () => account.signIn({ email: address, password }), onComplete, resetPasswords);
    const request = linking ? () => account.linkEmail(address) : () => sendRecoveryCode(address);
    void run('Đang gửi mã…', request, () => goTo('code'), showRequestError);
  }

  function showSignupError(error: ApiError) {
    const reason = error.details?.reason;
    if (reason === 'weak_password') {
      setFieldErrors({ password: accountErrorMessage(error) });
      clearError();
    } else if (reason === 'email_exists' || reason === 'user_already_exists') {
      setFieldErrors({ email: accountErrorMessage(error) });
      clearError();
    } else resetPasswords();
  }

  function resend() {
    setValidation('');
    setNotice('');
    clearTimeout(noticeTimer.current);
    const address = normalizeEmail(email);
    if (!validEmail(address)) return setValidation('Nhập địa chỉ email hợp lệ.');
    const request = linking ? () => account.linkEmail(address)
      : recovery ? () => sendRecoveryCode(address) : () => account.sendCode(address, 'signup');
    void run('Đang gửi mã…', request, () => {
      goTo('code');
      setNotice('Kiểm tra hộp thư để lấy mã mới.');
      noticeTimer.current = setTimeout(() => setNotice(''), 5000);
    }, showRequestError);
  }

  function verify() {
    if (!/^\d{6}$/.test(code)) return setCodeError('Nhập đủ 6 chữ số');
    setCodeError(undefined);
    const controller = proof.current ??= new AbortController();
    void run('Đang xác minh…', () => account.verifyCode(email, code,
      linking ? 'email_change' : recovery ? 'recovery' : 'signup', controller.signal),
    recovery || linking ? () => goTo('password') : onComplete, () => setCode(''));
  }

  function savePassword() {
    const invalid: FieldErrors = {
      password: password ? newPasswordError(password) : 'Nhập mật khẩu mới.',
      confirmation: !confirmation ? 'Nhập lại mật khẩu mới.' : password !== confirmation ? 'Hai mật khẩu chưa khớp.' : undefined,
    };
    setFieldErrors(invalid);
    clearError();
    setValidation('');
    if (Object.values(invalid).some(Boolean)) return;
    if (!proof.current) return setValidation('Mã xác minh đã hết hạn. Hãy bắt đầu lại.');
    const { signal } = proof.current;
    void run('Đang lưu mật khẩu…', () => account.setPassword(password, signal), () => goTo('done'), error => {
      resetPasswords();
      if (error.details?.reason === 'weak_password' || error.details?.reason === 'same_password') {
        setFieldErrors({ password: accountErrorMessage(error) });
        clearError();
      }
    });
  }

  const title = stage === 'code' ? recovery ? 'Mã đặt lại mật khẩu' : 'Xác minh email'
    : stage === 'password' ? 'Đặt mật khẩu mới' : stage === 'done' ? 'Đã lưu mật khẩu' : titles[flow];
  const detailLabel = signingIn ? 'Đăng nhập' : signingUp ? 'Tạo tài khoản' : 'Gửi mã xác minh';
  const showExistingAccount = signingIn || signingUp || linking;
  return <AccountFormFrame title={title} hero={hero} onBack={back} busy={busy} error={error}>
    {validation ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{validation}</Text> : null}
    {stage === 'details' ? <>
      {recovery || linking || (signingIn && isGuest) ? <Text style={[typography.body, { color: colors.text }]}>
        {recovery ? recoveryForCurrentAccount ? 'Nhập email của tài khoản đang đăng nhập để nhận mã đặt lại mật khẩu.'
          : 'Nhập email để nhận mã đặt lại mật khẩu.' : linking
          ? 'Xác minh email rồi đặt mật khẩu để giữ hồ sơ, bạn bè và lịch sử của phiên khách này.'
          : 'Đăng nhập sẽ chuyển sang dữ liệu của tài khoản đó. Để giữ dữ liệu phiên khách, hãy liên kết email trong Cá nhân.'}
      </Text> : null}
      {signingUp ? <FormField label="Tên hiển thị" value={name} onChangeText={value => { setName(value); clearFieldError('name'); }}
        error={fieldErrors.name} editable={!busy}
        autoCapitalize="words" colors={colors} inputStyle={inputStyle} /> : null}
      <FormField label="Email" value={email} onChangeText={value => { setEmail(value); clearFieldError('email'); }}
        error={fieldErrors.email} editable={!busy} keyboardType="email-address"
        autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="ten@example.com" colors={colors} inputStyle={inputStyle} />
      {signingIn || signingUp ? <PasswordField label="Mật khẩu" value={password}
        onChange={value => { setPassword(value); clearFieldError('password'); }}
        error={fieldErrors.password} disabled={busy} isNew={signingUp} /> : null}
      {signingUp ? <PasswordField label="Nhập lại mật khẩu" value={confirmation}
        onChange={value => { setConfirmation(value); clearFieldError('confirmation'); }}
        error={fieldErrors.confirmation} disabled={busy} isNew /> : null}
      {signingIn ? <AppButton variant="quiet" label="Quên mật khẩu?" disabled={busy} colors={colors} onPress={() => navigate('recovery')} /> : null}
      <AppButton label={pending ?? detailLabel} loading={busy} onPress={submitDetails} colors={colors} style={styles.primary} />
      {signingIn && error?.details?.reason === 'email_not_confirmed' ?
        <AppButton label="Gửi lại mã xác minh" variant="secondary" disabled={busy} onPress={resend} colors={colors} /> : null}
      {showExistingAccount ? <AppButton variant="quiet" disabled={busy} colors={colors}
        label={signingIn ? isGuest ? 'Liên kết email cho phiên khách' : 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        onPress={() => navigate(signingIn ? isGuest ? 'link' : 'sign-up' : 'sign-in')} /> : null}
      {hasAccountConflict && linking ? <Text style={[typography.caption, { color: colors.muted }]}>Dữ liệu của phiên khách vẫn được giữ trên thiết bị.</Text> : null}
    </> : null}
    {stage === 'code' ? <>
      <View style={styles.codeIntro}>
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {recovery ? <RecoveryBadge /> : <EmailBadge />}
          <Mail size={34} color="#043B22" style={styles.badgeIcon} />
        </View>
        <Text accessibilityRole="header" style={[typography.titleMedium, { color: colors.text }]}>Kiểm tra hộp thư</Text>
        <Text style={[typography.body, styles.center, { color: colors.muted }]}>Nhập mã 6 chữ số trong email gửi tới {email}.</Text>
      </View>
      <FormField label="Mã xác minh" value={code} error={codeError} maxLength={6}
        onChangeText={text => { setCode(text.replace(/\D/g, '')); setCodeError(undefined); }}
        editable={!busy} keyboardType="number-pad" autoComplete="one-time-code" colors={colors} inputStyle={inputStyle} />
      {notice ? <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.muted }]}>{notice}</Text> : null}
      <AppButton label={pending ?? 'Xác minh mã'} loading={busy} colors={colors} onPress={verify} />
      <AppButton label="Gửi lại mã" variant="secondary" disabled={busy} colors={colors} onPress={resend} />
    </> : null}
    {stage === 'password' ? <>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><RecoveryLock /></View>
      <Text style={[typography.body, { color: colors.muted }]}>Chọn mật khẩu mới có ít nhất 8 ký tự.</Text>
      <PasswordField label="Mật khẩu mới" value={password} onChange={value => { setPassword(value); clearFieldError('password'); }}
        error={fieldErrors.password} disabled={busy} isNew />
      <PasswordField label="Nhập lại mật khẩu mới" value={confirmation} onChange={value => { setConfirmation(value); clearFieldError('confirmation'); }}
        error={fieldErrors.confirmation} disabled={busy} isNew />
      <AppButton label={pending ?? 'Lưu mật khẩu'} loading={busy} onPress={savePassword} colors={colors} />
    </> : null}
    {stage === 'done' ? <>
      <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.text }]}>
        {linking ? 'Email đã liên kết với hồ sơ của bạn.' : 'Bạn có thể dùng mật khẩu mới để đăng nhập.'}
      </Text>
      <AppButton label={linking ? 'Về Cá nhân' : 'Quay lại đăng nhập'} colors={colors}
        onPress={linking ? onComplete : () => navigate('sign-in')} />
    </> : null}
  </AccountFormFrame>;
}

const styles = StyleSheet.create({
  primary: { minHeight: 56 },
  codeIntro: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
  center: { textAlign: 'center' },
  badge: { alignItems: 'center', justifyContent: 'center' },
  badgeIcon: { position: 'absolute' },
});
