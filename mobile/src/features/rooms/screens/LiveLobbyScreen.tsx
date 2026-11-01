import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockApiClient, type ErrorCode, type RoomSnapshot } from '../../../data/api';
import { AppButton, AppHeader, ContextSummary, RoomCode, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, type DemoDestination } from '../../shared/components/MockDemo';
import { errorCopy, mealLabels } from '../services/roomEntry';
import { useLiveLobby, type LobbyRepository } from '../hooks/useLiveLobby';
import { LobbyMemberList } from '../components/LobbyMemberList';
import { LobbyActionButtons } from '../components/LobbyActionButtons';

export type LiveLobbyScreenProps = {
  onNavigate?: (destination: DemoDestination) => void;
  onHome: () => void;
  mockClient?: MockApiClient;
  repository?: LobbyRepository;
  roomId?: string;
  currentUserId?: string;
  createRequestId?: (action: string) => string;
  onStartRound?: (snapshot: RoomSnapshot) => void;
  onEditContext?: (snapshot: RoomSnapshot) => void;
};


export function LiveLobbyScreen({
  onNavigate,
  onHome,
  mockClient,
  repository,
  roomId,
  currentUserId,
  createRequestId,
  onStartRound,
  onEditContext,
}: LiveLobbyScreenProps) {
  const colors = useDemoColors();
  const lobby = useLiveLobby({
    mockClient,
    repository,
    roomId,
    currentUserId,
    createRequestId,
    onStartRound,
    onHome,
  });

  const {
    isReal,
    mockApi,
    snapshot,
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
    everyoneReady,
    chooseRole,
    reload,
    refreshSnapshot,
    runWrite,
  } = lobby;

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
      {isReal && snapshot && loadState === 'ready' && !viewer ? (
        <StatusNotice
          title={currentUserId ? 'Bạn không thuộc phòng này' : 'Chưa xác định được danh tính phiên'}
          message={currentUserId ? 'Tải phòng không xác nhận người dùng hiện tại là thành viên. Các thông tin và thao tác phòng đang bị khóa.' : 'Đang chờ phiên được khôi phục. Các thông tin và thao tác phòng đang bị khóa.'}
          tone="error"
          colors={colors}
        />
      ) : null}
      {snapshot && loadState === 'ready' && (!isReal || Boolean(viewer)) && (
        <>
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
          <LobbyMemberList snapshot={snapshot} viewerUserId={viewer?.userId} members={members} colors={colors} />
          {notice ? <StatusNotice title={isReal ? 'Cập nhật' : 'Cập nhật fixture'} message={notice} tone="success" colors={colors} /> : null}
          {eligibilityError ? (
            <StatusNotice
              title="Chưa thể bắt đầu"
              message={errorCopy[eligibilityError as ErrorCode] ?? 'Chưa có món phù hợp với bối cảnh. Hãy sửa điểm ăn hoặc giờ.'}
              tone="warning"
              colors={colors}
            />
          ) : null}
          <LobbyActionButtons
            isReal={isReal}
            snapshot={snapshot}
            viewer={viewer}
            isHost={isHost}
            everyoneReady={everyoneReady}
            busy={busy}
            eligibilityError={eligibilityError}
            onRefresh={() => void refreshSnapshot(snapshot.roomId)}
            onRunWrite={action => void runWrite(action)}
            onEditContext={onEditContext}
            onConfirm={setConfirm}
            colors={colors}
          />
        </>
      )}
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
    <DemoFrame
      title="Phòng chờ"
      subtitle="GM-11 · host/member, context và ready"
      active="lobby"
      onNavigate={destination => { if (!busyRef.current) onNavigate?.(destination); }}
      onHome={() => { if (!busyRef.current) onHome(); }}
      mode={mockApi.mode}
      onModeChange={nextMode => { if (!busyRef.current) mockApi.setMode(nextMode); }}
      controlsDisabled={busy}
    >
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
  helper: { fontSize: 12, lineHeight: 18 },
});
