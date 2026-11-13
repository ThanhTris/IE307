import { useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, FormField, SheetDialog, StatusNotice } from '../../../shared/ui';
import { spacing, typography } from '../../../shared/theme/tokens';
import { validDisplayName } from '../../rooms/services/roomEntry';
import type { HomeLiveSession } from './HomeScreen';
import { WelcomeArtwork, WelcomeScreen } from './WelcomeScreen';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

type Props = {
  onContinue: (name: string) => Promise<boolean>;
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [accountPanel, setAccountPanel] = useState<string>();
  const locked = useRef(false);
  const mounted = useRef(false);
  const recoveryLocked = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const blocked = !!session && (session.isInitializing || session.status !== 'empty' || session.issue !== 'no-session');
  const disabled = busy || accepted || recoveryBusy;
  const back = () => { if (!locked.current && !recoveryLocked.current) { setStep('welcome'); setError(''); } };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (locked.current || recoveryLocked.current) return true;
      if (accountPanel) { setAccountPanel(undefined); return true; }
      if (step === 'name') { setStep('welcome'); setError(''); return true; }
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
    let confirmed = false;
    try {
      confirmed = await onContinue(name.trim());
      if (!mounted.current) return;
      if (confirmed) { setAccepted(true); onComplete(); }
      else setError('Chưa tạo được phiên. Kiểm tra trạng thái phiên rồi thử lại.');
    } catch {
      if (mounted.current) setError('Chưa thể tiếp tục. Kiểm tra kết nối rồi thử lại.');
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
      if (mounted.current && !recovered) setError('Chưa xử lý được phiên. Hãy thử lại.');
    } catch {
      if (mounted.current) setError('Chưa xử lý được phiên. Kiểm tra kết nối rồi thử lại.');
    } finally {
      recoveryLocked.current = false;
      if (mounted.current) setRecoveryBusy(false);
    }
  };

  const needsRestore = session?.issue === 'restore-unavailable' || session?.issue === 'session-recovery-required';
  const notice = blocked ? <StatusNotice
    title={session?.isInitializing ? 'Đang khôi phục phiên…' : needsRestore ? 'Chưa khôi phục được phiên' : 'Phiên cần được xử lý'}
    message={session?.isInitializing ? 'Chờ xác nhận phiên đã lưu trước khi tiếp tục.' : needsRestore ? 'Thông tin phiên đã lưu được giữ nguyên. Hãy thử khôi phục phiên.' : 'Không tạo khách thay thế khi phiên cũ chưa rõ kết quả hoặc đã hết hạn. Xóa phiên cục bộ trước khi bắt đầu lại.'}
    tone="warning"
    actionLabel={!disabled && !session?.isInitializing ? needsRestore ? 'Thử khôi phục phiên' : 'Xóa phiên cục bộ rồi thử lại' : undefined}
    onAction={() => { void recover(!needsRestore); }} colors={colors}
  /> : null;
  const signIn = () => { if (onSignIn) onSignIn(); else setAccountPanel('Đăng nhập'); };
  const signUp = () => { if (onSignUp) onSignUp(); else setAccountPanel('Đăng ký'); };
  const accountDialog = <SheetDialog visible={!!accountPanel} title={accountPanel ?? 'Tài khoản'} onClose={() => setAccountPanel(undefined)} colors={colors}>
    <Text style={[typography.body, { color: colors.text }, textStyle(400)]}>Tính năng tài khoản chưa được tích hợp trong bản này. Bạn có thể tiếp tục với tư cách khách.</Text>
    <AppButton label="Tiếp tục với khách" onPress={() => { setAccountPanel(undefined); setStep('name'); }} disabled={blocked || disabled} colors={colors} />
  </SheetDialog>;

  if (step === 'welcome') return <>
    <WelcomeScreen onGuest={() => setStep('name')} onSignIn={signIn} onSignUp={signUp} disabled={blocked || disabled} notice={<>{notice}{error ? <ToastNotice title="Chưa thể tiếp tục" message={error} tone="error" /> : null}</>} />
    {accountDialog}
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
          <AppButton label={accepted ? 'Đã tiếp tục' : 'Tiếp tục'} onPress={() => { void submit(); }} loading={busy} disabled={disabled || blocked} style={styles.continueButton} textStyle={{ fontSize: 17, lineHeight: 24, ...textStyle(600) }} colors={colors} />
          <Pressable accessibilityRole="button" accessibilityLabel="Đã có tài khoản? Đăng nhập" accessibilityState={{ disabled }} disabled={disabled} onPress={signIn} style={styles.signIn}>
            <Text style={[styles.signInLabel, { color: dark ? colors.text : '#08765F' }, textStyle(700)]}>Đã có tài khoản? Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
    {accountDialog}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 30 },
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
