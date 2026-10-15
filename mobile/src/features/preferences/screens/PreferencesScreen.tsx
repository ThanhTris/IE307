import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { FlavorItem, FlavorProfile, RoomSnapshot, UpdatePreferencesRequest, UserPreferences } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, Chip, ContextSummary, StatusNotice } from '../../../shared/ui';
import { SetupFrame, SetupSection, SetupToggle, setupStyles as styles } from '../../context/components/SetupFrame';
import { useRoomSetup, useSetupIntent, type RoomSetupData } from '../../context/hooks/useRoomSetup';
import { currentServerTime, localTime, mealLabels, setupError, temperatureLabels, type PreferenceCatalogue, type RequestIdFactory, type RoomSetupRepository } from '../../context/services/roomSetup';

export type PreferencesScreenProps = {
  repository: RoomSetupRepository; roomId: string; userId: string; catalogue: PreferenceCatalogue;
  onBack: () => void; onHome?: () => void; onSaved?: (room: RoomSnapshot) => void; onContinue?: (room: RoomSnapshot) => void;
  createRequestId?: RequestIdFactory; previewControls?: (busy: boolean) => ReactNode;
};
const unknownFlavor = (): FlavorItem => ({ present: null, intensity: 'unknown' });
const emptySoft = (consent: boolean): UserPreferences => ({ cuisineIds: [], categoryIds: [], historyConsent: consent });
const isWhatever = (value: UserPreferences) => value.cuisineIds.length === 0 && value.categoryIds.length === 0 && (!value.temperature || value.temperature === 'unknown') && (!value.flavor || Object.values(value.flavor).every(v => v.intensity === 'unknown'));
const flavorLabels: Record<keyof FlavorProfile, string> = { spicy: 'Vị cay', salty: 'Vị mặn', sweet: 'Vị ngọt', sour: 'Vị chua' };
const intensities: readonly { value: FlavorItem['intensity']; label: string }[] = [
  { value: 'unknown', label: 'Không ưu tiên' }, { value: 'none', label: 'Không' }, { value: 'low', label: 'Ít' }, { value: 'medium', label: 'Vừa' }, { value: 'high', label: 'Nhiều' },
];

export function PreferencesScreen(props: PreferencesScreenProps) {
  const data = useRoomSetup(props.repository, props.roomId);
  const { colors } = useShellTheme();
  if (data.value) return <PreferencesForm {...props} loaded={data.value} reload={data.reload} />;
  return <SetupFrame title="Hôm nay thích ăn gì?" onBack={props.onBack} onHome={props.onHome} controls={props.previewControls?.(false)}>
    <StatusNotice title={data.loading ? 'Đang tải khẩu vị riêng…' : 'Chưa tải được khẩu vị'} message={data.error ? setupError(data.error) : undefined} actionLabel={data.error ? 'Tải lại khẩu vị' : undefined} onAction={data.reload} colors={colors} />
  </SetupFrame>;
}

function PreferencesForm({ repository, roomId, userId, catalogue, onBack, onHome, onSaved, onContinue, createRequestId, previewControls, loaded, reload }: PreferencesScreenProps & { loaded: RoomSetupData; reload: () => void }) {
  const { colors } = useShellTheme();
  const data = { value: loaded, reload };
  const writer = useSetupIntent<UpdatePreferencesRequest>(createRequestId);
  const [preferences, setPreferences] = useState<UserPreferences>(loaded.room.ownPreferences ?? emptySoft(false));
  const [validationError, setValidationError] = useState<string>();
  const [saved, setSaved] = useState<RoomSnapshot>();
  const [snapshotError, setSnapshotError] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const room = data.value?.room;
  const serverNow = Date.parse(loaded.discovery.serverTime);
  const editable = !!room && room.state === 'LOBBY' && room.members.some(m => m.userId === userId) && Date.parse(room.expiresAt) > serverNow;
  const disabled = !editable || writer.locked;
  const any = isWhatever(preferences);
  const change = (patch: Partial<UserPreferences>) => { setPreferences(v => ({ ...v, ...patch })); writer.clear(); };
  const toggle = (key: 'cuisineIds' | 'categoryIds', id: string) => change({ [key]: preferences[key].includes(id) ? preferences[key].filter(v => v !== id) : [...preferences[key], id] });
  const setFlavor = (key: keyof FlavorProfile, intensity: FlavorItem['intensity']) => {
    const next: FlavorProfile = { spicy: unknownFlavor(), salty: unknownFlavor(), sweet: unknownFlavor(), sour: unknownFlavor(), ...preferences.flavor };
    next[key] = { present: intensity === 'unknown' ? null : intensity !== 'none', intensity };
    change({ flavor: Object.values(next).every(v => v.intensity === 'unknown') ? undefined : next });
  };
  async function readSaved() {
    setSnapshotError(false);
    try {
      const result = await repository.getRoomSnapshot(roomId);
      if (!alive.current) return;
      if (result.ok) { setSaved(result.data); onSaved?.(result.data); } else setSnapshotError(true);
    } catch { if (alive.current) setSnapshotError(true); }
  }
  async function save(skip = false) {
    if (!editable || !room) return;
    if (!writer.uncertain && Date.parse(room.expiresAt) <= currentServerTime(loaded.discovery.serverTime, loaded.loadedAt)) { setValidationError(setupError('ROOM_EXPIRED')); return; }
    const value = skip ? emptySoft(preferences.historyConsent) : preferences;
    const result = await writer.submit({ roomId, expectedVersion: room.version, preferences: value }, request => repository.updatePreferences(request));
    if (result?.ok) { if (skip) setPreferences(value); await readSaved(); }
  }
  if (saved) {
    const value = saved.ownPreferences ?? preferences;
    return <SetupFrame key="saved" title="Đã lưu khẩu vị mẫu" onBack={onBack} onHome={onHome} controls={previewControls?.(false)}>
      <StatusNotice title="Đã hoàn tất chọn khẩu vị" message={onContinue
        ? 'Khẩu vị đã lưu. Bạn có thể tiếp tục đến phòng chờ và chủ động xác nhận sẵn sàng.'
        : 'Bạn đã hoàn tất bước này. Bản mô phỏng kết thúc tại đây; phòng chờ chưa được kết nối.'} colors={colors} />
      <ContextSummary anchorName={saved.context.anchorName ?? 'Điểm ăn chung'} mealLabel={mealLabels[saved.context.mealSlot]} desiredAtLabel={`${localTime(saved.context.desiredAt)} · UTC+7`} radiusLabel={`${saved.context.radiusM / 1000} km`} colors={colors} />
      <SetupSection title="Khẩu vị đã lưu">
        <Text style={[styles.body, { color: colors.text }]}>{isWhatever(value) ? 'Gì cũng được · Không có ưu tiên mềm' : 'Đã lưu các sở thích mềm của bạn'}</Text>
        {value.categoryIds.length ? <Text style={[styles.body, { color: colors.text }]}>Thể loại: {catalogue.categories.filter(v => value.categoryIds.includes(v.id)).map(v => v.label).join(', ')}</Text> : null}
        <Text style={[styles.body, { color: colors.text }]}>Đồng ý lưu lịch sử bữa ăn: {value.historyConsent ? 'Đang bật' : 'Đang tắt'}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Sẵn sàng của bạn: {saved.members.find(m => m.userId === userId)?.ready ? 'Đang sẵn sàng' : 'Chưa sẵn sàng'}</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Chưa tự bật sẵn sàng hoặc bắt đầu chọn món.</Text>
      </SetupSection>
      {onContinue ? <AppButton label="Tiếp tục đến phòng chờ" onPress={() => onContinue(saved)} colors={colors} /> : null}
      <AppButton label="Chỉnh lại khẩu vị" variant="secondary" onPress={reload} colors={colors} />
      <AppButton label="Quay lại bối cảnh" variant="quiet" onPress={onBack} colors={colors} />
    </SetupFrame>;
  }
  return <SetupFrame title="Hôm nay thích ăn gì?" onBack={onBack} onHome={onHome} busy={writer.pending || writer.uncertain} controls={previewControls?.(writer.pending || writer.uncertain)}>
    <Text style={[styles.body, { color: colors.muted }]}>Sở thích chỉ giúp ưu tiên món. Bỏ chọn hoặc bỏ qua không phải phiếu Không ăn.</Text>
    {room && !editable ? <StatusNotice title="Chưa thể sửa khẩu vị" message="Bạn không còn trong phòng hoặc phòng đã khóa/hết hạn. Hãy quay lại kiểm tra." colors={colors} /> : null}
    {room ? <>
      <ContextSummary anchorName={room.context.anchorName ?? 'Điểm ăn chung'} mealLabel={mealLabels[room.context.mealSlot]} desiredAtLabel={`${localTime(room.context.desiredAt)} · UTC+7`} radiusLabel={`${room.context.radiusM / 1000} km`} colors={colors} />
      <Pressable accessibilityRole="button" accessibilityLabel="Gì cũng được" accessibilityState={{ selected: any, disabled }} disabled={disabled} onPress={() => { setPreferences(emptySoft(preferences.historyConsent)); writer.clear(); }} style={[styles.hero, { backgroundColor: colors.warm, borderColor: any ? colors.primary : colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>✨ Gì cũng được {any ? '✓ Đang chọn' : ''}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Ăn gì cũng vui · Cả nhóm cùng chọn</Text>
      </Pressable>
      <SetupSection title="Ẩm thực ưu tiên">
        <Text style={[styles.caption, { color: colors.muted }]}>Ẩm thực khác vùng miền nguồn gốc của món và khác địa điểm quán đang bán.</Text>
        <View style={styles.row}>{catalogue.cuisines.map(v => <Chip key={v.id} label={v.label} selected={preferences.cuisineIds.includes(v.id)} disabled={disabled} onPress={() => toggle('cuisineIds', v.id)} colors={colors} />)}</View>
        {!catalogue.cuisines.length ? <Text style={[styles.body, { color: colors.muted }]}>Chưa có danh mục ẩm thực; bạn vẫn có thể bỏ qua sở thích.</Text> : null}
      </SetupSection>
      <SetupSection title="Thể loại món ưu tiên">
        <Text style={[styles.caption, { color: colors.muted }]}>Có thể chọn nhiều thể loại. Chạm lại để bỏ chọn; không chọn không có nghĩa là Không ăn.</Text>
        <View style={styles.row}>{catalogue.categories.map(v => <Chip key={v.id} label={v.label} selected={preferences.categoryIds.includes(v.id)} disabled={disabled} onPress={() => toggle('categoryIds', v.id)} colors={colors} />)}</View>
      </SetupSection>
      <SetupSection title="Nhiệt độ món">
        <Text style={[styles.caption, { color: colors.muted }]}>Nóng/lạnh là nhiệt độ, không phải mức cay.</Text>
        <View style={styles.row}>
          <Chip label="Nhiệt độ · Không ưu tiên" selected={!preferences.temperature || preferences.temperature === 'unknown'} disabled={disabled} onPress={() => change({ temperature: undefined })} colors={colors} />
          {(['hot', 'warm', 'cold', 'ambient'] as const).map(v => <Chip key={v} label={temperatureLabels[v]} selected={preferences.temperature === v} disabled={disabled} onPress={() => change({ temperature: v })} colors={colors} />)}
        </View>
      </SetupSection>
      <SetupSection title="Hương vị ưu tiên">
        {(Object.keys(flavorLabels) as (keyof FlavorProfile)[]).map(key => <View key={key} style={styles.section}>
          <Text style={[styles.body, { color: colors.text }]}>{flavorLabels[key]}</Text>
          <View style={styles.row}>{intensities.map(v => <Chip key={v.value} label={`${flavorLabels[key]} · ${v.label}`} selected={(preferences.flavor?.[key].intensity ?? 'unknown') === v.value} disabled={disabled} onPress={() => setFlavor(key, v.value)} colors={colors} />)}</View>
        </View>)}
      </SetupSection>
      <SetupSection title="Lịch sử và chống lặp">
        <SetupToggle label="Đồng ý lưu lịch sử bữa ăn" disabled={disabled} value={preferences.historyConsent} onValueChange={v => change({ historyConsent: v })} />
        <Text style={[styles.caption, { color: colors.muted }]}>Tùy chọn. Không lưu phiếu thô. Lịch sử nhóm chỉ có khi mọi người cùng đồng ý; tắt lưu không thay kết quả đã chốt.</Text>
        <Text style={[styles.body, { color: colors.text }]}>Chống lặp của phòng: {room.context.avoidRecent ? 'Đang bật' : 'Đang tắt'} · do chủ phòng chọn.</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Chủ phòng đổi tại màn Bối cảnh → Lịch sử và chống lặp → Giảm ưu tiên món đã ăn gần đây.</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Chỉ giảm ưu tiên mềm khi có dữ liệu và đồng ý phù hợp; chưa đọc hoặc ghi lịch sử thật ở bản mô phỏng.</Text>
      </SetupSection>
      <StatusNotice title="Lưu khẩu vị sẽ đặt bạn về chưa sẵn sàng" message="Chủ phòng không xem sở thích hoặc phiếu thô của người khác ở màn này. Bạn cần chủ động xác nhận sẵn sàng lại trong phòng chờ." colors={colors} />
      {writer.error || validationError ? <StatusNotice title="Chưa hoàn tất lưu khẩu vị" message={validationError ?? setupError(writer.error!)} tone="error" colors={colors} /> : null}
      {writer.error === 'VERSION_CONFLICT' || writer.error === 'CONTEXT_CHANGED' ? <AppButton label="Tải lại khẩu vị" onPress={() => { writer.clear(); data.reload(); }} colors={colors} /> : null}
      <AppButton label={writer.uncertain ? 'Thử lại cùng yêu cầu lưu khẩu vị' : writer.accepted ? 'Đã lưu khẩu vị mẫu' : 'Lưu khẩu vị mẫu'} disabled={!editable || writer.accepted} loading={writer.pending} onPress={() => { void save(); }} colors={colors} />
      <AppButton label="Bỏ qua sở thích mềm" variant="quiet" disabled={disabled} onPress={() => { void save(true); }} colors={colors} />
      {writer.accepted ? <StatusNotice title="Đã lưu khẩu vị mẫu" message="Chưa tự bật sẵn sàng hoặc bắt đầu chọn món." colors={colors} /> : null}
      {snapshotError ? <StatusNotice title="Đã lưu, chưa tải lại được phòng" actionLabel="Tải lại phòng đã lưu" onAction={() => { void readSaved(); }} colors={colors} /> : null}
    </> : null}
  </SetupFrame>;
}
