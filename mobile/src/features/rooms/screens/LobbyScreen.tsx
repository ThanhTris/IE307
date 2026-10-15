import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MockApiClient, type RoomSnapshot } from '../../../data/api';
import { AvatarRow, AppButton, ContextSummary, RoomCode, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, useMockDemoApi, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void; mockClient?: MockApiClient };
type ConfirmAction = 'leave' | 'cancel' | null;

export function LobbyScreen({ onNavigate, onHome, mockClient }: Props) {
  const { api, mode, setMode, revision, reload } = useMockDemoApi(mockClient);
  const colors = useDemoColors();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState<'host' | 'member'>('host');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const requestSequence = useRef(0);
  const loadKey = `${mode}:${revision}`;
  const loading = loadedKey !== loadKey;
  const loadState = loading ? 'loading' : loadError ? 'error' : 'ready';

  useEffect(() => {
    let active = true;
    void api.getRoomSnapshot('room_mock_001').then(result => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (result.ok) {
        setSnapshot(result.data);
        setLoadError('');
      } else {
        setSnapshot(null);
        setLoadError(result.error.messageKey);
      }
    });
    return () => { active = false; };
  }, [api, loadKey]);

  const nextRequestId = (action: string) => `gm11-${action}-${++requestSequence.current}`;
  const viewer = snapshot?.members.find(member => member.userId === (
    role === 'host' ? snapshot.hostUserId : snapshot.members.find(candidate => candidate.userId !== snapshot.hostUserId)?.userId
  ));
  const isHost = Boolean(viewer && snapshot?.hostUserId === viewer.userId);
  const members = snapshot?.members.map(member => ({
    id: member.userId,
    label: member.userId === snapshot.hostUserId ? `${member.displayName} · Host` : member.displayName,
    initial: member.displayName.slice(0, 1),
    status: member.ready ? 'online' as const : 'idle' as const,
  })) ?? [];
  const everyoneReady = Boolean(snapshot?.members.length && snapshot.members.every(member => member.ready));

  const chooseRole = () => {
    if (!snapshot) return;
    const nextRole = role === 'host' ? 'member' : 'host';
    const nextMember = nextRole === 'host'
      ? snapshot.members.find(member => member.userId === snapshot.hostUserId)
      : snapshot.members.find(member => member.userId !== snapshot.hostUserId);
    if (!nextMember) {
      setNotice('Trong fixture không còn thành viên phù hợp với vai trò này.');
      return;
    }
    api.setCurrentUser({ id: nextMember.userId, displayName: nextMember.displayName, isGuest: true, createdAt: nextMember.joinedAt });
    setRole(nextRole);
    setNotice(`Đang dùng danh tính mock ${nextMember.displayName}; adapter và trạng thái phòng được giữ nguyên.`);
  };

  const refreshSnapshot = async (roomId: string) => {
    const result = await api.getRoomSnapshot(roomId);
    if (result.ok) setSnapshot(result.data);
    else setNotice(`Không đọc lại được snapshot mock · ${result.error.messageKey}`);
  };

  const runWrite = async (action: 'ready' | 'start' | 'context' | 'leave' | 'cancel' | 'invite') => {
    if (!snapshot || busy) return;
    setBusy(true);
    setNotice('');
    let result;
    const requestId = nextRequestId(action);
    if (action === 'ready') {
      result = await api.setReady({ roomId: snapshot.roomId, expectedVersion: snapshot.version, ready: !viewer?.ready, requestId });
    } else if (action === 'start') {
      result = await api.startRound({ roomId: snapshot.roomId, expectedVersion: snapshot.version, requestId });
    } else if (action === 'context') {
      result = await api.updateContext({ roomId: snapshot.roomId, expectedVersion: snapshot.version, context: { ...snapshot.context, budget: snapshot.context.budget === 70000 ? 80000 : 70000 }, requestId });
    } else if (action === 'leave') {
      result = await api.leaveRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, requestId });
    } else if (action === 'cancel') {
      result = await api.cancelRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, confirmCancel: true, requestId });
    } else {
      result = await api.inviteToRoom({ roomId: snapshot.roomId, partnerId: 'usr_tuan_002', expectedVersion: snapshot.version, requestId });
    }
    setBusy(false);
    if (!result.ok) {
      setNotice(`Chưa thực hiện được · ${result.error.messageKey}`);
      return;
    }
    if (action === 'ready') {
      await refreshSnapshot(snapshot.roomId);
      setNotice(viewer?.ready ? 'Bạn đã tắt trạng thái sẵn sàng.' : 'Đã ghi nhận bạn sẵn sàng trong fixture.');
    } else if (action === 'context') {
      await refreshSnapshot(snapshot.roomId);
      setNotice('Bối cảnh đổi; trạng thái sẵn sàng của mọi người đã được đặt lại.');
    } else if (action === 'start') {
      await refreshSnapshot(snapshot.roomId);
      setNotice('Fixture chuyển sang vòng 1. Chưa có lượt gọi nghiệp vụ thật.');
    } else if (action === 'cancel') {
      await refreshSnapshot(snapshot.roomId);
      setNotice('Phòng mock đã hủy.');
    } else if (action === 'leave') {
      await refreshSnapshot(snapshot.roomId);
      setNotice('Bạn đã rời fixture này.');
    } else {
      setNotice('Lời mời mock đã tạo; người nhận chưa tham gia và chưa được đặt sẵn sàng.');
    }
  };

  return (
    <DemoFrame title="Phòng chờ" subtitle="GM-11 · host/member, context và ready" active="lobby" onNavigate={onNavigate} onHome={onHome} mode={mode} onModeChange={setMode}>
      {loadState === 'loading' && <StatusNotice title="Đang tải phòng mock…" message="Chờ adapter trả fixture." tone="info" colors={colors} />}
      {loadState === 'error' && <StatusNotice title="Không tải được phòng" message={`${loadError}. Không chuyển sang fixture khác.`} tone="error" actionLabel="Thử lại" onAction={reload} colors={colors} />}
      {snapshot && loadState === 'ready' && <>
        <AppButton label={`Đang xem vai trò: ${isHost ? 'Host' : 'Member'} · đổi vai trò`} variant="secondary" onPress={chooseRole} colors={colors} />
        <RoomCode code={snapshot.code} colors={colors} />
        <Text style={[styles.helper, { color: colors.muted }]}>Mã hiển thị là fixture; QR chưa được tạo và không thể tham gia phòng thật.</Text>
        <ContextSummary
          anchorName={snapshot.context.anchorName ?? 'Điểm ăn chung'}
          mealLabel="Bữa trưa"
          desiredAtLabel={snapshot.context.desiredAt}
          radiusLabel={`${snapshot.context.radiusM} m`}
          serviceModeLabel="Ăn tại quán"
          colors={colors}
        />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Thành viên · {snapshot.members.length}/8</Text>
          <AvatarRow items={members} colors={colors} />
          {snapshot.members.map(member => (
            <View key={member.userId} style={[styles.memberRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.bodyStrong, { color: colors.text }]}>{member.displayName}{member.userId === snapshot.hostUserId ? ' · Host' : ''}{member.userId === viewer?.userId ? ' · Bạn' : ''}</Text>
              <Text style={[styles.helper, { color: member.ready ? colors.green : colors.warning }]}>{member.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</Text>
            </View>
          ))}
        </View>
        {notice ? <StatusNotice title="Cập nhật fixture" message={notice} tone="success" colors={colors} /> : null}
        {viewer ? <AppButton label={viewer.ready ? 'Tắt sẵn sàng' : 'Tôi sẵn sàng'} onPress={() => void runWrite('ready')} loading={busy} disabled={snapshot.state !== 'LOBBY'} colors={colors} /> : null}
        {isHost ? <AppButton label="Bắt đầu chọn món" onPress={() => void runWrite('start')} disabled={!everyoneReady || snapshot.state !== 'LOBBY'} loading={busy} colors={colors} /> : null}
        {isHost ? <AppButton label="Mô phỏng đổi bối cảnh · reset ready (Host)" variant="secondary" onPress={() => void runWrite('context')} disabled={snapshot.state !== 'LOBBY'} loading={busy} colors={colors} /> : null}
        <AppButton label="Mời thêm bạn (mock)" variant="secondary" onPress={() => void runWrite('invite')} loading={busy} colors={colors} />
        {viewer && (isHost
          ? <AppButton label="Hủy phòng" variant="danger" onPress={() => setConfirm('cancel')} disabled={snapshot.state !== 'LOBBY'} colors={colors} />
          : <AppButton label="Rời phòng" variant="danger" onPress={() => setConfirm('leave')} disabled={snapshot.state !== 'LOBBY'} colors={colors} />)}
        <Text style={[styles.helper, { color: colors.muted }]}>Ready là thao tác chủ động. Chỉ host bắt đầu khi tất cả thành viên trong fixture đã sẵn sàng.</Text>
      </>}
      <SheetDialog visible={confirm !== null} title={confirm === 'cancel' ? 'Xác nhận hủy phòng?' : 'Xác nhận rời phòng?'} onClose={() => setConfirm(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>{confirm === 'cancel' ? 'Thao tác này chỉ hủy phòng mock trong bộ nhớ.' : 'Thao tác này chỉ rời phòng mock trong bộ nhớ.'}</Text>
        <AppButton label={confirm === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận rời'} variant="danger" onPress={() => { const action = confirm; setConfirm(null); if (action) void runWrite(action); }} colors={colors} />
      </SheetDialog>
    </DemoFrame>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  helper: { fontSize: 12, lineHeight: 18 },
  section: { gap: 9 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  memberRow: { minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
