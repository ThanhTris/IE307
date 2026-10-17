import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton, Chip, ContextSummary, FormField, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { CreateRoomResponse, MealSlot, RoomContext } from '../../../data/api/contracts';
import { EntryError, EntrySection, entryStyles, RoomEntryFrame, type PreviewControlsProps } from '../components/RoomEntryFrame';
import { useRead, useRoomSubmission } from '../hooks/useRoomEntry';
import { localTimeInput, mealLabels, parseLocalTime, suggestMeal, validDisplayName, type RequestIdFactory, type RoomEntryReceipt, type RoomEntryRepository } from '../services/roomEntry';

export type Gm25CreateRoomScreenProps = PreviewControlsProps & { repository: RoomEntryRepository; onBack: () => void; onEntered: (room: RoomEntryReceipt) => void; createRequestId?: RequestIdFactory; initialDisplayName?: string; isLive?: boolean };

export function Gm25CreateRoomScreen({ repository, onBack, onEntered, previewControls, createRequestId, initialDisplayName = '', isLive = false }: Gm25CreateRoomScreenProps) {
  const { colors } = useShellTheme();
  const load = useCallback(() => repository.getDiscoveryContext(), [repository]);
  const discovery = useRead(load);
  const [name, setName] = useState(initialDisplayName);
  const [anchorId, setAnchorId] = useState('');
  const [radiusM, setRadiusM] = useState(2000);
  const [mealSlot, setMealSlot] = useState<MealSlot>();
  const [timeMode, setTimeMode] = useState<'now' | 'custom'>('now');
  const [customTime, setCustomTime] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState<string>();
  const [gpsDenied, setGpsDenied] = useState(false);
  const [frozenContext, setFrozenContext] = useState<RoomContext>();
  const submitted = useRoomSubmission<CreateRoomResponse>(data => onEntered({ roomId: data.roomId, code: data.code, version: data.version, role: 'host' }), createRequestId);
  const disabled = submitted.busy || submitted.uncertain || submitted.accepted;
  const anchor = discovery.data?.anchors.find(item => item.id === anchorId);
  const suggestedAt = discovery.data ? new Date(Date.parse(discovery.data.serverTime) + 15 * 60 * 1000).toISOString() : undefined;
  const selectedTime = timeMode === 'custom' ? parseLocalTime(customTime) : suggestedAt;
  const mealClock = selectedTime ?? discovery.data?.serverTime;
  const suggestion = mealClock ? suggestMeal(mealClock) : undefined;
  const selectedMeal = mealSlot ?? suggestion?.mealSlot;
  const changeContext = () => { setConfirmed(false); setValidation(undefined); setFrozenContext(undefined); submitted.clearError(); };
  const create = useCallback(() => {
    if (!validDisplayName(name)) { setValidation('Tên của bạn cần từ 1 đến 24 ký tự.'); return; }
    if (!anchor || !discovery.data) { setValidation('Hãy chọn điểm ăn công cộng trong danh sách.'); return; }
    if (!selectedMeal) { setValidation('Hãy chọn buổi ăn.'); return; }
    if (!confirmed) { setValidation('Hãy xác nhận điểm ăn, buổi và giờ trước khi tạo.'); return; }
    const budget = budgetInput.trim() === '' ? null : Number(budgetInput);
    if (budget !== null && (!/^\d+$/.test(budgetInput.trim()) || !Number.isSafeInteger(budget) || budget <= 0)) { setValidation('Ngân sách là số nguyên VNĐ/người lớn hơn 0, hoặc để trống.'); return; }
    // Server time + buffer is sampled once; retry reuses the exact context.
    const serverNow = Date.parse(discovery.data.serverTime) + Math.max(0, Date.now() - (discovery.receivedAt ?? Date.now()));
    const desiredAt = frozenContext?.desiredAt ?? selectedTime;
    if (!desiredAt) { setValidation('Giờ hẹn cần dạng YYYY-MM-DD HH:mm, múi giờ Việt Nam (UTC+7).'); return; }
    if (!submitted.uncertain && Date.parse(desiredAt) <= serverNow) { setValidation(isLive ? 'Giờ ăn đã qua. Hãy tải lại thời gian máy chủ hoặc chọn giờ mới.' : 'Giờ ăn đã qua. Hãy tải lại thời gian mẫu hoặc chọn giờ mới.'); return; }
    const context: RoomContext = frozenContext ?? { anchorId, radiusM, mealSlot: selectedMeal, desiredAt, serviceMode: 'dine_in', budget, avoidRecent: false, ...(selectedMeal === 'dinner' && suggestion?.timeHint ? { timeHint: suggestion.timeHint } : {}) };
    setFrozenContext(context);
    setValidation(undefined);
    const request = { displayName: name.trim(), context };
    void submitted.run(JSON.stringify(request), requestId => repository.createRoom({ ...request, requestId }));
  }, [name, anchor, discovery, confirmed, budgetInput, frozenContext, selectedTime, selectedMeal, suggestion, anchorId, radiusM, submitted, repository, isLive]);
  return <RoomEntryFrame title="Hẹn nhau bữa nào?" subtitle="Chọn một điểm hẹn, cả nhóm cùng chọn món." onBack={onBack} busy={submitted.busy} previewControls={isLive ? undefined : busy => <>
    {previewControls?.(busy)}
    <AppButton label="Thử gợi ý vị trí (mô phỏng từ chối)" variant="quiet" disabled={disabled || busy} onPress={() => setGpsDenied(true)} colors={colors} />
    <AppButton label="Cập nhật giờ và điểm ăn mẫu" variant="quiet" disabled={disabled || busy} onPress={() => { changeContext(); discovery.retry(); }} colors={colors} />
  </>}>
    <FormField label="Tên của bạn (chủ phòng)" value={name} onChangeText={value => { setName(value); setValidation(undefined); }} editable={!disabled} placeholder="Mọi người gọi bạn là…" helperText="Tên hiển thị trong phòng · 1–24 ký tự" colors={colors} />
    {discovery.loading ? <StatusNotice title={isLive ? 'Đang tải điểm ăn…' : 'Đang tải điểm ăn mẫu…'} colors={colors} /> : null}
    {discovery.error ? <EntryError code={discovery.error} onRetry={discovery.retry} /> : null}
    {discovery.data?.anchors.length === 0 ? <StatusNotice title="Chưa có điểm ăn trong vùng" message={isLive ? 'Server hiện không trả điểm ăn công cộng phù hợp. Hãy thử tải lại hoặc dùng vị trí gợi ý khi có hỗ trợ.' : 'Hãy đổi fixture hoặc tải lại. Không tự dùng GPS của chủ phòng.'} actionLabel="Tải lại điểm ăn" onAction={discovery.retry} colors={colors} /> : null}
    <EntrySection title="Buổi và giờ ăn">
      <View style={entryStyles.row}>{(Object.keys(mealLabels) as MealSlot[]).map(value => <Chip key={value} label={mealLabels[value]} selected={selectedMeal === value} disabled={disabled} onPress={() => { setMealSlot(value); changeContext(); }} colors={colors} />)}</View>
      <View style={entryStyles.row}>
        <Chip label="Ăn ngay" leadingIcon="⚡" selected={timeMode === 'now'} disabled={disabled} onPress={() => { setTimeMode('now'); changeContext(); }} colors={colors} />
        <Chip label="Hẹn giờ" leadingIcon="◷" selected={timeMode === 'custom'} disabled={disabled} onPress={() => { setTimeMode('custom'); changeContext(); }} colors={colors} />
      </View>
      {timeMode === 'custom' ? <FormField label="Giờ hẹn (UTC+7)" value={customTime} onChangeText={value => { setCustomTime(value); changeContext(); }} editable={!disabled} placeholder={discovery.data ? localTimeInput(new Date(Date.parse(discovery.data.serverTime) + 3600000).toISOString()) : 'YYYY-MM-DD HH:mm'} helperText="YYYY-MM-DD HH:mm · giờ Việt Nam" autoCorrect={false} colors={colors} /> : <Text style={[entryStyles.body, { color: colors.muted }]}>{suggestedAt ? `Dự kiến ${localTimeInput(suggestedAt)} · giờ Việt Nam` : 'Đang lấy giờ ăn dự kiến…'}</Text>}
      {suggestion?.timeHint && selectedMeal === 'dinner' ? <Text style={[entryStyles.caption, { color: colors.muted }]}>Ăn khuya · cần kiểm tra giờ phục vụ khi có dữ liệu thật.</Text> : null}
    </EntrySection>
    <EntrySection title="Điểm ăn chung" description="Chọn điểm công cộng bằng tay. Vị trí cá nhân của bạn không được chia sẻ.">
      <View style={entryStyles.row}>{discovery.data?.anchors.map(item => <Chip key={item.id} label={item.name} selected={item.id === anchorId} disabled={disabled} onPress={() => { setAnchorId(item.id); changeContext(); }} colors={colors} />)}</View>
      {anchor ? <Text style={[entryStyles.body, { color: colors.muted }]}>{anchor.address}{isLive ? '' : ' · dữ liệu mẫu'}</Text> : null}
      {gpsDenied ? <StatusNotice title="Chưa có quyền vị trí · mô phỏng" message="Bạn vẫn có thể chọn điểm công cộng bằng tay." colors={colors} /> : null}
      <Text style={[entryStyles.body, { color: colors.text }]}>Tìm nơi ăn trong bán kính</Text>
      <View style={entryStyles.row}>{[1000, 2000, 5000].map(value => <Chip key={value} label={`${value / 1000} km`} selected={radiusM === value} disabled={disabled} onPress={() => { setRadiusM(value); changeContext(); }} colors={colors} />)}</View>
    </EntrySection>
    <EntrySection title="Ngân sách" description="Tùy chọn · để cả nhóm dễ tìm món phù hợp.">
      <FormField label="Ngân sách tham khảo (VNĐ/người)" value={budgetInput} onChangeText={value => { setBudgetInput(value); changeContext(); }} editable={!disabled} keyboardType="number-pad" placeholder="Ví dụ: 80000" helperText="Có thể để trống nếu chưa quyết định." colors={colors} />
    </EntrySection>
    <View style={entryStyles.section}>
      {anchor && selectedTime && selectedMeal ? <ContextSummary anchorName={anchor.name} mealLabel={mealLabels[selectedMeal]} desiredAtLabel={`${localTimeInput(selectedTime)} (UTC+7)`} radiusLabel={`${radiusM / 1000} km`} serviceModeLabel="Ăn tại quán" colors={colors} /> : null}
      <Chip label="Tôi xác nhận điểm ăn, buổi và giờ" selected={confirmed} disabled={disabled || !anchor} onPress={() => { setConfirmed(value => !value); setValidation(undefined); }} colors={colors} />
      {validation ? <Text accessibilityRole="alert" style={[entryStyles.body, { color: colors.danger }]}>{validation}</Text> : null}
      {submitted.error ? <EntryError code={submitted.error} /> : null}
      <AppButton label={submitted.accepted ? (isLive ? 'Đã tạo phòng' : 'Đã tạo phòng mô phỏng') : submitted.uncertain ? 'Thử lại cùng yêu cầu tạo phòng' : (isLive ? 'Tạo phòng' : 'Tạo phòng mô phỏng')} loading={submitted.busy} disabled={submitted.accepted || discovery.loading || !!discovery.error || !discovery.data?.anchors.length} onPress={create} accessibilityHint={isLive ? 'Tạo phòng thật sau khi bạn xác nhận điểm hẹn, buổi và giờ ăn.' : 'Tạo phòng mô phỏng sau khi bạn xác nhận điểm hẹn, buổi và giờ ăn.'} colors={colors} />
      <Text style={[entryStyles.caption, { color: colors.muted }]}>Tạo phòng xong, bạn có thể tiếp tục chọn khẩu vị.</Text>
    </View>
  </RoomEntryFrame>;
}
