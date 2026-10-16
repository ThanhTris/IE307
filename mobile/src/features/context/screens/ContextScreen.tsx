import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ErrorCode, PreviewFoodPoolResponse, RoomContext, RoomSnapshot, UpdateContextRequest } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, Chip, ContextSummary, StatusNotice } from '../../../shared/ui';
import { SetupFrame, SetupSection, setupStyles as styles } from '../components/SetupFrame';
import { ContextDraftFields } from '../components/ContextDraftFields';
import { useRoomSetup, useSetupIntent, type RoomSetupData } from '../hooks/useRoomSetup';
import { currentServerTime, dishDistance, dishPrice, localTime, mealLabels, nextMealTime, originLabels, parseBudget, parseLocalTime, setupError, suggestedMeal, temperatureLabels, type RequestIdFactory, type RoomSetupRepository, type SuggestAnchor } from '../services/roomSetup';

export type ContextScreenProps = {
  repository: RoomSetupRepository; roomId: string; userId: string;
  onBack: () => void; onHome?: () => void; onContinue: (room: RoomSnapshot) => void;
  onSaved?: (room: RoomSnapshot) => void; suggestAnchor?: SuggestAnchor;
  createRequestId?: RequestIdFactory; previewControls?: (busy: boolean) => ReactNode;
};

export function ContextScreen(props: ContextScreenProps) {
  const data = useRoomSetup(props.repository, props.roomId);
  const { colors } = useShellTheme();
  if (data.value) return <ContextForm {...props} loaded={data.value} reload={data.reload} />;
  return <SetupFrame title="Hẹn nhau ăn ở đâu?" onBack={props.onBack} onHome={props.onHome} controls={props.previewControls?.(false)}>
    <StatusNotice title={data.loading ? 'Đang tải bối cảnh…' : 'Chưa tải được bối cảnh'} message={data.error ? setupError(data.error) : undefined} actionLabel={data.error ? 'Tải lại bối cảnh' : undefined} onAction={data.reload} colors={colors} />
  </SetupFrame>;
}

function ContextForm({ repository, roomId, userId, onBack, onHome, onContinue, onSaved, suggestAnchor, createRequestId, previewControls, loaded, reload }: ContextScreenProps & { loaded: RoomSetupData; reload: () => void }) {
  const { colors, dark } = useShellTheme();
  const data = { value: loaded, reload };
  const writer = useSetupIntent<UpdateContextRequest>(createRequestId);
  const [draft, setDraft] = useState<RoomContext>({ ...loaded.room.context });
  const [area, setArea] = useState(loaded.discovery.anchors.find(a => a.id === loaded.room.context.anchorId)?.coverageId ?? '');
  const [date, setDate] = useState(localTime(loaded.room.context.desiredAt).slice(0, 10));
  const [time, setTime] = useState(localTime(loaded.room.context.desiredAt).slice(11));
  const [budget, setBudget] = useState(loaded.room.context.budget == null ? '' : String(loaded.room.context.budget));
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState<PreviewFoodPoolResponse>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [previewErrorCode, setPreviewErrorCode] = useState<ErrorCode>();
  const [saved, setSaved] = useState<RoomSnapshot>();
  const [snapshotError, setSnapshotError] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const room = data.value?.room;
  const discovery = data.value?.discovery;
  const member = room?.members.some(m => m.userId === userId);
  const host = room?.hostUserId === userId;
  const serverNow = () => currentServerTime(loaded.discovery.serverTime, loaded.loadedAt);
  const editable = !!room && room.state === 'LOBBY' && member && Date.parse(room.expiresAt) > Date.parse(loaded.discovery.serverTime);
  const busy = writer.pending || writer.uncertain || previewBusy || suggestBusy;
  const needsReload = [previewErrorCode, writer.error].some(code => code === 'VERSION_CONFLICT' || code === 'CONTEXT_CHANGED');
  const disabled = writer.locked || previewBusy || suggestBusy || !editable || !host || needsReload;
  const anchor = discovery?.anchors.find(a => a.id === draft?.anchorId && a.coverageId === area);
  const resetPreview = () => { setConfirmed(false); setPreview(undefined); setPreviewErrorCode(undefined); setError(undefined); writer.clear(); };
  const change = (patch: Partial<RoomContext>) => { setDraft(v => v ? { ...v, ...patch } : v); resetPreview(); };
  function context(): RoomContext | undefined {
    const desiredAt = parseLocalTime(`${date} ${time}`);
    const amount = parseBudget(budget);
    if (!draft || !anchor) { setError('Hãy chọn điểm ăn công cộng trong vùng hỗ trợ.'); return; }
    if (Date.parse(room.expiresAt) <= serverNow()) { setError(setupError('ROOM_EXPIRED')); return; }
    if (!desiredAt || Date.parse(desiredAt) <= serverNow()) { setError('Ngày ăn và giờ ăn phải hợp lệ, chưa qua; ngày YYYY-MM-DD, giờ HH:mm (UTC+7).'); return; }
    if (amount === undefined) { setError('Ngân sách là số nguyên VNĐ/người từ 0 hoặc để trống.'); return; }
    return { ...draft, anchorId: anchor.id, anchorName: anchor.name, desiredAt, budget: amount,
      timeHint: draft.mealSlot === 'dinner' ? suggestedMeal(desiredAt).timeHint : undefined };
  }
  async function previewPool() {
    const value = context();
    if (!value || !editable) return;
    if (!confirmed) { setError('Hãy xác nhận điểm công cộng, buổi và giờ trước khi xem món.'); return; }
    setPreviewBusy(true); setPreview(undefined); setPreviewErrorCode(undefined); setError(undefined);
    try {
      const result = await repository.previewFoodPool({ anchorId: value.anchorId, radiusM: value.radiusM, desiredAt: value.desiredAt, serviceMode: value.serviceMode, mealSlot: value.mealSlot, timeHint: value.timeHint, budget: value.budget });
      if (!alive.current) return;
      if (result.ok) setPreview(result.data); else { setPreviewErrorCode(result.error.messageKey); setError(setupError(result.error.messageKey)); }
    } catch { if (alive.current) setError('Chưa tải được món mẫu. Hãy thử lại.'); }
    finally { if (alive.current) setPreviewBusy(false); }
  }
  async function readSaved() {
    setSnapshotError(false);
    try {
      const result = await repository.getRoomSnapshot(roomId);
      if (!alive.current) return;
      if (result.ok) { setSaved(result.data); onSaved?.(result.data); }
      else setSnapshotError(true);
    } catch { if (alive.current) setSnapshotError(true); }
  }
  async function save() {
    if (!editable || !host || needsReload) return;
    if (!writer.uncertain && Date.parse(room.expiresAt) <= serverNow()) { setError(setupError('ROOM_EXPIRED')); return; }
    const value = writer.uncertain ? draft : context();
    if (!value || (!writer.uncertain && (!confirmed || !preview?.pool.length))) { setError('Hãy xác nhận bối cảnh và kiểm tra có món trước khi lưu.'); return; }
    const result = await writer.submit({ roomId, expectedVersion: room!.version, context: value }, request => repository.updateContext(request));
    if (result?.ok) await readSaved();
  }
  async function suggest() {
    setSuggestBusy(true);
    try {
      const result = suggestAnchor ? await suggestAnchor() : { status: 'unavailable' as const };
      if (!alive.current) return;
      if (result.status === 'suggested') {
        const next = discovery?.anchors.find(a => a.id === result.anchorId);
        if (next) { setArea(next.coverageId); change({ anchorId: next.id }); setNotice('Điểm công cộng được gợi ý. Bạn cần kiểm tra và xác nhận trước khi lưu.'); }
        else setNotice('Điểm gợi ý chưa nằm trong dữ liệu hỗ trợ. Hãy chọn bằng tay.');
      } else setNotice(result.status === 'outside' ? 'Bạn đang ngoài vùng dữ liệu mẫu. Hãy chọn điểm công cộng bằng tay.' : 'Không có quyền hoặc chưa dùng được vị trí. Bạn vẫn chọn điểm ăn bằng tay.');
    } catch { if (alive.current) setNotice('Chưa lấy được gợi ý vị trí. Hãy chọn điểm ăn bằng tay.'); }
    finally { if (alive.current) setSuggestBusy(false); }
  }
  const draftDesiredAt = parseLocalTime(`${date} ${time}`);
  const draftTime = {
    desiredAt: draftDesiredAt ?? new Date(serverNow()).toISOString(),
    isPast: !draftDesiredAt || Date.parse(draftDesiredAt) <= serverNow(),
    requiresConfirmation: false,
    isTooFarFuture: !!draftDesiredAt && Date.parse(draftDesiredAt) > serverNow() + 7 * 86400000,
  };
  return <SetupFrame title="Hẹn nhau ăn ở đâu?" onBack={onBack} onHome={onHome} busy={busy} controls={previewControls?.(busy)}>
    <Text style={[styles.body, { color: colors.muted }]}>Chọn một điểm ăn công cộng cho cả nhóm. Không chia sẻ GPS cá nhân.</Text>
    {room && !editable ? <StatusNotice title="Chưa thể sửa phòng" message="Phiên không hợp lệ, phòng đã khóa hoặc hết hạn. Hãy quay lại kiểm tra." colors={colors} /> : null}
    {editable && !host ? <StatusNotice title="Bối cảnh do chủ phòng xác nhận" message="Bạn có thể xem bối cảnh và chọn khẩu vị riêng; không thay điểm ăn hoặc giờ của nhóm." colors={colors} /> : null}
    {draft && discovery ? <>
      <SetupSection title="Điểm ăn chung">
        <Text style={[styles.body, { color: colors.text }]}>1. Chọn khu vực</Text>
        <View style={styles.row}>{discovery.coverageAreas.map(v => <Chip key={v.id} label={v.name} selected={area === v.id} disabled={disabled} onPress={() => { setArea(v.id); change({ anchorId: '' }); }} colors={colors} />)}</View>
        <View style={[styles.anchorGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.text }]}>2. Chọn điểm công cộng{area ? ` trong ${discovery.coverageAreas.find(v => v.id === area)?.name ?? 'khu vực đã chọn'}` : ''}</Text>
        {discovery.anchors.filter(v => v.coverageId === area).map(v => <View key={v.id} style={styles.section}>
          <Chip label={v.name} selected={draft.anchorId === v.id} disabled={disabled} onPress={() => change({ anchorId: v.id })} colors={colors} />
          <Text style={[styles.caption, { color: colors.muted }]}>{v.address}</Text>
        </View>)}
        {!discovery.anchors.some(v => v.coverageId === area) ? <StatusNotice title="Chưa có điểm công cộng" message="Vùng này chưa có dữ liệu. Tải lại hoặc chọn vùng được hỗ trợ; không tự lấy vị trí cá nhân thay thế." colors={colors} /> : null}
        </View>
        <AppButton label="Gợi ý điểm ăn từ vị trí" variant="secondary" disabled={disabled} onPress={() => { void suggest(); }} colors={colors} />
        {notice ? <StatusNotice title="Chọn điểm bằng tay luôn khả dụng" message={notice} colors={colors} /> : null}
      </SetupSection>
      <ContextDraftFields
        draft={draft}
        budgetText={budget}
        date={date}
        time={time}
        timeState={draftTime}
        disabled={disabled}
        serverNow={serverNow}
        onRadiusChange={radiusM => change({ radiusM })}
        onDateChange={value => { setDate(value); resetPreview(); }}
        onTimeChange={value => { setTime(value); resetPreview(); }}
        onEatNow={() => { const iso = new Date(serverNow() + 15 * 60000).toISOString(); setDate(localTime(iso).slice(0, 10)); setTime(localTime(iso).slice(11)); change({ desiredAt: iso, ...suggestedMeal(iso) }); }}
        onMealSlotChange={value => { const iso = nextMealTime(value, serverNow()); if (iso) { setDate(localTime(iso).slice(0, 10)); setTime(localTime(iso).slice(11)); } change({ mealSlot: value, timeHint: undefined, ...(iso ? { desiredAt: iso } : {}) }); }}
        onServiceModeChange={serviceMode => change({ serviceMode })}
        onBudgetChange={value => { setBudget(value); resetPreview(); }}
        onAvoidRecentChange={avoidRecent => change({ avoidRecent })}
        onScheduledOffset={hours => { const target = new Date(serverNow() + hours * 3600000).toISOString(); setDate(localTime(target).slice(0, 10)); setTime(localTime(target).slice(11)); change({ desiredAt: target }); }}
      />
      <ContextSummary anchorName={anchor?.name ?? 'Chưa chọn điểm công cộng'} mealLabel={mealLabels[draft.mealSlot]} desiredAtLabel={`${date} ${time} · UTC+7`} radiusLabel={`${draft.radiusM / 1000} km`} colors={colors} />
      {host ? <>
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Tôi xác nhận điểm công cộng, buổi và giờ ăn" accessibilityHint="Xác nhận bối cảnh đã chọn trước khi xem món và lưu" accessibilityState={{ checked: confirmed, disabled }} disabled={disabled} onPress={() => setConfirmed(v => !v)}
          style={({ pressed }) => [styles.confirmation, { backgroundColor: confirmed ? colors.surface : colors.warm, borderColor: confirmed ? colors.green : colors.primary, opacity: disabled || pressed ? 0.65 : 1 }]}>
          <View accessible={false} style={[styles.checkbox, { backgroundColor: confirmed ? colors.green : colors.surface, borderColor: confirmed ? colors.green : colors.border }]}>
            {confirmed ? <Text allowFontScaling={false} style={[styles.checkboxTick, { color: dark ? colors.background : colors.text }]}>✓</Text> : null}
          </View>
          <View style={styles.confirmationLabel}>
            <Text style={[styles.body, { color: colors.text }]}>Tôi xác nhận điểm công cộng, buổi và giờ ăn</Text>
            <Text style={[styles.caption, { color: colors.muted }]}>{confirmed ? 'Đã xác nhận · Có thể xem món' : 'Chạm để xác nhận bối cảnh của nhóm'}</Text>
          </View>
        </Pressable>
        <AppButton label="Xem món mẫu theo bối cảnh" disabled={disabled} loading={previewBusy} onPress={() => { void previewPool(); }} colors={colors} />
      </> : null}
      {preview ? <SetupSection title="Món có trong bối cảnh mẫu">
        <Text style={[styles.body, { color: colors.muted }]}>Danh sách để xem trước, chưa chọn hay bỏ phiếu cho món ở bước này.</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Đánh giá mẫu: {localTime(preview.evaluatedAt)} · UTC+7. Không xác nhận đang bán trực tiếp.</Text>
        {!preview.pool.length ? <StatusNotice title="Chưa có món cho buổi và giờ này" message="Hãy sửa điểm ăn, giờ hoặc buổi rồi xác nhận lại. Không tự nới giờ/bán kính; khi lưu bối cảnh mới cả nhóm cần sẵn sàng lại." colors={colors} /> : null}
        {preview.pool.slice(0, 8).map(dish => <View key={dish.roundDishId} style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>{dish.name}</Text>
          <Text style={[styles.body, { color: colors.text }]}>{dishPrice(dish)}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>Nguồn gốc món: {dish.origin ? originLabels[dish.origin] : 'Chưa rõ nguồn gốc'}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>Nơi bán mẫu: {dish.venueName ?? 'Chưa có quán'} · {dish.venueAddress ?? 'Chưa có địa chỉ'}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>{dishDistance(dish.distanceM)}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>Nhiệt độ món: {dish.temperature ? temperatureLabels[dish.temperature] : 'Chưa rõ nhiệt độ'} · vị cay là thông tin riêng.</Text>
        </View>)}
      </SetupSection> : null}
      {error || writer.error ? <StatusNotice title="Cần kiểm tra lại" message={error ?? setupError(writer.error!)} tone="error" colors={colors} /> : null}
      {!writer.uncertain && needsReload ? <AppButton label="Tải lại bối cảnh" onPress={data.reload} colors={colors} /> : null}
      {host ? <AppButton label={writer.uncertain ? 'Thử lại cùng yêu cầu lưu bối cảnh' : writer.accepted ? 'Đã lưu bối cảnh mẫu' : 'Lưu bối cảnh mẫu'} loading={writer.pending} disabled={writer.accepted || previewBusy || suggestBusy || !editable || needsReload} onPress={() => { void save(); }} colors={colors} /> : null}
      {writer.accepted ? <StatusNotice title="Đã lưu bối cảnh mẫu" message="Cả nhóm cần xác nhận sẵn sàng lại. Chưa tự bật sẵn sàng hoặc bắt đầu phiên." colors={colors} /> : null}
      {snapshotError ? <StatusNotice title="Đã lưu, chưa tải lại được phòng" actionLabel="Tải lại phòng đã lưu" onAction={() => { void readSaved(); }} colors={colors} /> : null}
      {saved ? <Text style={[styles.body, { color: colors.muted }]}>{`Sẵn sàng sau cập nhật: ${saved.members.filter(m => m.ready).length}/${saved.members.length}`}</Text> : null}
      {host && writer.accepted && saved ? <AppButton label="Chỉnh lại bối cảnh" variant="secondary" onPress={data.reload} colors={colors} /> : null}
      <AppButton label="Chọn khẩu vị →" disabled={host ? !saved : !editable} onPress={() => { const next = saved ?? room; if (next) onContinue(next); }} colors={colors} />
    </> : null}
  </SetupFrame>;
}
