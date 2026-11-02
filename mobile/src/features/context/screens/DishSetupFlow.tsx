import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, InsufficientDishes, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DishPreferencesScreen } from '../../preferences/screens/DishPreferencesScreen';
import { DishSetupFrame } from '../components/DishSetupFrame';
import { ScheduleSheet } from '../components/ScheduleSheet';
import { SetupFriendsSheet } from '../components/SetupFriendsSheet';
import { useDishSetupFlow } from '../hooks/useDishSetupFlow';
import type { DishSetupGateway } from '../services/dishSetupGateway';
import type { SetupRoom } from '../services/dishSetup';
import { DishSetupScreen } from './DishSetupScreen';

export function DishSetupFlow({ gateway, onExit, onLobby, controls }: {
  gateway: DishSetupGateway; onExit: () => void; onLobby?: (room: SetupRoom) => void; controls?: (locked: boolean) => ReactNode;
}) {
  const flow = useDishSetupFlow(gateway), { colors } = useShellTheme();
  const [schedule, setSchedule] = useState<string>(), [friends, setFriends] = useState(false), [discard, setDiscard] = useState(false);
  const locked = flow.phase !== 'idle';
  const back = () => {
    if (locked) return;
    if (flow.stage === 'preferences') { if (flow.preferencesDirty) setDiscard(true); else flow.changeStage('setup'); }
    else if (flow.dirty) setDiscard(true); else onExit();
  };
  const extra = <View style={{ gap: 12 }}>
    {flow.phase === 'unknown' || flow.phase === 'ack-read' ? <AppButton label={flow.phase === 'ack-read' ? 'Đọc lại trạng thái đã lưu' : 'Thử lại cùng yêu cầu'} colors={colors} onPress={flow.retry} /> : null}
    {flow.needsRefresh || flow.data?.connected === false ? <AppButton label="Tải lại trạng thái" colors={colors} disabled={locked} onPress={() => { void flow.refresh(); }} /> : null}
    {controls?.(locked)}
  </View>;
  if (!flow.data) return <DishSetupFrame title="Thiết lập phòng" onBack={onExit} busy={locked} footer={extra}>
    <StatusNotice title={flow.readError ? 'Chưa tải được thiết lập' : 'Đang tải thiết lập…'} colors={colors} actionLabel={flow.readError ? 'Thử tải lại' : undefined} onAction={() => { void flow.refresh(); }} />
  </DishSetupFrame>;
  if (flow.data.room?.state === 'CLOSED') return <DishSetupFrame title="Khẩu vị" onBack={onExit} footer={<><AppButton label="Về trang chủ" colors={colors} onPress={onExit} />{extra}</>}><StatusNotice title="Phòng đã đóng" message="Không thể tiếp tục chỉnh sửa phòng này." colors={colors} /></DishSetupFrame>;
  if (flow.stage === 'complete') return <DishSetupFrame title="Đã lưu khẩu vị" onBack={onExit} footer={<><AppButton label="Sửa khẩu vị" colors={colors} onPress={() => flow.changeStage('preferences')} /><AppButton label="Sửa thiết lập" colors={colors} variant="secondary" onPress={() => flow.changeStage('setup')} />{onLobby && flow.data.room ? <AppButton label="Mở phòng chờ" colors={colors} onPress={() => onLobby(flow.data!.room!)} /> : <StatusNotice title="Đã hoàn tất thiết lập mẫu" message="Callback phòng chờ chờ consumer tích hợp; chưa tạo phòng thật hoặc gửi lời mời thật." colors={colors} />}<AppButton label="Về trang chủ" colors={colors} variant="secondary" onPress={onExit} />{extra}</>}>
    <StatusNotice title={`Phòng mẫu ${flow.data.room?.code}`} message={`Đã nhận xác nhận và trạng thái phiên bản ${flow.data.room?.version}.`} colors={colors} />
  </DishSetupFrame>;
  const notice = flow.notice ?? (flow.data.connected ? undefined : 'Bạn đang ngoại tuyến. Nháp trên máy chưa đồng bộ.');
  return <>
    {flow.stage === 'setup' ? <DishSetupScreen draft={flow.draft} onChange={patch => { if (!locked) flow.change(patch); }} onBack={back} onContinue={flow.submitSettings} busy={locked} submitDisabled={flow.blocked} notice={notice} extra={extra} onSchedule={() => setSchedule(flow.draft.desiredAt ?? new Date(Date.now() + 900000).toISOString())} onFriends={() => setFriends(true)} />
      : <DishPreferencesScreen preferences={flow.preferences} catalogue={flow.data.catalogue} onChange={flow.changePreferences} onBack={back} onSave={flow.submitPreferences} busy={locked} submitDisabled={flow.blocked} notice={notice} editing={!!flow.data.ownRoomPreferences} extra={extra} />}
    {schedule ? <ScheduleSheet initial={schedule} now={Date.now} onClose={() => setSchedule(undefined)} onConfirm={desiredAt => { flow.change({ desiredAt, timeMode: 'scheduled' }); setSchedule(undefined); }} /> : null}
    {friends ? <SetupFriendsSheet friends={flow.data.friends} initial={flow.draft.inviteeIds} onClose={() => setFriends(false)} onConfirm={inviteeIds => { flow.change({ inviteeIds }); setFriends(false); }} /> : null}
    <SheetDialog visible={discard} title={flow.stage === 'preferences' ? 'Bỏ thay đổi khẩu vị?' : 'Bỏ thiết lập phòng?'} colors={colors} onClose={() => setDiscard(false)}><Text style={{ color: colors.text }}>Thay đổi chưa lưu sẽ bị mất.</Text><AppButton label="Bỏ thay đổi" colors={colors} onPress={() => { setDiscard(false); if (flow.stage === 'preferences') { flow.discardPreferences(); flow.changeStage('setup'); } else { flow.reset(); onExit(); } }} /><AppButton label="Tiếp tục chỉnh sửa" variant="secondary" colors={colors} onPress={() => setDiscard(false)} /></SheetDialog>
    <SheetDialog visible={!!flow.shortage} title="Số món phù hợp" onClose={flow.dismissShortage} colors={colors}>{flow.shortage ? <><Text style={{ color: colors.text }}>{`Bạn đang chọn ${flow.shortage.requested} món.`}</Text><InsufficientDishes mode={flow.shortage.available >= 10 ? 'can-reduce' : 'below-minimum'} count={flow.shortage.available} onReduce={flow.shortage.available >= 10 ? flow.confirmReduction : undefined} onEdit={flow.dismissShortage} onBack={flow.dismissShortage} colors={colors} /></> : null}</SheetDialog>
  </>;
}
