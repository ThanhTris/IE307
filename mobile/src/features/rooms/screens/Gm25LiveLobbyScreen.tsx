import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockApiClient, type ApiClient, type ErrorCode, type RoomSnapshot } from '../../../data/api';
import { AvatarRow, AppButton, AppHeader, ContextSummary, RoomCode, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, useMockDemoApi, type DemoDestination } from '../../shared/components/MockDemo';
import { errorCopy, mealLabels } from '../services/roomEntry';
import { createDurableRequestId } from '../services/roomRepository';

export type Gm25LiveLobbyScreenProps = {
  onNavigate?: (destination: DemoDestination) => void;
  onHome: () => void;
  mockClient?: MockApiClient;
  repository?: Pick<ApiClient, 'getRoomSnapshot' | 'setReady' | 'startRound' | 'updateContext' | 'leaveRoom' | 'cancelRoom' | 'inviteToRoom'> & {
    previewFoodPool?: ApiClient['previewFoodPool'];
  };
  roomId?: string;
  currentUserId?: string;
  createRequestId?: (action: string) => string;
  onStartRound?: (snapshot: RoomSnapshot) => void;
  onEditContext?: (snapshot: RoomSnapshot) => void;
};
type ConfirmAction = 'leave' | 'cancel' | null;

export function Gm25LiveLobbyScreen({ onNavigate, onHome, mockClient, repository, roomId, currentUserId, createRequestId, onStartRound, onEditContext }: Gm25LiveLobbyScreenProps) {
  const isReal = Boolean(repository);
  const mockApi = useMockDemoApi(mockClient);
  const colors = useDemoColors();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState<'host' | 'member'>('host');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [realRevision, setRealRevision] = useState(0);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const pendingIntentRef = useRef<{
    action: string;
    requestId: string;
    version: number;
    uncertain: boolean;
  } | null>(null);

  const activeRoomId = roomId ?? (isReal ? '' : 'room_mock_001');
  const loadKey = isReal ? `real:${activeRoomId}:${realRevision}` : `${mockApi.mode}:${mockApi.revision}`;
  const loading = loadedKey !== loadKey;
  const loadState = loading ? 'loading' : loadError ? 'error' : 'ready';

  const api = repository ?? mockApi.api;

  const checkEligibility = useCallback(async (snap: RoomSnapshot) => {
    if (!isReal || snap.state !== 'LOBBY') return;
    if (typeof (api as any).previewFoodPool === 'function') {
      try {
        const preview = await (api as any).previewFoodPool({
          anchorId: snap.context.anchorId,
          radiusM: snap.context.radiusM,
          desiredAt: snap.context.desiredAt,
          serviceMode: snap.context.serviceMode,
          mealSlot: snap.context.mealSlot,
          timeHint: snap.context.timeHint,
          budget: snap.context.budget,
        });
        if (!preview.ok) {
          setEligibilityError(preview.error.messageKey);
        } else if (preview.data.totalCandidateCount === 0 || preview.data.pool.length === 0) {
          setEligibilityError('NO_ELIGIBLE_FOOD');
        } else {
          setEligibilityError(null);
        }
      } catch {
        // Fall back to server enforcement on startRound
      }
    }
  }, [isReal, api]);

  useEffect(() => {
    let active = true;
    if (!activeRoomId) {
      void Promise.resolve().then(() => {
        if (!active) return;
        setLoadedKey(loadKey);
        setSnapshot(null);
        setLoadError('ROOM_NOT_FOUND');
      });
      return;
    }
    void api.getRoomSnapshot(activeRoomId).then(result => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (result.ok) {
        setSnapshot(result.data);
        setLoadError('');
        void checkEligibility(result.data);
      } else {
        setSnapshot(null);
        setLoadError(result.error.messageKey);
      }
    });
    return () => { active = false; };
  }, [api, activeRoomId, loadKey, checkEligibility]);

  const refreshSnapshot = async (targetId: string) => {
    if (!targetId) return;
    const result = await api.getRoomSnapshot(targetId);
    if (result.ok) {
      setSnapshot(result.data);
      void checkEligibility(result.data);
    } else {
      setNotice(`Không đọc lại được snapshot · ${result.error.messageKey}`);
    }
  };

  useEffect(() => {
    if (!isReal || !activeRoomId) return;
    const interval = setInterval(() => {
      if (!busyRef.current) {
        void api.getRoomSnapshot(activeRoomId).then(result => {
          if (result.ok) {
            setSnapshot(result.data);
            void checkEligibility(result.data);
          }
        });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isReal, activeRoomId, api, checkEligibility]);

  const getRequestId = (action: string, version: number) => {
    const pending = pendingIntentRef.current;
    if (pending && pending.action === action && pending.version === version && pending.uncertain) {
      return pending.requestId;
    }
    const nextId = createRequestId ? createRequestId(action) : createDurableRequestId(`lobby_${action}`);
    pendingIntentRef.current = { action, requestId: nextId, version, uncertain: false };
    return nextId;
  };

  const viewer = isReal
    ? (currentUserId ? snapshot?.members.find(member => member.userId === currentUserId) : undefined)
    : snapshot?.members.find(member => member.userId === (
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
    if (!snapshot || busyRef.current || isReal) return;
    const nextRole = role === 'host' ? 'member' : 'host';
    const nextMember = nextRole === 'host'
      ? snapshot.members.find(member => member.userId === snapshot.hostUserId)
      : snapshot.members.find(member => member.userId !== snapshot.hostUserId);
    if (!nextMember) {
      setNotice('Trong fixture không còn thành viên phù hợp với vai trò này.');
      return;
    }
    if ('setCurrentUser' in api && typeof (api as any).setCurrentUser === 'function') {
      (api as any).setCurrentUser({ id: nextMember.userId, displayName: nextMember.displayName, isGuest: true, createdAt: nextMember.joinedAt });
    }
    setRole(nextRole);
    setNotice(`Đang dùng danh tính mock ${nextMember.displayName}; adapter và trạng thái phòng được giữ nguyên.`);
  };

  const reload = () => {
    if (isReal) setRealRevision(v => v + 1);
    else mockApi.reload();
  };

  const runWrite = async (action: 'ready' | 'start' | 'context' | 'leave' | 'cancel' | 'invite') => {
    if (!snapshot || busyRef.current) return;
    if (isReal && (!currentUserId || !viewer)) return;
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    const requestId = getRequestId(action, snapshot.version);
    try {
      let result;
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
      if (!result.ok) {
        setNotice(`Chưa thực hiện được · ${result.error.messageKey}`);
        if (result.error.messageKey === 'TIMEOUT' || result.error.messageKey === 'NETWORK_ERROR') {
          if (pendingIntentRef.current) {
            pendingIntentRef.current.uncertain = true;
          }
        } else {
          pendingIntentRef.current = null;
        }
        if (result.error.messageKey === 'VERSION_CONFLICT' || result.error.messageKey === 'CONTEXT_CHANGED') {
          await refreshSnapshot(snapshot.roomId);
        }
        if (result.error.messageKey === 'NO_ELIGIBLE_FOOD' || result.error.messageKey === 'OUT_OF_COVERAGE') {
          setEligibilityError(result.error.messageKey);
        }
        return;
      }
      pendingIntentRef.current = null;
      if (action === 'ready') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(viewer?.ready
          ? (isReal ? 'Bạn đã tắt trạng thái sẵn sàng.' : 'Bạn đã tắt trạng thái sẵn sàng trong fixture.')
          : (isReal ? 'Đã ghi nhận bạn sẵn sàng.' : 'Đã ghi nhận bạn sẵn sàng trong fixture.'));
      } else if (action === 'context') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Bối cảnh đổi; trạng thái sẵn sàng của mọi người đã được đặt lại.');
      } else if (action === 'start') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(isReal ? 'Phòng chuyển sang vòng 1.' : 'Fixture chuyển sang vòng 1. Chưa có lượt gọi nghiệp vụ thật.');
        if (onStartRound && snapshot) onStartRound(snapshot);
      } else if (action === 'cancel') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(isReal ? 'Phòng đã hủy.' : 'Phòng mock đã hủy.');
        if (isReal) onHome();
      } else if (action === 'leave') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(isReal ? 'Bạn đã rời phòng.' : 'Bạn đã rời fixture này.');
        if (isReal) onHome();
      } else {
        setNotice(isReal ? 'Lời mời đã tạo.' : 'Lời mời mock đã tạo; người nhận chưa tham gia và chưa được đặt sẵn sàng.');
      }
    } catch {
      if (pendingIntentRef.current) {
        pendingIntentRef.current.uncertain = true;
      }
      setNotice(isReal
        ? 'Không hoàn tất được thao tác. Có thể thử lại khi đã tải được trạng thái mới.'
        : 'Không hoàn tất được thao tác fixture. Có thể thử lại khi đã tải được trạng thái mới.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const content = (
    <>
      {loadState === 'loading' && (
        <StatusNotice
          title={isReal ? 'Đang tải phòng…' : 'Đang tải phòng mock…'}
          message={isReal ? 'Chờ server trả trạng thái phòng.' : 'Chờ adapter trả fixture.'}
          tone="info"
          colors={colors}
        />
      )}
      {loadState === 'error' && (
        <StatusNotice
          title="Không tải được phòng"
          message={isReal ? `${errorCopy[loadError as ErrorCode] ?? loadError}` : `${loadError}. Không chuyển sang fixture khác.`}
          tone="error"
          actionLabel="Thử lại"
          onAction={reload}
          colors={colors}
        />
      )}
      {isReal && snapshot && loadState === 'ready' && !viewer ? <StatusNotice
        title={currentUserId ? 'Bạn không thuộc phòng này' : 'Chưa xác định được danh tính phiên'}
        message={currentUserId ? 'Tải phòng không xác nhận người dùng hiện tại là thành viên. Các thông tin và thao tác phòng đang bị khóa.' : 'Đang chờ phiên được khôi phục. Các thông tin và thao tác phòng đang bị khóa.'}
        tone="error"
        colors={colors}
      /> : null}
      {snapshot && loadState === 'ready' && (!isReal || Boolean(viewer)) && <>
        {!isReal && <AppButton label={`Đang xem vai trò: ${isHost ? 'Host' : 'Member'} · đổi vai trò`} variant="secondary" onPress={chooseRole} disabled={busy} colors={colors} />}
        <RoomCode code={snapshot.code} colors={colors} />
        {!isReal && <Text style={[styles.helper, { color: colors.muted }]}>Mã hiển thị là fixture; QR chưa được tạo và không thể tham gia phòng thật.</Text>}
        <ContextSummary
          anchorName={snapshot.context.anchorName ?? 'Điểm ăn chung'}
          mealLabel={mealLabels[snapshot.context.mealSlot] ?? 'Bữa trưa'}
          desiredAtLabel={snapshot.context.desiredAt}
          radiusLabel={`${snapshot.context.radiusM} m`}
          serviceModeLabel={snapshot.context.serviceMode === 'takeaway' ? 'Mang về' : 'Ăn tại quán'}
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
        {notice ? <StatusNotice title={isReal ? 'Cập nhật' : 'Cập nhật fixture'} message={notice} tone="success" colors={colors} /> : null}
        {eligibilityError ? (
          <StatusNotice
            title="Chưa thể bắt đầu"
            message={errorCopy[eligibilityError as ErrorCode] ?? 'Chưa có món phù hợp với bối cảnh. Hãy sửa điểm ăn hoặc giờ.'}
            tone="warning"
            colors={colors}
          />
        ) : null}
        <AppButton label="Tải lại phòng" variant="quiet" onPress={() => void refreshSnapshot(snapshot.roomId)} loading={busy} colors={colors} />
        {viewer ? <AppButton label={viewer.ready ? 'Tắt sẵn sàng' : 'Tôi sẵn sàng'} onPress={() => void runWrite('ready')} loading={busy} disabled={snapshot.state !== 'LOBBY'} colors={colors} /> : null}
        {isHost ? <AppButton label="Bắt đầu chọn món" onPress={() => void runWrite('start')} disabled={!everyoneReady || snapshot.state !== 'LOBBY' || Boolean(eligibilityError)} loading={busy} colors={colors} /> : null}
        {isHost && onEditContext ? <AppButton label="Chỉnh sửa bối cảnh" variant="secondary" onPress={() => onEditContext(snapshot)} disabled={snapshot.state !== 'LOBBY' || busy} colors={colors} /> : null}
        {isHost && !onEditContext && !isReal ? <AppButton label="Mô phỏng đổi bối cảnh · reset ready (Host)" variant="secondary" onPress={() => void runWrite('context')} disabled={snapshot.state !== 'LOBBY'} loading={busy} colors={colors} /> : null}
        {!isReal && <AppButton label="Mời thêm bạn (mock)" variant="secondary" onPress={() => void runWrite('invite')} loading={busy} colors={colors} />}
        {viewer && (isHost
          ? <AppButton label="Hủy phòng" variant="danger" onPress={() => setConfirm('cancel')} disabled={snapshot.state !== 'LOBBY'} colors={colors} />
          : <AppButton label="Rời phòng" variant="danger" onPress={() => setConfirm('leave')} disabled={snapshot.state !== 'LOBBY'} colors={colors} />)}
        <Text style={[styles.helper, { color: colors.muted }]}>
          {isReal
            ? 'Ready là thao tác chủ động. Chỉ host bắt đầu khi tất cả thành viên đã sẵn sàng.'
            : 'Ready là thao tác chủ động. Chỉ host bắt đầu khi tất cả thành viên trong fixture đã sẵn sàng.'}
        </Text>
      </>}
      <SheetDialog visible={confirm !== null} title={confirm === 'cancel' ? 'Xác nhận hủy phòng?' : 'Xác nhận rời phòng?'} onClose={() => setConfirm(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>{confirm === 'cancel' ? (isReal ? 'Bạn có chắc chắn muốn hủy phòng này không?' : 'Thao tác này chỉ hủy phòng mock trong bộ nhớ.') : (isReal ? 'Bạn có chắc chắn muốn rời phòng này không?' : 'Thao tác này chỉ rời phòng mock trong bộ nhớ.')}</Text>
        <AppButton label={confirm === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận rời'} variant="danger" onPress={() => { const action = confirm; setConfirm(null); if (action) void runWrite(action); }} colors={colors} />
      </SheetDialog>
    </>
  );

  if (isReal) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title="Phòng chờ" onPressBrand={busy ? undefined : onHome} colors={colors} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleGroup}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Phòng chờ</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Mọi người cùng sẵn sàng để bắt đầu chọn món</Text>
          </View>
          <View style={styles.screenContent}>{content}</View>
          <AppButton label="Về màn hình chính" variant="quiet" onPress={onHome} disabled={busy} colors={colors} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <DemoFrame title="Phòng chờ" subtitle="GM-11 · host/member, context và ready" active="lobby" onNavigate={destination => { if (!busyRef.current) onNavigate?.(destination); }} onHome={() => { if (!busyRef.current) onHome(); }} mode={mockApi.mode} onModeChange={nextMode => { if (!busyRef.current) mockApi.setMode(nextMode); }} controlsDisabled={busy}>
      {content}
    </DemoFrame>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  titleGroup: { gap: 4 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  screenContent: { gap: 16 },
  body: { fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  helper: { fontSize: 12, lineHeight: 18 },
  section: { gap: 9 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  memberRow: { minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
