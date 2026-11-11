import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { DishPreferencesScreen } from '../../preferences/screens/DishPreferencesScreen';
import { DishSetupFrame } from '../components/DishSetupFrame';
import { ScheduleSheet } from '../components/ScheduleSheet';
import { withPreviewFriends } from '../services/previewFriends';
import { SetupFriendsSheet } from '../components/SetupFriendsSheet';
import { SetupShortageDialog } from '../components/SetupShortageDialog';
import { SetupConfirmDialog } from '../components/SetupConfirmDialog';
import { useDishSetupFlow } from '../hooks/useDishSetupFlow';
import type { DishSetupGateway } from '../services/dishSetupGateway';
import { defaultScheduledTime, type SetupRoom, type SetupStage } from '../services/dishSetup';
import { DishSetupScreen } from './DishSetupScreen';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

export function DishSetupFlow({ gateway, onExit, onLobby, controls, initialStage = 'setup', initialPanel, initialSchedule, initialSearch, requestId, now = Date.now }: {
  gateway: DishSetupGateway; onExit: () => void; onLobby?: (room: SetupRoom) => void; controls?: (locked: boolean, stage: SetupStage) => ReactNode;
  initialStage?: 'setup' | 'preferences'; initialPanel?: 'schedule' | 'calendar' | 'friends' | 'discard'; initialSchedule?: string; initialSearch?: string;
  requestId?: () => string; now?: () => number;
}) {
  const flow = useDishSetupFlow(gateway, requestId, now, initialStage), { colors } = useShellTheme();
  const [schedule, setSchedule] = useState<string | undefined>(initialPanel === 'schedule' || initialPanel === 'calendar' ? initialSchedule : undefined), [friends, setFriends] = useState(initialPanel === 'friends'), [discard, setDiscard] = useState(initialPanel === 'discard');
  const [confirmExit, setConfirmExit] = useState(false);
  const locked = flow.phase !== 'idle';
  // Saving preferences goes straight to the lobby instead of an intermediate 'saved' screen.
  const completedRoom = flow.stage === 'complete' ? flow.data?.room : undefined;
  useEffect(() => { if (completedRoom && completedRoom.state !== 'CLOSED' && onLobby) onLobby(completedRoom); }, [completedRoom, onLobby]);
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
    <StatusNotice title={flow.readError ? 'Chưa tải được thiết lập' : 'Đang tải các lựa chọn…'} colors={colors} actionLabel={flow.readError ? 'Thử tải lại' : undefined} onAction={() => { void flow.refresh(); }} />
  </DishSetupFrame>;
  if (flow.data.room?.state === 'CLOSED') return <DishSetupFrame title="Khẩu vị" onBack={onExit} footer={<><AppButton label="Về trang chủ" colors={colors} onPress={onExit} />{extra}</>}><StatusNotice title={flow.data.closedReason === 'cancelled' ? 'Phòng đã bị hủy' : 'Phòng đã đóng'} message={flow.data.closedReason === 'cancelled' ? 'Phòng đã kết thúc. Bạn có thể về trang chủ để tạo phòng khác.' : 'Phòng đã đóng. Thay đổi chưa được lưu.'} colors={colors} /></DishSetupFrame>;
  const exitDialog = confirmExit ? <SetupConfirmDialog title="Hủy phòng?" message={`Phòng ${flow.data.room?.code} đã được tạo. Hủy phòng để về trang chủ, hoặc ở lại để tiếp tục.`} confirmLabel="Xác nhận hủy phòng" continueLabel="Ở lại phòng" onConfirm={() => { setConfirmExit(false); flow.cancelRoom(); }} onContinue={() => setConfirmExit(false)} /> : null;
  if (flow.stage === 'complete') return <><DishSetupFrame title="Đã lưu khẩu vị" onBack={back} busy={locked} footer={<><AppButton label="Sửa khẩu vị" colors={colors} disabled={locked} onPress={flow.editPreferences} />{flow.data.canEditSettings ? <AppButton label="Sửa thiết lập" colors={colors} disabled={locked} variant="secondary" onPress={flow.editSettings} /> : null}{onLobby && flow.data.room ? <AppButton label="Mở phòng chờ" colors={colors} disabled={locked} onPress={() => onLobby(flow.data!.room!)} /> : <StatusNotice title="Đã hoàn tất thiết lập" message="Khẩu vị của bạn đã được lưu." colors={colors} />}<AppButton label={flow.data.canEditSettings ? "Hủy phòng" : "Về trang chủ"} colors={colors} disabled={locked} variant="secondary" onPress={leaveRoom} />{extra}</>}>
    <StatusNotice title={`Phòng ${flow.data.room?.code}`} message="Đã lưu khẩu vị của bạn. Vào phòng chờ để mời bạn bè hoặc chỉnh lại thiết lập." colors={colors} />
    {flow.notice ? <ToastNotice title={flow.notice} /> : null}
  </DishSetupFrame>{exitDialog}</>;
  const notice = flow.notice ?? (flow.data.connected ? undefined : 'Bạn đang ngoại tuyến. Nháp trên máy chưa đồng bộ.');
  return <>
    {flow.stage === 'setup' ? <DishSetupScreen friends={withPreviewFriends(flow.data.friends)} hasRecentHistory={flow.data.hasRecentHistory} draft={flow.draft} onChange={patch => { if (!locked && flow.data?.canEditSettings) flow.change(patch); }} onBack={back} onContinue={flow.submitSettings} busy={locked} readOnly={!flow.data.canEditSettings} submitDisabled={flow.blocked} notice={notice} extra={extra} now={now} onSchedule={() => setSchedule(flow.draft.timeMode === 'scheduled' && flow.draft.desiredAt && Number.isFinite(Date.parse(flow.draft.desiredAt)) ? flow.draft.desiredAt : defaultScheduledTime(now()))} onFriends={() => setFriends(true)} />
      : <DishPreferencesScreen preferences={flow.preferences} catalogue={flow.data.catalogue} onChange={flow.changePreferences} onBack={back} onSave={flow.submitPreferences} busy={locked} submitDisabled={flow.blocked} notice={notice} editing={!!flow.data.ownRoomPreferences} extra={extra} />}
    {schedule ? <ScheduleSheet initial={schedule} initialCalendar={initialPanel === 'calendar'} now={now} onClose={() => setSchedule(undefined)} onConfirm={desiredAt => { flow.change({ desiredAt, timeMode: 'scheduled' }); setSchedule(undefined); }} /> : null}
    {friends ? <SetupFriendsSheet friends={withPreviewFriends(flow.data.friends)} initial={flow.draft.inviteeIds} initialQuery={initialSearch} onClose={() => setFriends(false)} onConfirm={inviteeIds => { flow.change({ inviteeIds }); setFriends(false); }} /> : null}
    {discard ? <SetupConfirmDialog title={flow.stage === 'preferences' ? 'Bỏ thay đổi khẩu vị?' : 'Bỏ thiết lập phòng?'} message="Thay đổi chưa lưu sẽ bị mất." confirmLabel="Bỏ thay đổi" continueLabel={flow.stage === 'preferences' ? 'Tiếp tục chọn' : 'Tiếp tục thiết lập'} onContinue={() => setDiscard(false)} onConfirm={() => { setDiscard(false); if (flow.stage === 'preferences') { flow.discardPreferences(); if (flow.data?.canEditSettings === false && flow.editorReturn !== 'complete') onExit(); else flow.returnFromEditor(); } else { flow.reset(); if (flow.editorReturn === 'complete') flow.returnFromEditor(); else onExit(); } }} /> : null}
    {exitDialog}
    {flow.shortage ? <SetupShortageDialog available={flow.shortage.available} requested={flow.shortage.requested} onConfirmReduction={flow.confirmReduction} onEdit={flow.dismissShortage} /> : null}
  </>;
}
