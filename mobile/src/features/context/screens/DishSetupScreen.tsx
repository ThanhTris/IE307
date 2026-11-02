import { Text, View, StyleSheet } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, DishCount, StatusNotice } from '../../../shared/ui';
import { DishSetupFrame } from '../components/DishSetupFrame';
import { SetupChoice } from '../components/SetupChoice';
import { budgetOptions, mealOptions, setupValidation, type SetupDraft } from '../services/dishSetup';

export function DishSetupScreen({ draft, onChange, onBack, onContinue, onSchedule, onFriends, busy = false, notice, extra, now = Date.now }: {
  draft: SetupDraft; onChange: (patch: Partial<SetupDraft>) => void; onBack: () => void; onContinue: () => void;
  onSchedule?: () => void; onFriends?: () => void; busy?: boolean; notice?: string; extra?: React.ReactNode; now?: () => number;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const invalid = setupValidation(draft, now());
  const heading = (label: string) => <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>{label}</Text>;
  return <DishSetupFrame title="Tạo phòng" onBack={onBack} busy={busy} footer={<AppButton label="Chọn khẩu vị →" colors={colors} disabled={!!invalid || busy} loading={busy} onPress={onContinue} />}>
    {notice ? <StatusNotice title={notice} colors={colors} /> : null}
    {invalid ? <StatusNotice title={invalid} colors={colors} /> : null}
    {heading('Buổi ăn')}<View style={styles.grid}>{mealOptions.map(item => <SetupChoice key={item.id} label={item.label} icon={item.icon} stacked selected={draft.mealSlot === item.id} disabled={busy} onPress={() => onChange({ mealSlot: item.id })} />)}</View>
    {heading('Thời gian')}<View style={styles.grid}>
      <SetupChoice label="Ăn ngay" icon={require('../../../../assets/brand/icons/lightning.png')} selected={draft.timeMode === 'now'} disabled={busy} onPress={() => onChange({ timeMode: 'now' })} />
      <SetupChoice label="Hẹn giờ" icon={require('../../../../assets/brand/entry-ui/hourglass.png')} selected={draft.timeMode === 'scheduled'} disabled={busy || !onSchedule} onPress={() => onSchedule?.()} />
    </View>
    {draft.timeMode === 'scheduled' && draft.desiredAt ? <AppButton label={`Giờ hẹn: ${new Date(draft.desiredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · Sửa`} variant="secondary" onPress={onSchedule} disabled={busy} colors={colors} /> : null}
    {heading('Số món để lựa chọn · 10–20')}<DishCount value={draft.dishCount} onChange={dishCount => onChange({ dishCount })} disabled={busy} colors={colors} />
    {heading('Ngân sách mỗi người')}<Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Không bắt buộc · ưu tiên mềm</Text>
    <View style={styles.grid}>{budgetOptions.map(item => <SetupChoice key={item.id ?? 'none'} label={item.label} icon={item.icon} selected={draft.budget === item.id} disabled={busy} onPress={() => onChange({ budget: item.id })} />)}</View>
    <SetupChoice label="Ưu tiên món khác 3 bữa gần đây" checkbox selected={draft.avoidRecent} disabled={busy} onPress={() => onChange({ avoidRecent: !draft.avoidRecent })} />
    <Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Chưa có lịch sử được cấp quyền thì ưu tiên này chưa có dữ liệu để áp dụng.</Text>
    {heading('Rủ bạn ăn cùng')}<AppButton label={draft.inviteeIds.length ? `Đã chọn ${draft.inviteeIds.length} người bạn · Sửa` : '+ Thêm bạn'} variant="secondary" onPress={onFriends} disabled={busy || !onFriends} colors={colors} />
    <Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Chỉ gửi lời mời sau khi tạo phòng thành công.</Text>{extra}
  </DishSetupFrame>;
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontSize: 17, lineHeight: 24 }, note: { fontSize: 13, lineHeight: 20 } });
