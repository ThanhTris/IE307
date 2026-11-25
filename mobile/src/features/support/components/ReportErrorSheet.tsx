import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { AppButton, AppIcon, FormField } from '../../../shared/ui';
import { ToastHost, useToast } from '../../../shared/ui/feedback/Toast';
import { FOCUSED_STYLE } from '../../../shared/ui/layout/ScreenContainer';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { ComponentThemeProps } from '../../../shared/ui/types';
import { describeError, helpSteps } from '../../../shared/errors/describeError';
import { clearLastFailure } from '../../../shared/errors/incident';
import { HelpTopics } from './HelpTopics';
import {
  SUPPORT_EMAIL, buildErrorReport, reportSummary, sendErrorReport, supportMailUrl,
  type ErrorReport, type ReportContext, type SendResult,
} from '../../../shared/errors/errorReport';

type Channel = 'app' | 'email';

type Props = ComponentThemeProps & {
  /** The failure to get help with; `undefined` keeps the screen closed. */
  context: ReportContext | undefined;
  /** Latest reportable failure recorded in memory when the person opens Help from Profile. */
  recentFailure?: ReportContext;
  onClose: () => void;
  /** Runs the failed action again; the help screen closes first. */
  onRetry?: () => void;
  send?: typeof sendErrorReport;
};

/** "Báo lỗi": what happened, what to try, then how to tell us (in the app or by email). */
export function ReportErrorSheet({ context, recentFailure, onClose, onRetry, send = sendErrorReport }: Props) {
  if (!context) return null;
  return <Modal testID="help-center" visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaProvider>
      <HelpCenter context={context} recentFailure={recentFailure} onClose={onClose} onRetry={onRetry} send={send} />
      <ToastHost />
    </SafeAreaProvider>
  </Modal>;
}

function HelpCenter({ context, recentFailure, onClose, onRetry, send }: Props & { context: ReportContext; send: typeof sendErrorReport }) {
  const { colors } = useShellTheme();
  const toast = useToast();
  const [channel, setChannel] = useState<Channel>('app');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendResult>();
  const [attachRecent, setAttachRecent] = useState(Boolean(recentFailure));
  const report = useRef<ErrorReport | undefined>(undefined);
  const activeContext = context.errorCode === 'USER_FEEDBACK' && attachRecent && recentFailure ? recentFailure : context;
  /** Opened without a failure: FAQ first, then a written report (with optional recent error attached). */
  const failureCode = activeContext.errorCode === 'USER_FEEDBACK' ? undefined : activeContext.errorCode;
  const description = failureCode ? describeError({ messageKey: failureCode }) : undefined;
  const recentDescription = recentFailure && recentFailure.errorCode !== 'USER_FEEDBACK'
    ? describeError({ messageKey: recentFailure.errorCode }) : undefined;
  const missingNote = !failureCode && !note.trim();
  const reportCode = result?.status === 'sent' ? result.reportCode : undefined;
  const delivered = result?.status === 'sent' || result?.status === 'queued';

  /** The same problem keeps one report id across retries, email and copy, so the server stores it once. */
  const current = async (urgent: boolean) => {
    const built = await buildErrorReport(activeContext, note, urgent);
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
      if (outcome.status === 'sent' || outcome.status === 'queued') {
        clearLastFailure();
      } else if (outcome.status === 'rejected') {
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
    toast?.show({ title: 'Đã sao chép mã sự cố', tone: 'success' });
  };

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.line }];
  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <View style={[styles.header, { borderBottomColor: colors.line }]}>
      <View style={styles.headerText}>
        <Text accessibilityRole="header" style={[typography.titleMedium, { color: colors.text }]}>Báo lỗi</Text>
        <Text style={[typography.caption, { color: colors.muted }]}>Trợ giúp &amp; phản hồi sự cố</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng báo lỗi" onPress={onClose}
        style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.soft, opacity: pressed ? 0.7 : 1 }]}>
        <AppIcon name="close" size={20} color={colors.text} />
      </Pressable>
    </View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {delivered ? <View style={[card, styles.successCard]}>
          <View style={[styles.successBadge, { backgroundColor: colors.warm }]}>
            <AppIcon name={result?.status === 'sent' ? 'success' : 'hourglass'} size={30} color={result?.status === 'sent' ? colors.primary : colors.warning} />
          </View>
          <Text accessibilityRole="header" style={[typography.titleMedium, styles.center, { color: colors.text }]}>
            {result?.status === 'sent' ? 'Đã gửi báo lỗi' : 'Chưa gửi được, đã lưu lại'}
          </Text>
          {reportCode ? <Pressable accessibilityRole="button" accessibilityLabel={`Sao chép mã báo lỗi ${reportCode}`}
            onPress={() => { void copyCode(); }}
            style={[styles.ticketPill, { backgroundColor: colors.warm, borderColor: colors.line }]}>
            <Text accessibilityLiveRegion="polite" style={[typography.bodyBold, { color: colors.text }]}>Mã báo lỗi: {reportCode}</Text>
            <AppIcon name="copy" size={16} color={colors.primary} />
          </Pressable> : null}
          <Text style={[typography.body, styles.center, { color: colors.muted }]}>
            {result?.status === 'sent' ? 'Cảm ơn bạn! Chúng tôi đã ghi nhận để kiểm tra. Nếu cần gấp, bạn có thể gửi thêm email kèm mã trên.'
              : 'Chưa kết nối được máy chủ. Báo lỗi đã được giữ trên máy và tự gửi khi mở lại app.'}
          </Text>
          <AppButton label="Xong" onPress={onClose} colors={colors} style={styles.fullWidth} />
          <AppButton label="Gửi thêm email" variant="quiet" onPress={() => { void openEmail(); }} colors={colors} style={styles.fullWidth} />
        </View> : <>
          {recentFailure && recentDescription && context.errorCode === 'USER_FEEDBACK' ? (
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: attachRecent }}
              onPress={() => { report.current = undefined; setAttachRecent(value => !value); }}
              style={[styles.recentBanner, { backgroundColor: attachRecent ? colors.warm : colors.surface, borderColor: attachRecent ? colors.primary : colors.line }]}>
              <AppIcon name="warning" size={18} color={colors.warning} />
              <View style={styles.fill}>
                <Text style={[typography.bodyBold, { color: colors.text }]}>Đính kèm sự cố vừa gặp</Text>
                <Text style={[typography.caption, { color: colors.muted }]}>{recentDescription.title} · {recentFailure.errorCode}</Text>
              </View>
              <Text style={[typography.caption, styles.toggleLabel, { color: attachRecent ? colors.primary : colors.muted }]}>
                {attachRecent ? 'Đang bật' : 'Bỏ qua'}
              </Text>
            </Pressable>
          ) : null}

          {failureCode && description ? <>
            <View style={card}>
              <View style={styles.ticketHead}>
                <View style={[styles.ticketIcon, { backgroundColor: colors.warm }]}>
                  <AppIcon name="warning" size={20} color={colors.warning} />
                </View>
                <View style={styles.fill}>
                  <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>{description.title}</Text>
                  <Text style={[typography.caption, { color: colors.muted }]}>{description.message}</Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Sao chép mã lỗi" onPress={() => { void copyCode(); }}
                style={({ pressed }) => [styles.codeRow, { backgroundColor: colors.soft, borderColor: colors.line, opacity: pressed ? 0.75 : 1 }]}>
                <Text style={[typography.caption, styles.codeText, { color: colors.text }]}>Mã lỗi: {failureCode} · Chạm để sao chép</Text>
                <AppIcon name="copy" size={15} color={colors.primary} />
              </Pressable>
            </View>

            <View style={card}>
              <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>Thử khắc phục nhanh</Text>
              <View style={styles.steps}>
                {helpSteps(failureCode).map(step => (
                  <View key={step} style={styles.stepRow}>
                    <AppIcon name="check" size={15} color={colors.primary} />
                    <Text style={[typography.body, styles.fill, { color: colors.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
              {onRetry ? <AppButton label="Thử lại ngay" variant="secondary" disabled={busy} onPress={() => { onClose(); onRetry(); }} colors={colors} /> : null}
            </View>
          </> : <View style={card}>
            <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>Câu hỏi thường gặp</Text>
            <HelpTopics colors={colors} />
          </View>}

          <View style={card}>
            <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>{failureCode ? 'Gửi báo lỗi cho đội ngũ' : 'Báo vấn đề hoặc góp ý'}</Text>
            <ChannelOption selected={channel === 'app'} disabled={busy} onPress={() => setChannel('app')} colors={colors}
              title="Gửi trong app (nên dùng)" detail="Gửi thẳng cho hệ thống. Không cần email, nhận mã theo dõi." />
            <ChannelOption selected={channel === 'email'} disabled={busy} onPress={() => setChannel('email')} colors={colors}
              title="Gửi email cho quản trị viên" detail="Khi cần xử lý gấp hoặc muốn được phản hồi lại." />
            <FormField label={failureCode ? 'Bạn đang làm gì khi gặp lỗi? (không bắt buộc)' : 'Bạn muốn báo điều gì?'}
              value={note} onChangeText={setNote} maxLength={500} editable={!busy}
              placeholder={failureCode ? 'Ví dụ: bấm Tiếp tục thì báo lỗi' : 'Mô tả vấn đề bạn gặp'} colors={colors} />
            <Text style={[typography.caption, { color: colors.muted }]}>
              {channel === 'app' ? 'Chỉ gửi mã lỗi, màn đang mở, thời điểm, phiên bản app và ghi chú của bạn. Không gửi mật khẩu hay mã xác minh.'
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
    style={[styles.option, { backgroundColor: selected ? colors?.warm : colors?.surface, borderColor: selected ? colors?.primary : colors?.line, borderWidth: selected ? 1.5 : 1 }]}>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, ...FOCUSED_STYLE },
  headerText: { flex: 1, gap: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, ...FOCUSED_STYLE },
  card: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md },
  center: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  successCard: { alignItems: 'center', paddingVertical: spacing.xxl },
  successBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  ticketPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  recentBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md },
  toggleLabel: { fontFamily: 'InterSemiBold' },
  ticketHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ticketIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  codeRow: { minHeight: 42, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  codeText: { flex: 1 },
  steps: { gap: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.lg, padding: spacing.md, minHeight: 62 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
});
