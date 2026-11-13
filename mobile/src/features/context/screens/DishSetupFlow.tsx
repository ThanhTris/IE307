import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { useMealTimeGuard } from '../hooks/useMealTimeGuard';
import { SetupSkeleton } from '../components/SetupSkeleton';
import { DishPreferencesScreen } from '../../preferences/screens/DishPreferencesScreen';
import { DishSetupFrame } from '../components/DishSetupFrame';
import { ScheduleSheet } from '../components/ScheduleSheet';
import { withPreviewFriends } from '../services/previewFriends';
import { SetupFriendsSheet } from '../components/SetupFriendsSheet';
import { SetupShortageDialog } from '../components/SetupShortageDialog';
import { SetupConfirmDialog } from '../components/SetupConfirmDialog';
import { useDishSetupFlow } from '../hooks/useDishSetupFlow';
import { categoriesForMeal } from '../services/dishSetupCatalogue';
import { keepCategoriesOf, knownPreferences } from '../../preferences/services/dishPreferences';
import type { DishSetupGateway } from '../services/dishSetupGateway';
import { defaultScheduledTime, type SetupRoom, type SetupStage } from '../services/dishSetup';
import { DishSetupScreen } from './DishSetupScreen';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

export function DishSetupFlow({ gateway, onExit, onLobby, controls, initialInvitees, initialStage = 'setup', initialPanel, initialSchedule, initialSearch, requestId, now = Date.now }: {
  gateway: DishSetupGateway; onExit: () => void; onLobby?: (room: SetupRoom, inviteeIds: string[]) => void; initialInvitees?: string[]; controls?: (locked: boolean, stage: SetupStage) => ReactNode;
  initialStage?: 'setup' | 'preferences'; initialPanel?: 'schedule' | 'calendar' | 'friends' | 'discard'; initialSchedule?: string; initialSearch?: string;
  requestId?: () => string; now?: () => number;
}) {
  const flow = useDishSetupFlow(gateway, requestId, now, initialStage, initialInvitees), { colors } = useShellTheme();
  const [schedule, setSchedule] = useState<string | undefined>(initialPanel === 'schedule' || initialPanel === 'calendar' ? initialSchedule : undefined), [friends, setFriends] = useState(initialPanel === 'friends'), [discard, setDiscard] = useState(initialPanel === 'discard');
  const [confirmExit, setConfirmExit] = useState(false);
  // Cancelling your own room goes straight back to the home screen once the server confirms it closed.
  const [cancelling, setCancelling] = useState(false);
  const closedNow = flow.data?.room?.state === 'CLOSED';
  const exited = useRef(false);
  useEffect(() => { if (cancelling && closedNow && !exited.current) { exited.current = true; onExit(); } }, [cancelling, closedNow, onExit]);
  const locked = flow.phase !== 'idle';
  const mealGuard = useMealTimeGuard(next => { if (!locked && flow.data?.canEditSettings) flow.change(next); }, now);
  // Saving preferences goes straight to the lobby instead of an intermediate 'saved' screen.
  const completedRoom = flow.stage === 'complete' ? flow.data?.room : undefined;
  const inviteeIds = flow.draft.inviteeIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (completedRoom && completedRoom.state !== 'CLOSED' && onLobby) onLobby(completedRoom, inviteeIds); }, [completedRoom, onLobby]);
  const mealSlot = flow.draft.mealSlot, catalogue = flow.data?.catalogue;
  const groups = catalogue ? [...catalogue.categories, ...(catalogue.snackCategories ?? [])] : [];
  // Once per load: forget saved ids that have no tile any more, and for an existing room (whose meal is real, not
  // guessed from the clock) the dish groups of the other meal kind. Not an edit, so the draft stays clean.
  const hasRoom = Boolean(flow.data?.room);
  useEffect(() => {
    if (!catalogue) return;
    flow.normalizePreferences(value => {
      const known = knownPreferences(value, catalogue);
      return hasRoom ? keepCategoriesOf(known, categoriesForMeal(catalogue, mealSlot), groups) : known;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue]);
  // Switching between a main meal and "Ăn vặt" swaps the dish groups: when the host changes the meal, drop the
  // groups of the other kind. The meal guessed from the clock at load never strips saved choices.
  // Starts watching only once the setup data (and the room's own meal) has arrived, so loading is never a change.
  const lastMeal = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!catalogue) return;
    const previous = lastMeal.current;
    lastMeal.current = mealSlot;
    if (previous === undefined || previous === mealSlot) return;
    const next = keepCategoriesOf(flow.preferences, categoriesForMeal(catalogue, mealSlot), groups);
    if (next !== flow.preferences) flow.changePreferences(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealSlot, catalogue]);
  const leaveRoom = () => { if (locked) return; if (flow.data?.room && flow.data.canEditSettings) setConfirmExit(true); else onExit(); };
  const back = () => {
    if (locked) return;
    if (flow.stage === 'complete') { leaveRoom(); return; }
    // Members have no room-settings step: leaving their first preferences pass exits the flow.
    const memberFirstPass = flow.stage === 'preferences' && flow.data?.canEditSettings === false && flow.editorReturn !== 'complete';
    if (memberFirstPass && !flow.preferencesDirty) { onExit(); return; }
    // Host stepping back from preferences to room settings keeps both drafts; only leaving the flow asks.
    if (flow.stage === 'preferences' && flow.editorReturn !== 'complete' && flow.data?.canEditSettings !== false) { flow.changeStage('setup'); return; }
    if (flow.editorReturn === 'complete' && !(flow.stage === 'preferences' ? flow.preferencesDirty : flow.dirty)) { flow.returnFromEditor(); return; }
    if (flow.stage === 'setup' && flow.editorReturn !== 'complete' && flow.data?.room) { leaveRoom(); return; }
    setDiscard(true);
  };
  // Recovery (retry / reload) is automatic now; the only extra content left is the optional host-provided controls.
  const extra = controls ? <View style={{ gap: 12 }}>{controls(locked, flow.data?.room?.state === 'CLOSED' ? 'closed' : flow.stage)}</View> : null;
  if (!flow.data) return <DishSetupFrame title={initialStage === 'preferences' ? 'Khẩu vị' : 'Thiết lập phòng'} onBack={onExit} busy={locked} footer={extra}>
    {flow.readError
      ? <StatusNotice title="Chưa tải được thiết lập" tone="error" colors={colors} actionLabel="Thử tải lại" onAction={() => { void flow.refresh(); }} />
      : <SetupSkeleton label="Đang tải các lựa chọn" colors={colors} />}
  </DishSetupFrame>;
  if (flow.data.room?.state === 'CLOSED') return <DishSetupFrame title="Khẩu vị" onBack={onExit} footer={<><AppButton label="Về trang chủ" colors={colors} onPress={onExit} />{extra}</>}><StatusNotice title={flow.data.closedReason === 'cancelled' ? 'Phòng đã bị hủy' : 'Phòng đã đóng'} message={flow.data.closedReason === 'cancelled' ? 'Phòng đã kết thúc. Bạn có thể về trang chủ để tạo phòng khác.' : 'Phòng đã đóng. Thay đổi chưa được lưu.'} colors={colors} /></DishSetupFrame>;
  const exitDialog = confirmExit ? <SetupConfirmDialog title="Hủy phòng?" message={`Phòng ${flow.data.room?.code} đã được tạo. Hủy phòng để về trang chủ, hoặc ở lại để tiếp tục.`} confirmLabel="Xác nhận hủy phòng" continueLabel="Ở lại phòng" onConfirm={() => { setConfirmExit(false); setCancelling(true); flow.cancelRoom(); }} onContinue={() => setConfirmExit(false)} /> : null;
  if (flow.stage === 'complete') return <><DishSetupFrame title="Đã lưu khẩu vị" onBack={back} busy={locked} footer={<><AppButton label="Sửa khẩu vị" colors={colors} disabled={locked} onPress={flow.editPreferences} />{flow.data.canEditSettings ? <AppButton label="Sửa thiết lập" colors={colors} disabled={locked} variant="secondary" onPress={flow.editSettings} /> : null}{onLobby && flow.data.room ? <AppButton label="Mở phòng chờ" colors={colors} disabled={locked} onPress={() => onLobby(flow.data!.room!, inviteeIds)} /> : <StatusNotice title="Đã hoàn tất thiết lập" message="Khẩu vị của bạn đã được lưu." colors={colors} />}<AppButton label={flow.data.canEditSettings ? "Hủy phòng" : "Về trang chủ"} colors={colors} disabled={locked} variant="secondary" onPress={leaveRoom} />{extra}</>}>
    <StatusNotice title={`Phòng ${flow.data.room?.code}`} message="Đã lưu khẩu vị của bạn. Vào phòng chờ để mời bạn bè hoặc chỉnh lại thiết lập." colors={colors} />
    {flow.notice ? <ToastNotice title={flow.notice} tone={flow.noticeTone} /> : null}
  </DishSetupFrame>{exitDialog}</>;
  const notice = flow.notice ?? (flow.data.connected ? undefined : 'Bạn đang ngoại tuyến. Nháp trên máy chưa đồng bộ.');
  const noticeTone = flow.notice ? flow.noticeTone : 'warning';
  return <>
    {flow.stage === 'setup' ? <DishSetupScreen friends={withPreviewFriends(flow.data.friends)} hasRecentHistory={flow.data.hasRecentHistory} draft={flow.draft} guard={mealGuard.guard} onChange={patch => { if (!locked && flow.data?.canEditSettings) flow.change(patch); }} onBack={back} onContinue={flow.submitSettings} busy={locked} readOnly={!flow.data.canEditSettings} submitDisabled={flow.blocked} notice={notice} noticeTone={noticeTone} extra={extra} now={now} onSchedule={() => setSchedule(flow.draft.timeMode === 'scheduled' && flow.draft.desiredAt && Number.isFinite(Date.parse(flow.draft.desiredAt)) ? flow.draft.desiredAt : defaultScheduledTime(now()))} onFriends={() => setFriends(true)} />
      : <DishPreferencesScreen preferences={flow.preferences} catalogue={flow.data.catalogue} mealSlot={flow.draft.mealSlot} onChange={flow.changePreferences} onBack={back} onSave={flow.submitPreferences} busy={locked} submitDisabled={flow.blocked} notice={notice} noticeTone={noticeTone} editing={!!flow.data.ownRoomPreferences} extra={extra} />}
    {schedule ? <ScheduleSheet initial={schedule} initialCalendar={initialPanel === 'calendar'} now={now} onClose={() => setSchedule(undefined)} onConfirm={desiredAt => { mealGuard.guard({ ...flow.draft, desiredAt, timeMode: 'scheduled' }); setSchedule(undefined); }} /> : null}
    {mealGuard.dialog}
    {friends ? <SetupFriendsSheet friends={withPreviewFriends(flow.data.friends)} initial={flow.draft.inviteeIds} initialQuery={initialSearch} onClose={() => setFriends(false)} onConfirm={inviteeIds => { flow.change({ inviteeIds }); setFriends(false); }} /> : null}
    {discard ? <SetupConfirmDialog title={flow.stage === 'preferences' ? 'Bỏ thay đổi khẩu vị?' : 'Bỏ thiết lập phòng?'} message="Thay đổi chưa lưu sẽ bị mất." confirmLabel="Bỏ thay đổi" continueLabel={flow.stage === 'preferences' ? 'Tiếp tục chọn' : 'Tiếp tục thiết lập'} onContinue={() => setDiscard(false)} onConfirm={() => { setDiscard(false); if (flow.stage === 'preferences') { flow.discardPreferences(); if (flow.data?.canEditSettings === false && flow.editorReturn !== 'complete') onExit(); else flow.returnFromEditor(); } else { flow.reset(); if (flow.editorReturn === 'complete') flow.returnFromEditor(); else onExit(); } }} /> : null}
    {exitDialog}
    {flow.shortage ? <SetupShortageDialog available={flow.shortage.available} requested={flow.shortage.requested} onConfirmReduction={flow.confirmReduction} onEdit={flow.dismissShortage}
      onSchedule={() => { flow.dismissShortage(); setSchedule(flow.draft.timeMode === 'scheduled' && flow.draft.desiredAt && Number.isFinite(Date.parse(flow.draft.desiredAt)) ? flow.draft.desiredAt : defaultScheduledTime(now())); }} /> : null}
  </>;
}
