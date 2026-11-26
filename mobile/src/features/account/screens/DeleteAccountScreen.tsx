import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePreventRemove } from 'expo-router';
import { Controller, useForm, useWatch, type FieldErrors, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import type { ApiError, SessionUser } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { AppButton, FormField } from '../../../shared/ui';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { AccountFormFrame } from '../components/AccountFormFrame';
import { PasswordField } from '../components/PasswordField';
import type { AccountDeletion } from '../services/accountDeletion';

const confirmationPhrase = 'XÓA';
const initialValues = { confirmation: '', password: '' };
type Fields = typeof initialValues;

function confirmationSchema(needsPassword: boolean) {
  return z.object({
    confirmation: z.string().refine(value => value.normalize('NFC').trim().toLocaleUpperCase('vi') === confirmationPhrase, {
      message: 'Nhập XÓA để xác nhận.',
    }),
    password: needsPassword ? z.string().min(1, 'Nhập mật khẩu hiện tại.') : z.string(),
  });
}

function resolveWith(schema: ReturnType<typeof confirmationSchema>): Resolver<Fields> {
  return values => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    const errors: FieldErrors<Fields> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === 'confirmation' || field === 'password') errors[field] = { type: 'validate', message: issue.message };
    }
    return { values: {}, errors };
  };
}

function errorMessage(error: ApiError): string {
  switch (error.details?.reason ?? error.messageKey) {
    case 'AUTH_REQUIRED': return 'Phiên đã hết hạn. Hãy đăng nhập lại hoặc bắt đầu phiên khách mới từ màn hình chào mừng.';
    case 'FORBIDDEN': return 'Phiên này không có quyền xóa tài khoản.';
    case 'ACTIVE_ROOM': return 'Hãy rời hoặc hủy phòng chờ, hoặc đợi vòng chơi kết thúc rồi thử lại.';
    case 'DELETION_IN_PROGRESS': return 'Yêu cầu xóa đang được xử lý. Hãy chờ rồi thử lại.';
    case 'CONFLICT': return 'Trạng thái tài khoản đã thay đổi. Hãy kiểm tra rồi thử lại.';
    case 'RATE_LIMITED': return 'Có quá nhiều yêu cầu. Hãy chờ trước khi thử lại.';
    case 'SERVER_RETRY': return 'Máy chủ chưa xác nhận yêu cầu. Hãy chờ rồi thử lại.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT': return 'Chưa nhận được phản hồi. Kiểm tra kết nối rồi thử lại.';
    case 'MALFORMED_RESPONSE': return 'Chưa xác nhận được kết quả xóa. Hãy thử lại để kiểm tra.';
    default: return 'Chưa thể xử lý yêu cầu xóa tài khoản. Hãy thử lại.';
  }
}

type Props = {
  user: SessionUser;
  deletion: AccountDeletion;
  onBack: () => void;
  onSignInAgain: () => Promise<boolean>;
};

export function DeleteAccountScreen({ user, deletion, onBack, onSignInAgain }: Props) {
  const { colors } = useShellTheme();
  const [error, setError] = useState<ApiError>();
  const [leaving, setLeaving] = useState(false);
  const loginRequired = error?.messageKey === 'AUTH_REQUIRED';
  const [clock, setClock] = useState(Date.now);
  const resume = deletion.canResume(user.id);
  const cooldown = deletion.retryAt(user.id);
  const waiting = cooldown > clock;
  const needsPassword = !user.isGuest && !resume;
  const schema = useMemo(() => confirmationSchema(needsPassword), [needsPassword]);
  const resolver = useMemo(() => resolveWith(schema), [schema]);
  const form = useForm<Fields>({ defaultValues: initialValues, resolver, mode: 'onChange' });
  const values = useWatch({ control: form.control });
  const valid = schema.safeParse(values).success;
  const busy = form.formState.isSubmitting || leaving;
  usePreventRemove(busy);

  const scope = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const lifetime = new AbortController();
    scope.current = lifetime;
    return () => { lifetime.abort(); scope.current = null; };
  }, []);
  useEffect(() => {
    if (cooldown <= clock) return;
    const delay = Math.max(0, Math.min(60_000, cooldown - Date.now()));
    const timer = setTimeout(() => setClock(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [cooldown, clock]);

  const submit = async () => {
    if (submitting.current || leaving || loginRequired || waiting) return;
    const lifetime = scope.current;
    if (!lifetime) return;
    submitting.current = true;
    try {
      await form.handleSubmit(async values => {
        setError(undefined);
        form.setValue('password', '');
        const result = await deletion.submit({ userId: user.id, password: values.password, signal: lifetime.signal });
        if (result.ok || lifetime.signal.aborted) return;
        setClock(Date.now());
        if (result.error.details?.reason === 'INVALID_PASSWORD') {
          form.setError('password', { type: 'server', message: 'Mật khẩu chưa đúng. Hãy nhập lại.' });
        } else setError(result.error);
      })();
    } finally { submitting.current = false; }
  };

  const signInAgain = async () => {
    if (busy) return;
    setLeaving(true);
    try {
      if (!await onSignInAgain()) setError({ messageKey: 'AUTH_REQUIRED', details: { reason: 'SIGN_OUT_FAILED' } });
    } finally { setLeaving(false); }
  };

  return <AccountFormFrame title="Xóa tài khoản" onBack={onBack} busy={busy}>
    <View style={[styles.warning, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
      <Text accessibilityRole="header" style={[typography.titleMedium, { color: colors.danger }]}>Xóa vĩnh viễn tài khoản?</Text>
      <Text style={[typography.body, { color: colors.text }]}>
        Hồ sơ, bạn bè, lời mời, khẩu vị và lịch sử cá nhân sẽ bị xóa. Kết quả nhóm được giữ theo quyền truy cập, tên bạn sẽ được ẩn.
      </Text>
      <Text style={[typography.bodyBold, { color: colors.text }]}>Bạn không thể khôi phục tài khoản sau khi xóa.</Text>
    </View>
    <Controller control={form.control} name="confirmation" render={({ field, fieldState }) => (
      <FormField colors={colors} label="Nhập XÓA để xác nhận" placeholder={confirmationPhrase} value={field.value}
        onChangeText={field.onChange} autoCapitalize="characters" autoCorrect={false} maxLength={24}
        editable={!busy && !loginRequired} error={fieldState.error?.message} />
    )} />
    {needsPassword ? <Controller control={form.control} name="password" render={({ field, fieldState }) => (
      <PasswordField label="Mật khẩu hiện tại" value={field.value} onChange={field.onChange}
        disabled={busy || loginRequired} error={fieldState.error?.message} />
    )} /> : null}
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[typography.body, { color: colors.danger }]}>
      {error.details?.reason === 'SIGN_OUT_FAILED' ? 'Chưa dọn xong phiên trên thiết bị. Hãy thử lại.' : errorMessage(error)}
    </Text> : null}
    {waiting ? <Text style={[typography.caption, { color: colors.muted }]}>Nút thử lại sẽ mở khi hết thời gian chờ.</Text> : null}
    <View style={styles.actions}>
      {loginRequired
        ? <AppButton label={user.isGuest ? 'Về màn hình chào mừng' : 'Đăng nhập lại'} colors={colors} loading={leaving} onPress={() => { void signInAgain(); }} />
        : <AppButton label={error ? 'Thử lại' : 'Xóa tài khoản'} variant="danger" colors={colors}
          disabled={!valid || waiting} loading={busy} onPress={() => { void submit(); }} />}
      <AppButton label="Hủy" variant="secondary" disabled={busy} colors={colors} onPress={onBack} />
    </View>
  </AccountFormFrame>;
}

const styles = StyleSheet.create({
  warning: { padding: spacing.lg, gap: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg },
  actions: { gap: spacing.md, marginTop: 'auto' },
});
