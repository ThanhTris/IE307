import { useEffect, useRef, useState } from 'react';
import { emptyPreferences, setupValidation, type SetupRoom } from '../services/dishSetup';
import type { DishSetupGateway, SetupIntent, SetupRead } from '../services/dishSetupGateway';
import { useDishSetupDraft } from './useDishSetupDraft';

let sequence = 0;
const mockRequestId = () => `ui-setup-${++sequence}`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function useDishSetupFlow(gateway: DishSetupGateway, requestId = mockRequestId, now = Date.now, initialStage: 'setup' | 'preferences' = 'setup') {
  const draftState = useDishSetupDraft();
  const receiveDraft = draftState.receive;
  const [data, setData] = useState<SetupRead>(), [readError, setReadError] = useState(false);
  const [preferences, setPreferences] = useState(emptyPreferences), [baselinePreferences, setBaselinePreferences] = useState(emptyPreferences);
  const [stage, setStage] = useState<'setup' | 'preferences' | 'complete'>(initialStage);
  const [editorReturn, setEditorReturn] = useState<'setup' | 'complete'>('setup');
  const [phase, setPhase] = useState<'idle' | 'sending' | 'unknown' | 'ack-read' | 'partial'>('idle');
  const [notice, setNotice] = useState<string>(), [needsRefresh, setNeedsRefresh] = useState(false);
  const [shortage, setShortage] = useState<{ available: number; requested: number }>();
  const alive = useRef(false), lock = useRef(false), intent = useRef<SetupIntent | null>(null);
  const acknowledged = useRef<{ kind: SetupIntent['kind']; room: SetupRoom } | null>(null);
  useEffect(() => {
    alive.current = true;
    let current = true;
    void gateway.read().then(value => {
      if (!current) return;
      setData(value); if (value.settings) receiveDraft(clone(value.settings));
      const own = clone(value.ownRoomPreferences ?? value.accountDefaults);
      setPreferences(own); setBaselinePreferences(clone(own));
      if (initialStage === 'preferences' && value.ownRoomPreferences) setEditorReturn('complete');
    }).catch(() => { if (current) setReadError(true); });
    return () => { current = false; alive.current = false; };
  }, [gateway, receiveDraft, initialStage]);
  const blocked = phase !== 'idle' || needsRefresh || !data?.connected || data.room?.state === 'CLOSED';
  const refresh = async () => {
    if (lock.current) return;
    lock.current = true; setPhase('sending');
    try {
      const value = await gateway.read(); if (!alive.current) return;
      setData(value); setReadError(false); setNeedsRefresh(false);
      if (!data) { if (value.settings) receiveDraft(clone(value.settings)); const own = clone(value.ownRoomPreferences ?? value.accountDefaults); setPreferences(own); setBaselinePreferences(clone(own)); }
      setNotice(value.connected ? 'Đã tải lại trạng thái; nháp được giữ.' : 'Bạn đang ngoại tuyến. Nháp chưa đồng bộ.');
    } catch { if (alive.current) { setReadError(true); setNotice('Chưa tải được trạng thái. Hãy thử lại.'); } }
    finally { lock.current = false; if (alive.current) setPhase('idle'); }
  };
  const readAcknowledged = async () => {
    const ack = acknowledged.current;
    if (!ack) return;
    setPhase('ack-read');
    try {
      const value = await gateway.read(); if (!alive.current) return;
      if (!value.room || value.room.id !== ack.room.id || value.room.code !== ack.room.code || value.room.version < ack.room.version) throw new Error('Unconfirmed snapshot');
      if (ack.kind === 'preferences' && !value.ownRoomPreferences) throw new Error('Own preference snapshot missing');
      if (ack.kind === 'cancel' && value.room.state !== 'CLOSED') throw new Error('Cancellation not confirmed');
      setData(value); setReadError(false);
      if (value.room.state === 'CLOSED') setNotice('Phòng đã đóng. Thay đổi không thể tiếp tục.');
      else if (ack.kind === 'settings') { if (value.settings) receiveDraft({ ...clone(value.settings), ...(intent.current?.kind === 'settings' ? { inviteeIds: clone(intent.current.draft.inviteeIds), budget: clone(intent.current.draft.budget), avoidRecent: intent.current.draft.avoidRecent } : {}) }); else draftState.markSaved(); setStage('preferences'); setNotice(undefined); }
      else { const own = clone(value.ownRoomPreferences!); setPreferences(own); setBaselinePreferences(clone(own)); setStage('complete'); setNotice(undefined); }
      acknowledged.current = null; intent.current = null; setPhase('idle');
    } catch { if (alive.current) { setNotice('Đã nhận xác nhận lưu; chưa tải được trạng thái mới. Chỉ thử đọc lại, không gửi lại.'); setPhase('ack-read'); } }
  };
  const send = async (value: SetupIntent) => {
    if (lock.current) return;
    lock.current = true; intent.current = value; setPhase('sending'); setNotice(undefined);
    try {
      const reply = await gateway.write(clone(value)); if (!alive.current) return;
      if (reply.ok) { acknowledged.current = { kind: value.kind, room: reply.room }; await readAcknowledged(); return; }
      if (reply.code === 'PARTIAL') {
        setPhase('partial'); setData(previous => previous ? { ...previous, room: reply.room } : previous);
        setNotice(reply.pendingStep === 'preferences'
          ? 'Thiết lập phòng đã lưu; ngân sách hoặc chống lặp chưa lưu. Hãy thử lại phần còn thiếu.'
          : reply.pendingStep === 'consent'
            ? 'Khẩu vị đã lưu; lựa chọn lưu lịch sử cho tài khoản chưa được xác nhận. Hãy thử lại phần còn thiếu.'
            : 'Yêu cầu đã được xác nhận một phần; chưa đọc lại được trạng thái mới nhất. Hãy thử tải trạng thái, không gửi lại phần đã xác nhận.');
        return;
      }
      if (reply.code === 'UNKNOWN') { setPhase('unknown'); setNotice('Chưa rõ kết quả lưu. Thử lại cùng yêu cầu; không sửa hoặc tạo phòng khác.'); return; }
      intent.current = null; setPhase('idle');
      if (reply.code === 'SHORTAGE' && value.kind === 'settings' && Number.isInteger(reply.available) && reply.available! >= 0 && reply.available! < value.draft.dishCount && reply.requested === value.draft.dishCount) {
        setShortage({ available: reply.available!, requested: reply.requested }); return;
      }
      if (reply.code === 'CLOSED') { setData(previous => previous && ({ ...previous, room: previous.room ? { ...previous.room, state: 'CLOSED' } : { id: '', code: '', version: 0, state: 'CLOSED' } })); setNotice('Phòng đã đóng.'); }
      else if (reply.code === 'STALE') { setNeedsRefresh(true); setNotice('Trạng thái phòng đã đổi. Tải lại trước khi lưu tiếp; nháp được giữ.'); }
      else setNotice('Chưa lưu được thay đổi. Đã giữ nháp; hãy thử lại.');
    } catch { if (alive.current) { setPhase('unknown'); setNotice('Mất phản hồi. Chưa rõ kết quả lưu; thử lại cùng yêu cầu.'); } }
    finally { lock.current = false; }
  };
  const submitSettings = () => {
    if (blocked || lock.current) return;
    if (data?.canEditSettings === false) { if (data.room) setStage('preferences'); return; }
    if (acknowledged.current?.kind === 'settings') { retry(); return; }
    const pending = intent.current;
    if (pending?.kind === 'settings' && JSON.stringify(pending.draft) === JSON.stringify(draftState.draft)) { void send(pending); return; }
    const invalid = setupValidation(draftState.draft, now());
    if (invalid) { setNotice(invalid); return; }
    void send({ kind: 'settings', requestId: requestId(), draft: clone(draftState.draft), room: data?.room ? clone(data.room) : undefined });
  };
  const submitPreferences = (skip: boolean) => {
    if (blocked || lock.current || !data?.room || stage !== 'preferences') return;
    const next = clone(skip ? { ...baselinePreferences, historyConsent: preferences.historyConsent } : preferences);
    const changedFields = (['cuisineIds', 'categoryIds', 'temperature', 'flavor'] as const)
      .filter(key => JSON.stringify(next[key]) !== JSON.stringify(baselinePreferences[key]));
    if (acknowledged.current?.kind === 'preferences') { retry(); return; }
    const pending = intent.current;
    if (pending?.kind === 'preferences' && JSON.stringify(pending.preferences) === JSON.stringify(next)) { void send(pending); return; }
    void send({ kind: 'preferences', requestId: requestId(), room: clone(data.room), preferences: next, changedFields: [...changedFields] });
  };
  const retry = () => {
    if (lock.current) return;
    if (acknowledged.current) { lock.current = true; void readAcknowledged().finally(() => { lock.current = false; }); }
    else if (intent.current) void send(intent.current);
  };
  // Recovery is automatic: re-read an acknowledged write / retry the same request / reload stale state.
  const attempts = useRef(0);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    if (phase === 'idle') { attempts.current = 0; return; }
    if (phase === 'sending') return;
    const timer = setTimeout(() => {
      if (attempts.current >= 4) {
        // Give up quietly: keep the saved intent so pressing the main button re-sends the SAME request.
        setPhase('idle'); setNotice('Chưa lưu được. Bấm nút để thử lại.'); return;
      }
      attempts.current += 1; retry(); setRetryTick(tick => tick + 1);
    }, 1500 + attempts.current * 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, retryTick]);
  useEffect(() => {
    if (!needsRefresh || phase !== 'idle') return;
    const timer = setTimeout(() => { void refresh(); }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRefresh, phase]);
  const cancelRoom = () => {
    if (blocked || lock.current || !data?.room || !data.canEditSettings) return;
    void send({ kind: 'cancel', requestId: requestId(), room: clone(data.room) });
  };
  const discardPartial = () => {
    if (phase !== 'partial') return;
    intent.current = null; acknowledged.current = null; setPhase('idle'); setNeedsRefresh(true);
    setNotice('Một phần đã lưu. Tải lại trạng thái trước khi sửa hoặc gửi yêu cầu mới.');
  };
  return { ...draftState, data, readError, preferences, stage, editorReturn, phase, blocked, notice, shortage, needsRefresh,
    preferencesDirty: JSON.stringify(preferences) !== JSON.stringify(baselinePreferences),
    changePreferences: setPreferences, changeStage: setStage, submitSettings, submitPreferences, retry, refresh,
    cancelRoom,
    discardPartial,
    editSettings: () => { setEditorReturn('complete'); setNotice(undefined); setStage('setup'); },
    editPreferences: () => { setEditorReturn('complete'); setNotice(undefined); setStage('preferences'); },
    returnFromEditor: () => { setNotice(undefined); setStage(editorReturn); },
    discardPreferences: () => setPreferences(clone(baselinePreferences)), dismissShortage: () => setShortage(undefined),
    confirmReduction: () => { if (shortage && shortage.available >= 10 && shortage.available <= 20) { draftState.change({ dishCount: shortage.available }); setShortage(undefined); } },
  };
}
