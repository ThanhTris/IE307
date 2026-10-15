import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RoomSnapshot } from '../../../data/api/contracts';
import { AppButton, ContextSummary, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, useMockDemoApi, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void };
type OverlayState = 'connected' | 'offline' | 'reconnecting';

export function RoomStatusScreen({ onNavigate, onHome }: Props) {
  const { api, mode, setMode, revision, reload } = useMockDemoApi();
  const colors = useDemoColors();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [overlay, setOverlay] = useState<OverlayState>('connected');
  const [confirm, setConfirm] = useState<'leave' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestSequence = useRef(0);
  const loadKey = `${mode}:${revision}`;
  const loading = loadedKey !== loadKey;
  const currentErrorCode = loadedKey === loadKey ? errorCode : '';

  useEffect(() => {
    let active = true;
    void api.getRoomSnapshot('room_mock_001').then(result => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (result.ok) {
        setSnapshot(result.data);
        setErrorCode('');
        setOverlay('connected');
      } else {
        setSnapshot(null);
        setErrorCode(result.error.messageKey);
      }
    });
    return () => { active = false; };
  }, [api, loadKey]);

  const run = async (action: 'leave' | 'cancel') => {
    if (!snapshot || busy) return;
    setBusy(true);
    const requestId = `gm11-status-${action}-${++requestSequence.current}`;
    const result = action === 'cancel'
      ? await api.cancelRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, confirmCancel: true, requestId })
      : await api.leaveRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, requestId });
    setBusy(false);
    if (!result.ok) {
      setMessage(`Chưa thực hiện được · ${result.error.messageKey}`);
      return;
    }
    setSnapshot(current => current ? {
      ...current,
      state: action === 'cancel' ? 'CANCELLED' : current.state,
      version: result.version ?? current.version + 1,
      members: action === 'leave' ? current.members.slice(1) : current.members,
    } : current);
    setMessage(action === 'cancel' ? 'Phòng mock đã hủy.' : 'Đã rời phòng mock.');
  };

  const reconnect = () => {
    setOverlay('reconnecting');
    reload();
  };

  return (
    <DemoFrame title="Trạng thái phòng" subtitle="GM-11 · lỗi, mất mạng, hết hạn và xác nhận rời/hủy" active="room-status" onNavigate={onNavigate} onHome={onHome} mode={mode} onModeChange={setMode}>
      {loading && <StatusNotice title="Đang đồng bộ phòng mock…" message="Đang đọc snapshot từ adapter." tone="info" colors={colors} />}
      {!loading && currentErrorCode && <StatusNotice
        title={currentErrorCode === 'ROOM_EXPIRED' ? 'Phòng đã hết hạn' : currentErrorCode === 'VERSION_CONFLICT' ? 'Snapshot đã cũ' : 'Không tải được trạng thái phòng'}
        message={`${currentErrorCode}. Không tự chuyển sang mock thành công khác.`}
        tone={currentErrorCode === 'ROOM_EXPIRED' ? 'warning' : 'error'}
        actionLabel="Đọc lại trạng thái"
        onAction={reconnect}
        colors={colors}
      />}
      {!loading && !currentErrorCode && snapshot && overlay === 'offline' && <StatusNotice
        title="Mất kết nối · đang giữ snapshot gần nhất"
        message="Không tự phát lại thao tác phòng khi mất mạng. Bấm thử kết nối để lấy snapshot mới trước khi tiếp tục."
        tone="warning"
        actionLabel="Thử kết nối lại"
        onAction={reconnect}
        colors={colors}
      />}
      {!loading && !currentErrorCode && snapshot && overlay === 'reconnecting' && <StatusNotice title="Đang kết nối lại…" message="Đọc snapshot máy chủ trước khi cho thao tác tiếp." tone="info" colors={colors} />}
      {!loading && !currentErrorCode && snapshot && overlay === 'connected' && <>
        <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.eyebrow, { color: colors.muted }]}>MÃ PHÒNG MOCK · {snapshot.code}</Text>
          <Text accessibilityRole="header" style={[styles.state, { color: snapshot.state === 'CANCELLED' ? colors.danger : colors.primary }]}>{stateLabel(snapshot.state)}</Text>
          <Text style={[styles.meta, { color: colors.muted }]}>Phiên bản fixture {snapshot.version} · còn hiệu lực theo dữ liệu mẫu</Text>
        </View>
        <ContextSummary anchorName={snapshot.context.anchorName ?? 'Điểm ăn chung'} mealLabel="Bữa trưa" desiredAtLabel={snapshot.context.desiredAt} radiusLabel={`${snapshot.context.radiusM} m`} serviceModeLabel="Ăn tại quán" colors={colors} />
        {message ? <StatusNotice title="Kết quả thao tác mock" message={message} tone="success" colors={colors} /> : null}
        <AppButton label="Mô phỏng mất kết nối" variant="secondary" onPress={() => setOverlay('offline')} colors={colors} />
        <AppButton label="Xác nhận rời phòng" variant="danger" onPress={() => setConfirm('leave')} colors={colors} />
        <AppButton label="Xác nhận hủy phòng (host)" variant="danger" onPress={() => setConfirm('cancel')} colors={colors} />
      </>}
      <SheetDialog visible={confirm !== null} title={confirm === 'cancel' ? 'Hủy phòng mock?' : 'Rời phòng mock?'} onClose={() => setConfirm(null)} colors={colors}>
        <Text style={[styles.meta, { color: colors.text }]}>Cần xác nhận rõ. Thao tác chỉ thay đổi adapter trong bộ nhớ, không ảnh hưởng phòng thật.</Text>
        <AppButton label={confirm === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận rời'} variant="danger" disabled={!snapshot || snapshot.state !== 'LOBBY'} loading={busy} onPress={() => { const action = confirm; setConfirm(null); if (action) void run(action); }} colors={colors} />
      </SheetDialog>
    </DemoFrame>
  );
}

function stateLabel(state: RoomSnapshot['state']) {
  if (state === 'CANCELLED') return 'Đã hủy';
  if (state === 'EXPIRED') return 'Đã hết hạn';
  if (state === 'LOBBY') return 'Đang chờ thành viên';
  if (state === 'ROUND_1') return 'Đang chọn món · vòng 1';
  if (state === 'ROUND_2') return 'Đang chọn món · vòng 2';
  if (state === 'NO_CONSENSUS') return 'Chưa có đồng thuận';
  if (state === 'DECIDED' || state === 'FINALIZED' || state === 'COMPLETED') return 'Đã có kết quả';
  return 'Đang xử lý';
}

const styles = StyleSheet.create({
  stateCard: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 8 },
  eyebrow: { fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 0.5 },
  state: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  meta: { fontSize: 13, lineHeight: 19 },
});
