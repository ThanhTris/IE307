import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { useAppPreferences, type AppearanceChoice, type TextSizeChoice } from '../../../shared/lib/AppPreferences';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { AppButton, SheetDialog } from '../../../shared/ui';
import { PreferenceChoice } from '../../../shared/ui/forms/PreferenceChoice';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import type { PersonalHistorySettings } from '../services/profileHistorySettings';
import { useAccountAction } from '../hooks/useAccountAction';
import { accountErrorMessage } from '../services/accountMessages';

const appearances: Record<AppearanceChoice, string> = { system: 'Theo hệ thống', light: 'Sáng', dark: 'Tối' };
const textSizes: Record<TextSizeChoice, string> = { small: 'Nhỏ', medium: 'Vừa', large: 'Lớn' };
const appearanceOptions = Object.entries(appearances).map(([id, label]) => ({ id, label }));
const textSizeOptions = Object.entries(textSizes).map(([id, label]) => ({ id, label }));
type Panel = 'appearance' | 'textSize' | 'delete';

export function ProfileSettings({ history }: { history?: PersonalHistorySettings }) {
  const { colors } = useShellTheme();
  const preferences = useAppPreferences();
  const { width, fontScale } = useWindowDimensions();
  const stackSettingValues = width <= 360 || fontScale >= 1.5;
  const [panel, setPanel] = useState<Panel>();
  const [consent, setConsent] = useState<boolean>();
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [historyDeleted, setHistoryDeleted] = useState(false);
  const { pending, error, clearError, run } = useAccountAction();
  const busy = Boolean(pending);

  useEffect(() => {
    if (!history) return;
    let active = true;
    void history.readConsent().then(result => {
      if (!active) return;
      if (result.ok) setConsent(result.data.personal);
      else setLoadError(true);
    }, () => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [history, reload]);

  async function updatePreferences(patch: Parameters<typeof preferences.update>[0]) {
    setSaveError(false);
    if (!await preferences.update(patch)) setSaveError(true);
  }

  function closePanel() {
    if (busy) return;
    clearError();
    setPanel(undefined);
  }

  function switchRow(label: string, value: boolean, disabled: boolean, onValueChange: (next: boolean) => void, hint?: string) {
    return <View style={[styles.row, styles.divider, { borderColor: colors.line }]}>
      <View style={styles.label}>
        <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        {hint ? <Text style={[typography.caption, { color: colors.muted }]}>{hint}</Text> : null}
      </View>
      <Switch accessibilityLabel={label} accessibilityHint={hint} value={value} disabled={disabled} onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.primary }} />
    </View>;
  }

  function settingRow(label: string, value: string | undefined, next: Panel) {
    const hasDivider = next === 'appearance' || (next === 'textSize' && Boolean(history));
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={value}
      disabled={busy || (next !== 'delete' && !preferences.ready)} onPress={() => {
        clearError();
        setHistoryDeleted(false);
        setPanel(next);
      }} style={({ pressed }) => [
        styles.row, hasDivider && styles.divider, { borderColor: colors.line, opacity: pressed ? 0.7 : 1 },
      ]}>
      {value && stackSettingValues ? (
        <View style={styles.label}>
          <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
          <Text style={[typography.caption, { color: colors.muted }]}>{value}</Text>
        </View>
      ) : (
        <>
          <Text style={[typography.body, styles.label, { color: colors.text }]}>{label}</Text>
          {value ? <Text style={[typography.caption, { color: colors.muted }]}>{value}</Text> : null}
        </>
      )}
      <Text accessible={false} style={[typography.titleMedium, { color: colors.muted }]}>›</Text>
    </Pressable>;
  }

  return <>
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[typography.titleMedium, { color: colors.text }]}>Cài đặt</Text>
      <View style={[styles.rows, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {history ? <>
          {switchRow('Thông báo', preferences.notifications, !preferences.ready, next => { void updatePreferences({ notifications: next }); },
            'Hiện thông báo trong ứng dụng.')}
          {switchRow('Lưu lịch sử bữa ăn', consent ?? false, consent === undefined || busy, next => {
            void run('Đang lưu…', () => history.updateConsent({ scope: 'personal', consent: next }), () => setConsent(next));
          }, consent ? 'Tắt mục này sẽ xóa lịch sử bữa ăn cá nhân.' : undefined)}
        </> : null}
        {settingRow('Giao diện', appearances[preferences.appearance], 'appearance')}
        {settingRow('Cỡ chữ', textSizes[preferences.textSize], 'textSize')}
        {history ? settingRow('Xóa lịch sử', undefined, 'delete') : null}
      </View>
      {loadError ? <AppButton label="Tải lại cài đặt lịch sử" variant="quiet" colors={colors}
        onPress={() => { setLoadError(false); setReload(value => value + 1); }} /> : null}
      {saveError ? <ToastNotice title="Chưa lưu được cài đặt trên thiết bị" tone="error" /> : null}
      {historyDeleted ? <ToastNotice title="Đã xóa lịch sử cá nhân" tone="success" /> : null}
      {!panel && error ? <ToastNotice title="Chưa lưu được cài đặt lịch sử" message={accountErrorMessage(error)} tone="error" /> : null}
    </View>
    <SheetDialog visible={panel === 'appearance' || panel === 'textSize'}
      title={panel === 'appearance' ? 'Giao diện' : 'Cỡ chữ'} showClose={false} onClose={closePanel} colors={colors}>
      {panel === 'appearance' ? <PreferenceChoice layout="stack" options={appearanceOptions} selectedId={preferences.appearance}
        onSelect={id => { setPanel(undefined); void updatePreferences({ appearance: id as AppearanceChoice }); }} colors={colors} />
        : <PreferenceChoice layout="stack" options={textSizeOptions} selectedId={preferences.textSize}
          onSelect={id => { setPanel(undefined); void updatePreferences({ textSize: id as TextSizeChoice }); }} colors={colors} />}
    </SheetDialog>
    {history ? <SheetDialog visible={panel === 'delete'} title="Xóa lịch sử?" presentation="dialog" showClose={false} onClose={closePanel} colors={colors}>
      <Text style={[typography.body, { color: colors.muted }]}>Bạn có chắc muốn xóa các bữa đã lưu trong lịch sử cá nhân?</Text>
      {error ? <ToastNotice title="Chưa xóa hết lịch sử" message={accountErrorMessage(error)} tone="error" /> : null}
      <View style={styles.actions}>
        <AppButton label="Hủy" variant="secondary" onPress={closePanel} disabled={busy} colors={colors} style={styles.action} />
        <AppButton label={pending ?? 'Xóa'} variant="danger" loading={busy} colors={colors} style={styles.action}
          onPress={() => { void run('Đang xóa…', () => history.deletePersonal(), () => {
            setPanel(undefined);
            setHistoryDeleted(true);
          }); }} />
      </View>
    </SheetDialog> : null}
  </>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  rows: { borderRadius: radii.lg, borderWidth: 1, paddingHorizontal: spacing.lg },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action: { flex: 1, minWidth: 96 },
});
