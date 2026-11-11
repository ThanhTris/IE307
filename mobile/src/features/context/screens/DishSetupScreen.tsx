import { Text, View, StyleSheet } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, DishCount, StatusNotice } from '../../../shared/ui';
import { DishSetupFrame } from '../components/DishSetupFrame';
import { SetupChoice } from '../components/SetupChoice';
import { SetupCheckboxRow } from '../components/SetupCheckboxRow';
import { SetupInvitees } from '../components/SetupInvitees';
import { SetupTimeMode } from '../components/SetupTimeMode';
import { SetupScheduleSummary } from '../components/SetupScheduleSummary';
import { budgetOptions, changeSetupMeal, mealOptions, setupValidation, switchToNow, type SetupDraft, type SetupFriend } from '../services/dishSetup';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

export function DishSetupScreen({ draft, onChange, onBack, onContinue, onSchedule, onFriends, friends = [], hasRecentHistory, busy = false, readOnly = false, submitDisabled, notice, extra, now = Date.now }: {
  draft: SetupDraft; onChange: (patch: Partial<SetupDraft>) => void; onBack: () => void; onContinue: () => void;
  onSchedule?: () => void; onFriends?: () => void; busy?: boolean; readOnly?: boolean; submitDisabled?: boolean; notice?: string; extra?: React.ReactNode; now?: () => number;
  friends?: SetupFriend[]; hasRecentHistory?: boolean;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const invalid = setupValidation(draft, now());
  const disabled = busy || readOnly;
  const heading = (label: string, required = false) => <Text accessibilityRole="header" accessibilityLabel={label} style={[styles.heading, { color: colors.text }, textStyle(700)]}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text>;
  return <DishSetupFrame title="Tạo phòng" onBack={onBack} busy={busy} footer={<AppButton label="Chọn khẩu vị →" colors={colors} disabled={!!invalid || busy || submitDisabled} loading={busy} onPress={onContinue} />}>
    {notice ? <ToastNotice title={notice} /> : null}
    {readOnly ? <StatusNotice title="Chỉ chủ phòng được sửa thiết lập" message="Bạn vẫn có thể chọn khẩu vị riêng." colors={colors} /> : null}
    {invalid ? <StatusNotice title={invalid} colors={colors} /> : null}
    {heading('Buổi ăn', true)}<View style={styles.grid}>{mealOptions.map(item => <SetupChoice key={item.id} label={item.label} icon={item.icon} stacked selected={draft.mealSlot === item.id} disabled={disabled} onPress={() => onChange(changeSetupMeal(draft, item.id, now()))} />)}</View>
    {heading('Thời gian', true)}<SetupTimeMode scheduled={draft.timeMode === 'scheduled'} disabled={disabled} onNow={() => onChange(switchToNow(draft, now()))} onSchedule={onSchedule} />
    {draft.timeMode === 'scheduled' && draft.desiredAt && Number.isFinite(Date.parse(draft.desiredAt)) ? <SetupScheduleSummary value={draft.desiredAt} onEdit={onSchedule} disabled={disabled} /> : null}
    {heading('Số món để lựa chọn · 10–20', true)}<DishCount value={draft.dishCount} onChange={dishCount => onChange({ dishCount })} disabled={disabled} colors={colors} layout="inline" />
    {heading('Ngân sách mỗi người')}
    <View style={styles.grid}>{budgetOptions.map(item => <SetupChoice key={item.id ?? 'none'} label={item.label} icon={item.icon} selected={draft.budget === item.id} disabled={disabled} onPress={() => onChange({ budget: item.id })} />)}</View>
    <SetupCheckboxRow label="Ưu tiên món khác 3 bữa gần đây" checked={hasRecentHistory === true && draft.avoidRecent} disabled={disabled || hasRecentHistory !== true} helper={hasRecentHistory === true ? 'Đã có lịch sử gần đây để tránh lặp.' : hasRecentHistory === false ? 'Chưa có lịch sử để tránh lặp.' : 'Chưa có dữ liệu lịch sử được cấp quyền.'} onPress={() => onChange({ avoidRecent: !draft.avoidRecent })} />
    {heading('Rủ bạn ăn cùng')}<SetupInvitees ids={draft.inviteeIds} friends={friends} onEdit={onFriends} disabled={disabled} />{extra}
  </DishSetupFrame>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontSize: 17, lineHeight: 24 } });
