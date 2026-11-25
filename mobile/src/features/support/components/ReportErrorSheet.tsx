import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { AppButton, FormField } from '../../../shared/ui';
import { ToastHost, useToast } from '../../../shared/ui/feedback/Toast';
import { FOCUSED_STYLE } from '../../../shared/ui/layout/ScreenContainer';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { ComponentThemeProps } from '../../../shared/ui/types';
import { describeError, helpSteps } from '../../../shared/errors/describeError';
import { HelpTopics } from './HelpTopics';
import {
  SUPPORT_EMAIL, buildErrorReport, reportSummary, sendErrorReport, supportMailUrl,
  type ErrorReport, type ReportContext, type SendResult,
} from '../../../shared/errors/errorReport';

type Channel = 'app' | 'email';

type Props = ComponentThemeProps & {
  /** The failure to get help with; `undefined` keeps the screen closed. */
  context: ReportContext | undefined;
  onClose: () => void;
  /** Runs the failed action again; the help screen closes first. */
  onRetry?: () => void;
  send?: typeof sendErrorReport;
};

/** "Báo lỗi": what happened, what to try, then how to tell us (in the app or by email). */
export function ReportErrorSheet({ context, onClose, onRetry, send = sendErrorReport }: Props) {
  if (!context) return null;
  return <Modal testID="help-center" visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider>
      <HelpCenter context={context} onClose={onClose} onRetry={onRetry} send={send} />
      <ToastHost />
    </SafeAreaProvider>
  </Modal>;
}

function HelpCenter({ context, onClose, onRetry, send }: Props & { context: ReportContext; send: typeof sendErrorReport }) {
  const { colors } = useShellTheme();
  const toast = useToast();
  const [channel, setChannel] = useState<Channel>('app');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendResult>();
  const report = useRef<ErrorReport | undefined>(undefined);
  /** Opened from the "?" without a failure: answers first, then a written report. */
  const failureCode = context.errorCode === 'USER_FEEDBACK' ? undefined : context.errorCode;
  const description = failureCode ? describeError({ messageKey: failureCode }) : undefined;
  const missingNote = !failureCode && !note.trim();
  const reportCode = result?.status === 'sent' ? result.reportCode : undefined;
  const delivered = result?.status === 'sent' || result?.status === 'queued';

  /** The same problem keeps one report id across retries, email and copy, so the server stores it once. */
  const current = async (urgent: boolean) => {
    const built = await buildErrorReport(context, note, urgent);
    const previous = report.current;
    const next = previous ? { ...built, clientReportId: previous.clientReportId, urgent: urgent || previous.urgent } : built;
    report.current = next;
    return next;
  };

  const sendInApp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await send(await current(false));
      setResult(outcome);
      if (outcome.status === 'rejected') {
        toast?.show({ title: 'Máy chủ chưa nhận báo lỗi', message: outcome.reason === 'RATE_LIMITED' ? 'Bạn đã gửi nhiều báo lỗi. Thử lại sau hoặc gửi email.' : 'Hãy gửi qua email.', tone: 'error' });
        setChannel('email');
      }
    } finally {
      setBusy(false);
    }
  };

  const openEmail = async () => {
    const url = supportMailUrl(await current(true), reportCode);
    try {
      await Linking.openURL(url);
    } catch {
      await Clipboard.setStringAsync(SUPPORT_EMAIL);
      toast?.show({ title: 'Máy chưa có ứng dụng email', message: `Đã chép địa chỉ ${SUPPORT_EMAIL}.`, tone: 'warning' });
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(reportSummary(await current(false), reportCode));
    toast?.show({ title: 'Đã chép mã lỗi', tone: 'success' });
  };

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.line }];
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng báo lỗi" onPress={onClose} style={styles.back}>
        <Text style={[typography.titleMedium, { color: colors.text }]}>‹</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[typography.titleMedium, styles.headerTitle, { color: colors.text }]}>Báo lỗi</Text>
    </View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {delivered ? <View style={card}>
          <Text accessibilityRole="header" style={[typography.titleMedium, styles.center, { color: colors.text }]}>
            {result?.status === 'sent' ? 'Đã gửi báo lỗi' : 'Chưa gửi được, đã lưu lại'}
          </Text>
          {reportCode ? <Text accessibilityLiveRegion="polite" style={[typography.bodyBold, styles.center, { color: colors.text }]}>Mã báo lỗi: {reportCode}</Text> : null}
          <Text style={[typography.body, styles.center, { color: colors.muted }]}>
            {result?.status === 'sent' ? 'Chúng tôi sẽ kiểm tra lỗi này. Nếu cần gấp, hãy gửi thêm email kèm mã báo lỗi.'
              : 'Chưa kết nối được máy chủ. Báo lỗi nằm trên máy và tự gửi khi bạn mở lại app. Nếu cần gấp, hãy gửi email.'}
          </Text>
          <AppButton label="Xong" onPress={onClose} colors={colors} />
          <AppButton label="Gửi thêm email" variant="quiet" onPress={() => { void openEmail(); }} colors={colors} />
        </View> : <>
          {failureCode && description ? <>
            <View style={card}>
              <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>{description.title}</Text>
              <Text style={[typography.body, { color: colors.muted }]}>{description.message}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Sao chép mã lỗi" onPress={() => { void copyCode(); }} style={styles.codeRow}>
                <Text style={[typography.caption, { color: colors.muted }]}>Mã lỗi: {failureCode} · Chạm để sao chép</Text>
              </Pressable>
            </View>

            <View style={card}>
              <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>1. Bạn thử trước</Text>
              {helpSteps(failureCode).map(step => <Text key={step} style={[typography.body, { color: colors.text }]}>• {step}</Text>)}
              {onRetry ? <AppButton label="Thử lại ngay" variant="secondary" disabled={busy} onPress={() => { onClose(); onRetry(); }} colors={colors} /> : null}
            </View>
          </> : <View style={card}>
            <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>1. Câu hỏi thường gặp</Text>
            <HelpTopics colors={colors} />
          </View>}

          <View style={card}>
            <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>{failureCode ? '2. Vẫn chưa được? Chọn cách báo' : '2. Báo vấn đề hoặc góp ý'}</Text>
            <ChannelOption selected={channel === 'app'} disabled={busy} onPress={() => setChannel('app')} colors={colors}
              title="Gửi trong app (nên dùng)" detail="Gửi thẳng cho hệ thống. Không cần email, bạn nhận mã báo lỗi." />
            <ChannelOption selected={channel === 'email'} disabled={busy} onPress={() => setChannel('email')} colors={colors}
              title="Gửi email cho quản trị viên" detail="Khi cần xử lý gấp hoặc muốn được trả lời lại." />
            <FormField label={failureCode ? 'Bạn đang làm gì khi gặp lỗi? (không bắt buộc)' : 'Bạn muốn báo điều gì?'}
              value={note} onChangeText={setNote} maxLength={500} editable={!busy}
              placeholder={failureCode ? 'Ví dụ: bấm Tiếp tục thì báo lỗi' : 'Mô tả vấn đề bạn gặp'} colors={colors} />
            <Text style={[typography.caption, { color: colors.muted }]}>
              {channel === 'app' ? 'Chỉ gửi loại báo cáo, màn đang mở, thời điểm, phiên bản app và ghi chú của bạn. Đừng ghi mật khẩu hay mã xác minh.'
                : `Mở app email với nội dung soạn sẵn gửi tới ${SUPPORT_EMAIL}. Bạn xem và sửa được trước khi gửi.`}
            </Text>
            <AppButton label={channel === 'app' ? (busy ? 'Đang gửi…' : 'Gửi báo lỗi') : 'Mở email để gửi'} loading={busy}
              disabled={channel === 'app' && missingNote}
              accessibilityHint={channel === 'app' && missingNote ? 'Hãy mô tả vấn đề trước' : undefined}
              onPress={() => { void (channel === 'app' ? sendInApp() : openEmail()); }} colors={colors} />
          </View>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function ChannelOption({ selected, disabled, title, detail, onPress, colors }: ComponentThemeProps & {
  selected: boolean; disabled: boolean; title: string; detail: string; onPress: () => void;
}) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityHint={detail}
    accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
    style={[styles.option, { borderColor: selected ? colors?.primary : colors?.line, borderWidth: selected ? 2 : 1 }]}>
    <View style={[styles.radio, { borderColor: selected ? colors?.primary : colors?.muted }]}>
      {selected ? <View style={[styles.radioDot, { backgroundColor: colors?.primary }]} /> : null}
    </View>
    <View style={styles.fill}>
      <Text style={[typography.bodyBold, { color: colors?.text }]}>{title}</Text>
      <Text style={[typography.caption, { color: colors?.muted }]}>{detail}</Text>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, ...FOCUSED_STYLE },
  back: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, ...FOCUSED_STYLE },
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  center: { textAlign: 'center' },
  codeRow: { minHeight: 48, justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.lg, padding: spacing.md, minHeight: 64 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
