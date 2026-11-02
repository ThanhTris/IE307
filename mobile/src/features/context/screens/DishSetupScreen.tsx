import { Text, View, StyleSheet } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, DishCount, StatusNotice } from '../../../shared/ui';
import { DishSetupFrame } from '../components/DishSetupFrame';
import { SetupChoice } from '../components/SetupChoice';
import { SetupCheckboxRow } from '../components/SetupCheckboxRow';
import { SetupInvitees } from '../components/SetupInvitees';
import { SetupTimeMode } from '../components/SetupTimeMode';
import { budgetOptions, formatSchedule, mealOptions, setupValidation, type SetupDraft, type SetupFriend } from '../services/dishSetup';

export function DishSetupScreen({ draft, onChange, onBack, onContinue, onSchedule, onFriends, friends = [], hasRecentHistory, busy = false, readOnly = false, submitDisabled, notice, extra, now = Date.now }: {
  draft: SetupDraft; onChange: (patch: Partial<SetupDraft>) => void; onBack: () => void; onContinue: () => void;
  onSchedule?: () => void; onFriends?: () => void; busy?: boolean; readOnly?: boolean; submitDisabled?: boolean; notice?: string; extra?: React.ReactNode; now?: () => number;
  friends?: SetupFriend[]; hasRecentHistory?: boolean;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const invalid = setupValidation(draft, now());
  const disabled = busy || readOnly;
  const heading = (label: string) => <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>{label}</Text>;
  return <DishSetupFrame title="Tạo phòng" onBack={onBack} busy={busy} footer={<AppButton label="Chọn khẩu vị →" colors={colors} disabled={!!invalid || busy || submitDisabled} loading={busy} onPress={onContinue} />}>
    {notice ? <StatusNotice title={notice} colors={colors} /> : null}
    {readOnly ? <StatusNotice title="Chỉ chủ phòng được sửa thiết lập" message="Bạn vẫn có thể chọn khẩu vị riêng." colors={colors} /> : null}
    {invalid ? <StatusNotice title={invalid} colors={colors} /> : null}
    {heading('Buổi ăn')}<View style={styles.grid}>{mealOptions.map(item => <SetupChoice key={item.id} label={item.label} icon={item.icon} stacked selected={draft.mealSlot === item.id} disabled={disabled} onPress={() => onChange({ mealSlot: item.id })} />)}</View>
    {heading('Thời gian')}<SetupTimeMode scheduled={draft.timeMode === 'scheduled'} disabled={disabled} onNow={() => onChange({ timeMode: 'now' })} onSchedule={onSchedule} />
    {draft.timeMode === 'scheduled' && draft.desiredAt && Number.isFinite(Date.parse(draft.desiredAt)) ? <AppButton label={`${formatSchedule(draft.desiredAt)} · Sửa`} variant="secondary" onPress={onSchedule} disabled={disabled} colors={colors} /> : null}
    {heading('Số món để lựa chọn · 10–20')}<DishCount value={draft.dishCount} onChange={dishCount => onChange({ dishCount })} disabled={disabled} colors={colors} layout="inline" />
    {heading('Ngân sách mỗi người')}<Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Không bắt buộc · ưu tiên mềm</Text>
    <View style={styles.grid}>{budgetOptions.map(item => <SetupChoice key={item.id ?? 'none'} label={item.label} icon={item.icon} selected={draft.budget === item.id} disabled={disabled} onPress={() => onChange({ budget: item.id })} />)}</View>
    <SetupCheckboxRow label="Ưu tiên món khác 3 bữa gần đây" checked={draft.avoidRecent} disabled={disabled} helper={hasRecentHistory === false ? 'Chưa có lịch sử để tránh lặp.' : hasRecentHistory === undefined ? 'Chưa có dữ liệu lịch sử được cấp quyền.' : undefined} onPress={() => onChange({ avoidRecent: !draft.avoidRecent })} />
    {heading('Rủ bạn ăn cùng')}<SetupInvitees ids={draft.inviteeIds} friends={friends} onEdit={onFriends} disabled={disabled} />{extra}
  </DishSetupFrame>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontSize: 17, lineHeight: 24 }, note: { fontSize: 13, lineHeight: 20 } });
