import { useEffect, useState } from 'react';
import { BackHandler, Clipboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ErrorCode, Friend, RoomSnapshot } from '../../../data/api';
import { AppButton, AppHeader, ContextSummary, RoomCode, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { errorCopy, mealLabels } from '../services/roomEntry';
import { useLiveLobby, type LobbyRepository } from '../hooks/useLiveLobby';
import { LobbyMemberList } from '../components/LobbyMemberList';
import { LobbyActionButtons } from '../components/LobbyActionButtons';
import { RoomQrModal } from '../components/RoomQrModal';

export type LiveLobbyScreenProps = {
  onNavigate?: (path: string) => void;
  onHome: () => void;
  repository: LobbyRepository;
  roomId?: string;
  currentUserId?: string;
  createRequestId?: (action: string) => string;
  onStartRound?: (snapshot: RoomSnapshot) => void;
  onEditContext?: (snapshot: RoomSnapshot) => void;
};


export function LobbyScreen({
  onHome,
  repository,
  roomId,
  currentUserId,
  createRequestId,
  onStartRound,
  onEditContext,
}: LiveLobbyScreenProps) {
  const { colors } = useShellTheme();
  const [showQrModal, setShowQrModal] = useState(false);
  const lobby = useLiveLobby({
    repository,
    roomId,
    currentUserId,
    createRequestId,
    onStartRound,
    onHome,
  });

  const {
    snapshot,
    displaySnapshot,
    loadError,
    loadState,
    confirm,
    setConfirm,
    notice,
    busy,
    busyRef,
    eligibilityError,
    viewer,
    isHost,
    members,
    reload,
    refreshSnapshot,
    runWrite,
  } = lobby;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busyRef.current) return true;
      if (!snapshot || !viewer || snapshot.state !== 'LOBBY') return false;
      if (confirm) {
        setConfirm(null);
        return true;
      }
      setConfirm(isHost ? 'cancel' : 'leave');
      return true;
    });
    return () => subscription.remove();
  }, [busyRef, confirm, isHost, setConfirm, snapshot, viewer]);

  const content = (
    <>
      {loadState === 'loading' && (
        <StatusNotice
          title={'Đang tải phòng…'}
          message={'Chờ server trả trạng thái phòng.'}
          tone="info"
          colors={colors}
        />
      )}
      {loadState === 'error' && (
        <StatusNotice
          title="Không tải được phòng"
          message={`${errorCopy[loadError as ErrorCode] ?? loadError}`}
          tone="error"
          actionLabel="Thử lại"
          onAction={reload}
          colors={colors}
        />
      )}
      {snapshot && loadState === 'ready' && !viewer ? (
        <StatusNotice
          title={currentUserId ? 'Bạn không thuộc phòng này' : 'Chưa xác định được danh tính phiên'}
          message={currentUserId ? 'Tải phòng không xác nhận người dùng hiện tại là thành viên. Các thông tin và thao tác phòng đang bị khóa.' : 'Đang chờ phiên được khôi phục. Các thông tin và thao tác phòng đang bị khóa.'}
          tone="error"
          colors={colors}
        />
      ) : null}
      {snapshot && loadState === 'ready' && Boolean(viewer) && (
        <>
          <RoomCode code={snapshot.code} colors={colors} />
          <AppButton
            label="Mở mã QR phòng"
            variant="secondary"
            onPress={() => setShowQrModal(true)}
            disabled={busy}
            colors={colors}
          />
          <RoomQrModal
            visible={showQrModal}
            code={snapshot.code}
            onClose={() => setShowQrModal(false)}
            onCopyLink={async (link) => {
              Clipboard.setString(link);
            }}
          />
          {snapshot.context ? (
            <ContextSummary
              anchorName={snapshot.context.anchorName ?? 'Điểm ăn chung'}
              mealLabel={mealLabels[snapshot.context.mealSlot] ?? 'Bữa trưa'}
              desiredAtLabel={snapshot.context.desiredAt}
              radiusLabel={`${snapshot.context.radiusM} m`}
              serviceModeLabel={snapshot.context.serviceMode === 'takeaway' ? 'Mang về' : 'Ăn tại quán'}
              colors={colors}
            />
          ) : snapshot.settings ? (
            <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>THIẾT LẬP PHÒNG</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
                {snapshot.settings.mealSlot ? mealLabels[snapshot.settings.mealSlot] : 'Bữa ăn'} · {snapshot.dishCount ?? snapshot.settings.dishCount ?? snapshot.pool?.length ?? 15} món
              </Text>
              {snapshot.settings.desiredAt ? (
                <Text style={[styles.helper, { color: colors.muted }]}>Thời gian: {snapshot.settings.desiredAt}</Text>
              ) : null}
            </View>
          ) : null}
          <LobbyMemberList snapshot={displaySnapshot ?? snapshot} viewerUserId={viewer?.userId} members={members} colors={colors} />
          {notice ? <StatusNotice title={'Cập nhật'} message={notice} tone="success" colors={colors} /> : null}
          {eligibilityError ? (
            <StatusNotice
              title="Chưa thể bắt đầu"
              message={errorCopy[eligibilityError as ErrorCode] ?? 'Server chưa xác nhận được pool món để bắt đầu. Hãy kiểm tra thiết lập phòng rồi thử lại.'}
              tone="warning"
              colors={colors}
            />
          ) : null}
          <LobbyActionButtons
            snapshot={displaySnapshot ?? snapshot}
            viewer={viewer}
            isHost={isHost}
            busy={busy}
            eligibilityError={eligibilityError}
            onRefresh={() => void refreshSnapshot(snapshot.roomId)}
            onRunWrite={action => void runWrite(action)}
            onEditContext={onEditContext}
            onConfirm={setConfirm}
            colors={colors}
          />
          {isHost && snapshot.state === 'LOBBY' ? <RoomInvitePicker
            repository={repository}
            snapshot={snapshot}
            busy={busy}
            colors={colors}
            onInvite={partnerId => { void lobby.runWrite('invite', partnerId); }}
          /> : null}
        </>
      )}
      <SheetDialog visible={confirm !== null} title={confirm === 'cancel' ? 'Xác nhận hủy phòng?' : 'Xác nhận rời phòng?'} onClose={() => setConfirm(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>{confirm === 'cancel' ? ('Bạn có chắc chắn muốn hủy phòng này không?') : ('Bạn có chắc chắn muốn rời phòng này không?')}</Text>
        <AppButton label={confirm === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận rời'} variant="danger" onPress={() => { const action = confirm; setConfirm(null); if (action) void runWrite(action); }} colors={colors} />
      </SheetDialog>
    </>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Phòng chờ" onPressBrand={busy ? undefined : onHome} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleGroup}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Phòng chờ</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Chủ phòng có thể bắt đầu khi thiết lập đã hoàn tất</Text>
        </View>
        <View style={styles.screenContent}>{content}</View>
        <AppButton label="Về màn hình chính" variant="quiet" onPress={onHome} disabled={busy} colors={colors} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RoomInvitePicker({ repository, snapshot, busy, colors, onInvite }: {
  repository?: LobbyRepository;
  snapshot: RoomSnapshot;
  busy: boolean;
  colors: ReturnType<typeof useShellTheme>['colors'];
  onInvite: (partnerId: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    if (!repository) return;
    setLoading(true); setError('');
    const result = await repository.listFriends();
    if (result.ok) setFriends(result.data);
    else setError(result.error.messageKey);
    setLoading(false);
  };
  const existing = new Set(snapshot.members.map(member => member.userId));
  const eligibleFriends = friends.filter(friend => !existing.has(friend.friendUserId));
  return <>
    <AppButton label="Mời bạn bè vào phòng" variant="secondary" onPress={() => { setVisible(true); void load(); }} disabled={busy || snapshot.members.length >= 20} colors={colors} />
    <SheetDialog visible={visible} title="Chọn bạn bè để mời" onClose={() => { if (!busy) setVisible(false); }} colors={colors}>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>Lời mời dùng danh tính bạn bè và phiên bản phòng hiện tại. Người nhận tự quyết định chấp nhận.</Text>
      {loading ? <StatusNotice title="Đang tải bạn bè" message="Đang lấy danh sách bạn bè từ máy chủ." tone="info" colors={colors} /> : null}
      {error ? <StatusNotice title="Không tải được bạn bè" message={errorCopy[error as ErrorCode] ?? error} tone="error" actionLabel="Tải lại" onAction={() => { void load(); }} colors={colors} /> : null}
      {!loading && !error && eligibleFriends.length === 0 ? <StatusNotice title="Chưa có bạn phù hợp" message={snapshot.members.length >= 20 ? 'Phòng đã đủ 20 thành viên.' : 'Bạn bè hiện có đã ở trong phòng.'} tone="info" colors={colors} /> : null}
      {!loading && !error ? eligibleFriends.map(friend => <View key={friend.id} style={[styles.friendInvite, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{friend.displayName}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{friend.friendCode}</Text>
        </View>
        <AppButton label={`Mời ${friend.displayName}`} onPress={() => { setVisible(false); onInvite(friend.friendUserId); }} disabled={busy || snapshot.members.length >= 20} colors={colors} />
      </View>) : null}
    </SheetDialog>
  </>;
}


const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  titleGroup: { gap: 4 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  screenContent: { gap: 16 },
  body: { fontSize: 14, lineHeight: 20 },
  helper: { fontSize: 12, lineHeight: 18 },
  demoRoster: { gap: 8 },
  demoRosterLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  demoRosterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  demoRosterButton: { minWidth: 48, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  demoRosterButtonText: { fontSize: 15, fontWeight: '700' },
  demoRosterPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  friendInvite: { padding: 10, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.45 },
});
