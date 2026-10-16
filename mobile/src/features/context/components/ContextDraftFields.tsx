import type React from 'react';
import { Text, View } from 'react-native';
import type { MealSlot, RoomContext, ServiceMode } from '../../../data/api/contracts';
import { AppButton, Chip, FormField } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { SetupSection, SetupToggle, setupStyles as styles } from './SetupFrame';
import { MealDateTimeFields } from './MealDateTimeFields';
import { mealLabels } from '../services/roomSetup';

export type ContextDraftTime = Pick<RoomContext, 'desiredAt'> & {
  isPast: boolean;
  requiresConfirmation: boolean;
  isTooFarFuture: boolean;
};

export type ContextDraftFieldsProps = {
  draft: Pick<RoomContext, 'radiusM' | 'mealSlot' | 'serviceMode' | 'budget' | 'avoidRecent'>;
  budgetText?: string;
  date: string;
  time: string;
  timeState: ContextDraftTime;
  timeMode?: 'now' | 'scheduled';
  disabled?: boolean;
  serverNow: () => number;
  eatNowLabel?: string;
  onRadiusChange: (radiusM: number) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onEatNow: () => void;
  onTimeModeChange?: (mode: 'now' | 'scheduled') => void;
  onMealSlotChange: (mealSlot: MealSlot) => void;
  onServiceModeChange: (serviceMode: ServiceMode) => void;
  onBudgetChange: (budget: string) => void;
  onAvoidRecentChange: (avoidRecent: boolean) => void;
  onScheduledOffset?: (hours: number) => void;
  onAdjustToValid?: () => void;
  onConfirmPast?: () => void;
};

const radiusOptions = [500, 1000, 1500, 2000, 3000, 5000];
const serviceModes: { label: string; value: ServiceMode }[] = [
  { label: 'Ăn tại quán', value: 'dine_in' },
  { label: 'Mang về', value: 'takeaway' },
  { label: 'Giao hàng', value: 'delivery' },
];

export function ContextDraftFields({
  draft,
  budgetText,
  date,
  time,
  timeState,
  timeMode = 'scheduled',
  disabled = false,
  serverNow,
  eatNowLabel = 'Ăn ngay · sau 15 phút',
  onRadiusChange,
  onDateChange,
  onTimeChange,
  onEatNow,
  onTimeModeChange,
  onMealSlotChange,
  onServiceModeChange,
  onBudgetChange,
  onAvoidRecentChange,
  onScheduledOffset,
  onAdjustToValid,
  onConfirmPast,
}: ContextDraftFieldsProps) {
  const { colors } = useShellTheme();
  return <>
    <SetupSection title="📏 Bán kính tìm quán">
      <ViewRow>
        {radiusOptions.map(value => <Chip key={value} label={value < 1000 ? `${value} m` : `${value / 1000} km`} selected={draft.radiusM === value} disabled={disabled} onPress={() => onRadiusChange(value)} colors={colors} />)}
      </ViewRow>
    </SetupSection>
    <SetupSection title="⏰ Thời gian ăn">
      {onTimeModeChange ? <ViewRow>
        <AppButton label="⚡ Ăn ngay (Buffer 15p)" variant={timeMode === 'now' ? 'primary' : 'secondary'} disabled={disabled} colors={colors} onPress={() => onTimeModeChange('now')} />
        <AppButton label="🕒 Đặt giờ trước" variant={timeMode === 'scheduled' ? 'primary' : 'secondary'} disabled={disabled} colors={colors} onPress={() => onTimeModeChange('scheduled')} />
      </ViewRow> : <AppButton label={eatNowLabel} variant="secondary" disabled={disabled} colors={colors} onPress={onEatNow} />}
      <MealDateTimeFields date={date} time={time} disabled={disabled} getToday={() => new Date(serverNow() + 7 * 3600000).toISOString().slice(0, 10)} onDateChange={onDateChange} onTimeChange={onTimeChange} />
      {timeMode === 'now' ? <Text style={[styles.caption, { color: colors.green }]}>✓ Đã cộng 15 phút chuẩn bị một lần duy nhất từ giờ máy chủ.</Text> : null}
      <ViewRow>{(Object.keys(mealLabels) as MealSlot[]).map(value => <Chip key={value} label={mealLabels[value]} selected={draft.mealSlot === value} disabled={disabled} onPress={() => onMealSlotChange(value)} colors={colors} />)}</ViewRow>
      {onScheduledOffset && timeMode === 'scheduled' ? <ViewRow>
        {[1, 3, 6, -1].map(hours => <Chip key={hours} label={hours < 0 ? 'Quá khứ (-1 giờ)' : `+${hours} giờ`} disabled={disabled} onPress={() => onScheduledOffset(hours)} colors={colors} />)}
      </ViewRow> : null}
      {timeState.isPast ? <SetupSection title="Giờ cần điều chỉnh">
        <Text style={{ color: colors.danger, fontWeight: '700' }}>⚠️ Giờ đã chọn nằm trong quá khứ so với giờ máy chủ!</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Máy chủ từ chối tạo phòng nếu giờ ăn đã qua (DESIRED_TIME_PASSED). Vui lòng điều chỉnh về giờ hợp lệ.</Text>
        {onAdjustToValid ? <AppButton label="Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)" onPress={onAdjustToValid} colors={colors} /> : null}
        {timeState.requiresConfirmation && onConfirmPast ? <AppButton label="Xác nhận giờ này" variant="danger" onPress={onConfirmPast} colors={colors} /> : null}
      </SetupSection> : null}
    </SetupSection>
    <SetupSection title="Ngân sách tham khảo">
      <FormField label="Ngân sách tham khảo (VNĐ/người)" value={budgetText ?? (draft.budget == null ? '' : String(draft.budget))} editable={!disabled} keyboardType="numeric" onChangeText={onBudgetChange} helperText="Để trống nếu chưa chọn. Thiếu giá không có nghĩa là rẻ; ngân sách là ưu tiên mềm." colors={colors} />
    </SetupSection>
    <SetupSection title="Lịch sử và chống lặp">
      <SetupToggle label="Giảm ưu tiên món đã ăn gần đây" accessibilityLabel="Tránh lặp món gần đây" disabled={disabled} value={draft.avoidRecent} onValueChange={onAvoidRecentChange} />
    </SetupSection>
    <SetupSection title="🍽️ Buổi ăn & Hình thức">
      <ViewRow>{serviceModes.map(value => <Chip key={value.value} label={value.label} selected={draft.serviceMode === value.value} disabled={disabled} onPress={() => onServiceModeChange(value.value)} colors={colors} />)}</ViewRow>
    </SetupSection>
  </>;
}

function ViewRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}
