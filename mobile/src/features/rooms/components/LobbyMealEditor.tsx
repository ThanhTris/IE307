import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, DishCount, SheetDialog } from '../../../shared/ui';
import { useToast } from '../../../shared/ui/feedback/Toast';
import { ScheduleSheet } from '../../context/components/ScheduleSheet';
import { SetupChoice } from '../../context/components/SetupChoice';
import { SetupTimeMode } from '../../context/components/SetupTimeMode';
import { useMealTimeGuard } from '../../context/hooks/useMealTimeGuard';
import { LobbyMealEditorSkeleton } from './LobbyMealEditorSkeleton';
import type { DishSetupGateway, SetupIntent } from '../../context/services/dishSetupGateway';
import {
  budgetOptions, defaultScheduledTime, mealOptions, setupValidation, switchToNow,
  type SetupDraft, type SetupRoom,
} from '../../context/services/dishSetup';
import { createDurableRequestId } from '../services/roomRepository';

export type MealField = 'meal' | 'time' | 'count' | 'budget';

const titles: Record<MealField, string> = {
  meal: 'Chọn buổi ăn', time: 'Thời gian ăn', count: 'Số món để chọn · 10–20', budget: 'Ngân sách mỗi người',
};

/**
 * Edits ONE field of the room settings in place (from the lobby meal card) through the same
 * gateway as the setup flow, so versioning, ACK/retry and shortage handling stay identical.
 */
export function LobbyMealEditor({ field, gateway, onClose, onSaved, now = Date.now }: {
  field: MealField | null; gateway: DishSetupGateway; onClose: () => void; onSaved: () => void; now?: () => number;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), toast = useToast();
  const [loaded, setLoaded] = useState<{ draft: SetupDraft; room: SetupRoom } | null>(null);
  const [count, setCount] = useState(15), [schedule, setSchedule] = useState<string>(), [busy, setBusy] = useState(false);
  // Same request id for the same change so a lost reply is retried, not duplicated.
  const pending = useRef<{ key: string; requestId: string } | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    if (!field) return;
    let alive = true;
    void gateway.read().then(value => {
      if (!alive) return;
      if (value.settings && value.room) { setLoaded({ draft: value.settings, room: value.room }); setCount(value.settings.dishCount); }
      else { toast?.show({ title: 'Chưa tải được thiết lập phòng', tone: 'error' }); onClose(); }
    }).catch(() => { if (alive) { toast?.show({ title: 'Chưa tải được thiết lập phòng', tone: 'error' }); onClose(); } });
    return () => { alive = false; setLoaded(null); setSchedule(undefined); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, gateway]);

  const save = async (next: SetupDraft) => {
    if (!loaded || lock.current) return;
    const invalid = setupValidation(next, now());
    if (invalid) { toast?.show({ title: invalid, tone: 'warning' }); return; }
    lock.current = true; setBusy(true);
    const key = JSON.stringify([loaded.room.version, next]);
    if (pending.current?.key !== key) pending.current = { key, requestId: createDurableRequestId('lobby_settings') };
    const intent: SetupIntent = { kind: 'settings', requestId: pending.current.requestId, room: loaded.room, draft: next };
    try {
      const reply = await gateway.write(intent);
      if (reply.ok) { pending.current = null; toast?.show({ title: 'Đã cập nhật bữa ăn', tone: 'success' }); onSaved(); onClose(); return; }
      if (reply.code === 'SHORTAGE') toast?.show({ title: 'Không đủ món', message: (reply.available ?? 0) >= 10 ? `Chỉ có ${reply.available} món phù hợp. Hãy chọn tối đa ${reply.available} món.` : `Chỉ có ${reply.available ?? 0} món phù hợp. Hãy đổi giờ hoặc buổi ăn.`, tone: 'error' });
      else if (reply.code === 'CLOSED') { toast?.show({ title: 'Phòng đã đóng', tone: 'error' }); onClose(); }
      else if (reply.code === 'STALE') { toast?.show({ title: 'Phòng vừa thay đổi', message: 'Đang tải lại, hãy chọn lại.', tone: 'warning' }); onSaved(); onClose(); }
      else toast?.show({ title: 'Chưa lưu được', message: 'Hãy thử lại.', tone: 'error' });
    } catch { toast?.show({ title: 'Chưa lưu được', message: 'Hãy thử lại.', tone: 'error' }); }
    finally { lock.current = false; setBusy(false); }
  };

  const { guard, dialog } = useMealTimeGuard(next => { void save(next); }, now);
  const draft = loaded?.draft;
  const visible = field !== null && !schedule;
  return <>
    <SheetDialog visible={visible} title={field ? titles[field] : ''} onClose={() => { if (!busy) onClose(); }} showClose={false} colors={colors}>
      {!draft && field ? <LobbyMealEditorSkeleton field={field} colors={colors} /> : null}
      {draft && field === 'meal' ? <View style={styles.grid}>{mealOptions.map(item => <SetupChoice key={item.id} label={item.label} icon={item.icon} stacked selected={draft.mealSlot === item.id} disabled={busy} onPress={() => { guard({ ...draft, mealSlot: item.id }); }} />)}</View> : null}
      {draft && field === 'budget' ? <View style={styles.grid}>{budgetOptions.map(item => <SetupChoice key={item.id ?? 'none'} label={item.label} icon={item.icon} selected={draft.budget === item.id} disabled={busy} onPress={() => { void save({ ...draft, budget: item.id }); }} />)}</View> : null}
      {draft && field === 'time' ? <SetupTimeMode scheduled={draft.timeMode === 'scheduled'} disabled={busy} onNow={() => { void save(switchToNow(draft, now())); }}
        onSchedule={() => setSchedule(draft.timeMode === 'scheduled' && draft.desiredAt && Number.isFinite(Date.parse(draft.desiredAt)) ? draft.desiredAt : defaultScheduledTime(now()))} /> : null}
      {draft && field === 'count' ? <>
        <DishCount value={count} onChange={setCount} disabled={busy} colors={colors} layout="inline" />
        <AppButton label="Lưu" loading={busy} disabled={busy || count === draft.dishCount} onPress={() => { void save({ ...draft, dishCount: count }); }} colors={colors} textStyle={textStyle(600)} />
      </> : null}
      {draft && field === 'time' ? <Text style={[styles.hint, { color: colors.muted }, textStyle(400)]}>Chọn Hẹn giờ để đặt ngày và giờ ăn.</Text> : null}
    </SheetDialog>
    {dialog}
    {schedule && draft ? <ScheduleSheet initial={schedule} now={now} onClose={() => { setSchedule(undefined); onClose(); }}
      onConfirm={desiredAt => { setSchedule(undefined); guard({ ...draft, timeMode: 'scheduled', desiredAt }); }} /> : null}
  </>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontSize: 13, lineHeight: 18 },
});
