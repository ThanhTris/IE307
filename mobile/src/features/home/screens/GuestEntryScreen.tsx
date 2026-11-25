import { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, ErrorRecovery, FormField, HelpLink, SheetDialog, StatusNotice } from '../../../shared/ui';
import type { ApiError, ErrorCode } from '../../../data/api/contracts';
import { describeError } from '../../../shared/errors/describeError';
import type { ReportContext } from '../../../shared/errors/errorReport';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { ReportErrorSheet } from '../../support/components/ReportErrorSheet';
import { spacing, typography } from '../../../shared/theme/tokens';
import { validDisplayName } from '../../rooms/services/roomEntry';
import type { HomeLiveSession } from './HomeScreen';
import { WelcomeArtwork, WelcomeScreen } from './WelcomeScreen';
import { FOCUSED_STYLE } from '../../../shared/ui/layout/ScreenContainer';

type Props = {
  /** `true` when the guest is ready; `false` or the API error when it is not. */
  onContinue: (name: string) => Promise<boolean | ApiError>;
  onComplete: () => void;
  session?: HomeLiveSession;
  onSignIn?: () => void;
  onSignUp?: () => void;
};

/** UI-only guest flow. The caller supplies mock entry or the existing GM-25 session seam. */
export function GuestEntryScreen({ onContinue, onComplete, session, onSignIn, onSignUp }: Props) {
  const { colors, dark } = useShellTheme();
  const { textStyle } = useAppFonts();
  const heroColor = dark ? colors.primary : colors.green;
  const [step, setStep] = useState<'welcome' | 'name'>('welcome');
  const [name, setName] = useState('');
  /** Mistake in the typed name only; server failures live in `failure`. */
  const [error, setError] = useState('');
  const [failure, setFailure] = useState<ReportContext & { errorCode: ErrorCode }>();
  const [report, setReport] = useState<ReportContext>();
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [accountPanel, setAccountPanel] = useState<string>();
  const locked = useRef(false);
  const mounted = useRef(false);
  const recoveryLocked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // A signup whose outcome never arrived blocks the session so a second guest is not created by accident (GM-16).
  // "Thử lại" is the person's explicit choice to drop that attempt and start again.
  const uncertain = session?.issue === 'signup-uncertain';
  const blocked = !!session && (session.isInitializing || (!uncertain && (session.status !== 'empty' || session.issue !== 'no-session')));
  const disabled = busy || accepted || recoveryBusy;
  const back = () => { if (!locked.current && !recoveryLocked.current) { setStep('welcome'); setError(''); setFailure(undefined); } };
  const failed = (errorCode: ErrorCode, action = 'create_guest') =>
    setFailure({ errorCode, screen: 'guest_entry', action, occurredAt: new Date().toISOString() });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (locked.current || recoveryLocked.current) return true;
      if (accountPanel) { setAccountPanel(undefined); return true; }
      if (step === 'name') { setStep('welcome'); setError(''); setFailure(undefined); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [step, accountPanel]);

  const submit = async () => {
    if (locked.current || recoveryLocked.current || blocked) return;
    if (!validDisplayName(name)) { setError('Tên cần từ 1 đến 24 ký tự.'); return; }
    locked.current = true;
    setBusy(true);
    setError('');
    setFailure(undefined);
    let confirmed = false;
    try {
      if (uncertain && session && !(await session.logout())) {
        if (mounted.current) failed('UNKNOWN_ERROR');
        return;
      }
      const outcome = await onContinue(name.trim());
      if (!mounted.current) return;
      confirmed = outcome === true;
      if (confirmed) { setAccepted(true); onComplete(); }
      else if (typeof outcome === 'object' && outcome.messageKey === 'INVALID_INPUT') setError('Máy chủ không nhận tên này. Thử một tên khác.');
      else failed(typeof outcome === 'object' ? outcome.messageKey : 'UNKNOWN_ERROR');
    } catch {
      if (mounted.current) failed('NETWORK_ERROR');
    } finally {
      if (!confirmed) locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const recover = async (reset: boolean) => {
    if (!session || locked.current || recoveryLocked.current) return;
    recoveryLocked.current = true;
    setRecoveryBusy(true);
    setError('');
    try {
      const recovered = await (reset ? session.logout() : session.restoreSession());
      if (mounted.current && !recovered) failed('UNKNOWN_ERROR', 'restore_session');
    } catch {
      if (mounted.current) failed('NETWORK_ERROR', 'restore_session');
    } finally {
      recoveryLocked.current = false;
      if (mounted.current) setRecoveryBusy(false);
    }
  };

  const needsRestore = session?.issue === 'restore-unavailable' || session?.issue === 'session-recovery-required';
  const description = failure ? describeError({ messageKey: failure.errorCode }) : undefined;
  const blockedContext: ReportContext = failure
    ?? { errorCode: needsRestore ? 'NETWORK_ERROR' : 'AUTH_REQUIRED', screen: 'guest_entry', action: 'restore_session' };
  const notice = session?.isInitializing
    ? <StatusNotice title="Đang mở lại tài khoản…" message="Chờ một chút trước khi tiếp tục." colors={colors} />
    : blocked
      ? <ErrorRecovery
        title={failure ? 'Vẫn chưa được' : undefined} message={failure ? 'Kiểm tra mạng rồi thử lại.' : undefined}
        note={needsRestore ? 'Chưa mở được tài khoản đã lưu. Thông tin đăng nhập vẫn còn trên máy.'
          : 'Phiên đăng nhập cũ không còn dùng được. Bắt đầu lại sẽ xóa dữ liệu của phiên đó trên máy.'}
        actionLabel={needsRestore ? 'Thử lại' : 'Bắt đầu lại'} busy={recoveryBusy}
        onAction={() => { void recover(!needsRestore); }} onHelp={() => setReport(blockedContext)} colors={colors} />
      : null;
  const guestHelp: ReportContext | undefined = failure && description?.reportable ? failure
    : uncertain && !failure ? { errorCode: 'NETWORK_ERROR', screen: 'guest_entry', action: 'create_guest' } : undefined;
  const failureToast = failure && description && !blocked
    ? <ToastNotice title={description.title} message={description.message} tone="error" /> : null;
  const retrying = !blocked && (uncertain || description?.action === 'retry');
  const reportSheet = <ReportErrorSheet context={report} onClose={() => setReport(undefined)}
    onRetry={blocked ? undefined : () => { if (step === 'name') void submit(); else setStep('name'); }} colors={colors} />;
  const signIn = () => { if (onSignIn) onSignIn(); else setAccountPanel('Đăng nhập'); };
  const signUp = () => { if (onSignUp) onSignUp(); else setAccountPanel('Đăng ký'); };
  const accountDialog = <SheetDialog visible={!!accountPanel} title={accountPanel ?? 'Tài khoản'} onClose={() => setAccountPanel(undefined)} colors={colors}>
    <Text style={[typography.body, { color: colors.text }, textStyle(400)]}>Tính năng tài khoản chưa được tích hợp trong bản này. Bạn có thể tiếp tục với tư cách khách.</Text>
    <AppButton label="Tiếp tục với khách" onPress={() => { setAccountPanel(undefined); setStep('name'); }} disabled={blocked || disabled} colors={colors} />
  </SheetDialog>;

  if (step === 'welcome') return <>
    <WelcomeScreen onGuest={() => setStep('name')} onSignIn={signIn} onSignUp={signUp} disabled={blocked || disabled} notice={notice} />
    {accountDialog}
    {reportSheet}
  </>;

  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: heroColor }]}>
    <WelcomeArtwork bottomOffset={250} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" accessibilityState={{ disabled }} disabled={disabled} onPress={back} style={styles.back}>
        <Text style={[styles.backLabel, { color: '#FFFFFF' }, textStyle(500)]}>‹ Quay lại</Text>
      </Pressable>
      <View style={styles.center}>
        <Text accessibilityRole="header" style={[styles.question, { color: '#FFFFFF' }, textStyle(700)]}>Bạn tên gì?</Text>
        <Text style={[styles.description, { color: '#FFFFFF' }, textStyle(400)]}>Tên của bạn sẽ hiện trong phòng ăn.</Text>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <FormField label="Tên khách" hideLabel value={name} onChangeText={value => { setName(value); setError(''); }} editable={!disabled} placeholder="Nhập tên của bạn" error={error || undefined} autoCorrect={false} inputStyle={[styles.input, { backgroundColor: dark ? colors.surface : colors.onPrimary }, textStyle(500)]} colors={colors} />
          {notice}
          {failureToast}
          <AppButton label={accepted ? 'Đã tiếp tục' : retrying ? 'Thử lại' : 'Tiếp tục'} onPress={() => { void submit(); }} loading={busy} disabled={disabled || blocked} style={styles.continueButton} textStyle={{ fontSize: 17, lineHeight: 24, ...textStyle(600) }} colors={colors} />
          {guestHelp && !blocked && !busy ? <HelpLink onPress={() => setReport(guestHelp)} colors={colors} /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Đã có tài khoản? Đăng nhập" accessibilityState={{ disabled }} disabled={disabled} onPress={signIn} style={styles.signIn}>
            <Text style={[styles.signInLabel, { color: dark ? colors.text : '#08765F' }, textStyle(700)]}>Đã có tài khoản? Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
    {accountDialog}
    {reportSheet}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, ...FOCUSED_STYLE, paddingHorizontal: 30 },
  back: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { fontSize: 15, lineHeight: 22 },
  center: { flex: 1, justifyContent: 'center', paddingBottom: 48 },
  question: { fontSize: 40, lineHeight: 48 },
  description: { marginTop: 8, marginBottom: 24, fontSize: 17, lineHeight: 24 },
  card: { borderRadius: 28, padding: spacing.xl, gap: spacing.md },
  input: { minHeight: 64, borderRadius: 16, fontSize: 19, lineHeight: 26, paddingHorizontal: 17 },
  continueButton: { minHeight: 60 },
  signIn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  signInLabel: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
