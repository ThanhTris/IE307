import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mail } from 'lucide-react-native';
import EmailBadge from '../../../../assets/brand/account/email-badge.svg';
import RecoveryBadge from '../../../../assets/brand/account/recovery-badge.svg';
import RecoveryLock from '../../../../assets/brand/account/recovery-lock.svg';
import type { AccountService } from '../../../data/auth';
import type { ApiError } from '../../../data/api/contracts';
import { normalizeEmail, validDisplayName, validEmail, validNewPassword } from '../../../data/auth/validation';
import { AppButton, FormField } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { spacing, typography } from '../../../shared/theme/tokens';
import { AccountFormFrame } from '../components/AccountFormFrame';
import { PasswordField } from '../components/PasswordField';
import { useAccountAction } from '../hooks/useAccountAction';
import { accountErrorMessage } from '../services/accountMessages';

export type AccountAccessFlow = 'sign-in' | 'sign-up' | 'link' | 'recovery';
type Stage = 'details' | 'code' | 'password' | 'done';
type SignupErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmation', string>>;
const titles = { 'sign-in': 'Đăng nhập', 'sign-up': 'Đăng ký', link: 'Liên kết email', recovery: 'Quên mật khẩu' };

export function AccountAccessScreen({ flow, account, isGuest, onBack, onNavigate, onComplete }: {
  flow: AccountAccessFlow;
  account: AccountService;
  isGuest: boolean;
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
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});
  const [notice, setNotice] = useState('');
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

  useEffect(() => () => {
    const active = proof.current;
    if (active) {
      active.abort();
      account.discardPasswordProof(active.signal);
      proof.current = null;
    }
  }, [account]);

  function resetPasswords() { setPassword(''); setConfirmation(''); }

  function clearSignupError(field: keyof SignupErrors) {
    setSignupErrors(current => current[field] ? { ...current, [field]: undefined } : current);
  }

  function navigate(next: AccountAccessFlow) {
    resetPasswords();
    setCode('');
    onNavigate(next);
  }

  function goTo(next: Stage) {
    setValidation('');
    setSignupErrors({});
    setNotice('');
    clearError();
    resetPasswords();
    setCode('');
    setStage(next);
  }

  function back() {
    if (stage === 'details' || stage === 'password' || stage === 'done') onBack();
    else goTo('details');
  }

  function submitDetails() {
    const address = normalizeEmail(email);
    if (signingUp) {
      const invalid: SignupErrors = {
        name: !name.trim() ? 'Nhập tên hiển thị.' : !validDisplayName(name) ? 'Tên hiển thị cần từ 1 đến 24 ký tự hợp lệ.' : undefined,
        email: !address ? 'Nhập địa chỉ email.' : !validEmail(address) ? 'Nhập địa chỉ email hợp lệ.' : undefined,
        password: !password ? 'Nhập mật khẩu.' : !validNewPassword(password) ? 'Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte.' : undefined,
        confirmation: !confirmation ? 'Nhập lại mật khẩu.' : password !== confirmation ? 'Hai mật khẩu chưa khớp.' : undefined,
      };
      setSignupErrors(invalid);
      clearError();
      if (Object.values(invalid).some(Boolean)) return;
      setEmail(address);
      void run('Đang gửi mã…', () => account.signUp({ email: address, password, displayName: name.trim() }),
        () => goTo('code'), showSignupError);
      return;
    }
    if (!validEmail(address)) return setValidation('Nhập địa chỉ email hợp lệ.');
    if (signingIn && !password) return setValidation('Nhập mật khẩu của bạn.');
    setValidation('');
    setEmail(address);
    if (signingIn) return void run('Đang đăng nhập…', () => account.signIn({ email: address, password }), onComplete, resetPasswords);
    const request = linking ? () => account.linkEmail(address)
      : () => account.sendCode(address, 'recovery');
    void run('Đang gửi mã…', request, () => goTo('code'), resetPasswords);
  }

  function showSignupError(error: ApiError) {
    const reason = error.details?.reason;
    if (reason === 'weak_password') {
      setSignupErrors({ password: accountErrorMessage(error) });
      clearError();
    } else if (reason === 'email_exists' || reason === 'user_already_exists') {
      setSignupErrors({ email: accountErrorMessage(error) });
      clearError();
    } else resetPasswords();
  }

  function resend() {
    setValidation('');
    setNotice('');
    const address = normalizeEmail(email);
    if (!validEmail(address)) return setValidation('Nhập địa chỉ email hợp lệ.');
    const request = linking ? () => account.linkEmail(address)
      : () => account.sendCode(address, recovery ? 'recovery' : 'signup');
    void run('Đang gửi mã…', request, () => {
      goTo('code');
      setNotice('Nếu email đủ điều kiện, mã mới sẽ được gửi.');
    });
  }

  function verify() {
    if (!/^\d{6}$/.test(code)) return setValidation('Nhập đủ 6 chữ số.');
    setValidation('');
    const controller = proof.current ??= new AbortController();
    void run('Đang xác minh…', () => account.verifyCode(email, code,
      linking ? 'email_change' : recovery ? 'recovery' : 'signup', controller.signal),
    recovery || linking ? () => goTo('password') : onComplete, () => setCode(''));
  }

  function savePassword() {
    if (!validNewPassword(password)) return setValidation('Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte.');
    if (password !== confirmation) return setValidation('Hai mật khẩu chưa khớp.');
    if (!proof.current) return setValidation('Mã xác minh đã hết hạn. Hãy bắt đầu lại.');
    setValidation('');
    const { signal } = proof.current;
    void run('Đang lưu mật khẩu…', () => account.setPassword(password, signal), () => goTo('done'), resetPasswords);
  }

  const title = stage === 'code' ? recovery ? 'Mã đặt lại mật khẩu' : 'Xác minh email'
    : stage === 'password' ? 'Đặt mật khẩu mới' : stage === 'done' ? 'Đã lưu mật khẩu' : titles[flow];
  const detailLabel = signingIn ? 'Đăng nhập' : signingUp ? 'Tạo tài khoản' : 'Gửi mã xác minh';
  const showExistingAccount = signingIn || signingUp || linking;
  return <AccountFormFrame title={title} hero={hero} onBack={back} busy={busy} error={error}>
    {validation ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{validation}</Text> : null}
    {stage === 'details' ? <>
      {recovery || linking || (signingIn && isGuest) ? <Text style={[typography.body, { color: colors.text }]}>
        {recovery ? 'Nhập email để nhận mã đặt lại mật khẩu.' : linking
          ? 'Xác minh email rồi đặt mật khẩu để giữ hồ sơ, bạn bè và lịch sử của phiên khách này.'
          : 'Đăng nhập sẽ chuyển sang dữ liệu của tài khoản đó. Để giữ dữ liệu phiên khách, hãy liên kết email trong Cá nhân.'}
      </Text> : null}
      {signingUp ? <FormField label="Tên hiển thị" value={name} onChangeText={value => { setName(value); clearSignupError('name'); }}
        error={signupErrors.name} editable={!busy}
        autoCapitalize="words" colors={colors} inputStyle={inputStyle} /> : null}
      <FormField label="Email" value={email} onChangeText={value => { setEmail(value); clearSignupError('email'); }}
        error={signingUp ? signupErrors.email : undefined} editable={!busy} keyboardType="email-address"
        autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="ten@example.com" colors={colors} inputStyle={inputStyle} />
      {signingIn || signingUp ? <PasswordField label="Mật khẩu" value={password}
        onChange={value => { setPassword(value); clearSignupError('password'); }}
        error={signingUp ? signupErrors.password : undefined} disabled={busy} isNew={signingUp} /> : null}
      {signingUp ? <PasswordField label="Nhập lại mật khẩu" value={confirmation}
        onChange={value => { setConfirmation(value); clearSignupError('confirmation'); }}
        error={signupErrors.confirmation} disabled={busy} isNew /> : null}
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
        <Text style={[typography.body, styles.center, { color: colors.muted }]}>Nếu địa chỉ đủ điều kiện, mã 6 chữ số sẽ được gửi tới {email}.</Text>
      </View>
      <FormField label="Mã xác minh" value={code} onChangeText={text => setCode(text.replace(/\D/g, ''))} maxLength={6}
        editable={!busy} keyboardType="number-pad" autoComplete="one-time-code" colors={colors} inputStyle={inputStyle} />
      {notice ? <Text accessibilityLiveRegion="polite" style={[typography.body, { color: colors.muted }]}>{notice}</Text> : null}
      <AppButton label={pending ?? 'Xác minh mã'} loading={busy} colors={colors} onPress={verify} />
      <AppButton label="Gửi lại mã" variant="secondary" disabled={busy} colors={colors} onPress={resend} />
    </> : null}
    {stage === 'password' ? <>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><RecoveryLock /></View>
      <Text style={[typography.body, { color: colors.muted }]}>Chọn mật khẩu mới có ít nhất 8 ký tự.</Text>
      <PasswordField label="Mật khẩu mới" value={password} onChange={setPassword} disabled={busy} isNew />
      <PasswordField label="Nhập lại mật khẩu mới" value={confirmation} onChange={setConfirmation} disabled={busy} isNew />
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
