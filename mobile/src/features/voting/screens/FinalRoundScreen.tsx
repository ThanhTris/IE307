import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type ApiClient,
  type PoolDish,
  type RoomResult,
} from '../../../data/api';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  AppButton,
  AppHeader,
  SheetDialog,
} from '../../../shared/ui';
import {
  FIXTURE_ROUND_TWO_CANDIDATES,
  type FinalScreenScenario,
} from '../fixtures';
import type { VoteRepository } from '../services/voteRepository';
import { useRoundTwoVoting, type FinalChoice } from '../hooks/useRoundTwoVoting';
import { FinalRoundHeaderAndOutcome } from '../components/FinalRoundHeaderAndOutcome';
import { CandidateKeepRemoveCard } from '../components/CandidateKeepRemoveCard';

export type FinalRoundScreenProps = {
  candidates?: PoolDish[];
  roomId?: string;
  initialChoices?: Record<string, FinalChoice>;
  api?: ApiClient;
  repository?: VoteRepository;
  initialScenario?: FinalScreenScenario;
  initialResult?: RoomResult | null;
  simulateError?: boolean;
  simulateDelayMs?: number;
  showScenarioPicker?: boolean;
  initialIsHost?: boolean;
  enforceCap?: boolean;
  onFinish?: () => void;
  onBack?: () => void;
};

export function FinalRoundScreen({
  candidates = FIXTURE_ROUND_TWO_CANDIDATES,
  roomId = 'room_demo_gm12',
  initialChoices,
  api,
  repository,
  initialScenario = 'consensus',
  initialResult = null,
  simulateError = false,
  simulateDelayMs = 400,
  showScenarioPicker = true,
  initialIsHost = true,
  enforceCap = true,
  onFinish,
  onBack,
}: FinalRoundScreenProps) {
  const { colors } = useShellTheme();
  const {
    choices,
    scenario,
    setScenario,
    submissionState,
    confirmModalVisible,
    setConfirmModalVisible,
    errorMessage,
    capNotice,
    receipt,
    result,
    isWaitingForMembers,
    eliminationCap,
    keptCount,
    removedCount,
    allRemoved,
    isLocked,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    handleHostEarlyFinish,
    handleToggleChoice,
    handleSetAllKeep,
    handleSubmit,
  } = useRoundTwoVoting({
    candidates,
    roomId,
    initialChoices,
    api,
    repository,
    initialScenario,
    initialResult,
    simulateError,
    simulateDelayMs,
    initialIsHost,
    enforceCap,
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bình chọn · Vòng 2" onPressBrand={onBack} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <FinalRoundHeaderAndOutcome
          showScenarioPicker={showScenarioPicker}
          submissionState={submissionState}
          scenario={scenario}
          setScenario={setScenario}
          receipt={receipt}
          candidatesLength={candidates.length}
          isWaitingForMembers={isWaitingForMembers}
          result={result}
          errorMessage={errorMessage}
          eliminationCap={eliminationCap}
          removedCount={removedCount}
          capNotice={capNotice}
          waitingCountdown={waitingCountdown}
          isHost={isHost}
          setIsHost={setIsHost}
          rosterAcknowledgedCount={rosterAcknowledgedCount}
          setRosterAcknowledgedCount={setRosterAcknowledgedCount}
          totalRosterCount={totalRosterCount}
          canHostEarlyFinish={canHostEarlyFinish}
          onHostEarlyFinish={handleHostEarlyFinish}
          onFinish={onFinish}
          onRetryConsensus={() => {
            setScenario('consensus');
            void handleSubmit('consensus');
          }}
          colors={colors}
        />

        <View style={styles.batchActionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn giữ tất cả"
            accessibilityState={{ disabled: isLocked }}
            onPress={handleSetAllKeep}
            disabled={isLocked}
            style={[
              styles.batchButton,
              {
                borderColor: colors.primary,
                backgroundColor: colors.soft,
                opacity: isLocked ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.batchButtonText, { color: colors.primary }]}>
              ✓ Giữ tất cả ({candidates.length} món)
            </Text>
          </Pressable>

          <View style={[styles.capIndicator, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.capIndicatorText, { color: colors.muted }]}>
              Giới hạn loại: tối đa {eliminationCap} món (Cap 30%)
            </Text>
          </View>
        </View>

        <View style={styles.candidateList}>
          {candidates.map((dish, index) => (
            <CandidateKeepRemoveCard
              key={dish.roundDishId}
              dish={dish}
              index={index}
              currentChoice={choices[dish.roundDishId] || 'KEEP'}
              isLocked={isLocked}
              canRemove={!enforceCap || removedCount < eliminationCap}
              onToggleChoice={handleToggleChoice}
              colors={colors}
            />
          ))}
        </View>

        <View style={styles.submitSection}>
          <Text style={[styles.submitHint, { color: colors.muted }]}>
            {submissionState === 'ack'
              ? 'Lựa chọn Vòng 2 đã được nộp và ghi nhận trên hệ thống.'
              : allRemoved
              ? `Bạn đang chọn LOẠI TẤT CẢ các món (${removedCount}/${candidates.length}). Nhấn bên dưới để xác nhận.`
              : `Bạn đang giữ ${keptCount} món và loại ${removedCount}/${eliminationCap} món. Nhấn bên dưới để xác nhận.`}
          </Text>

          <AppButton
            label={
              submissionState === 'pending'
                ? 'Đang gửi phiếu Vòng 2…'
                : submissionState === 'ack'
                ? 'Đã nộp phiếu Vòng 2 (Đã xác nhận)'
                : submissionState === 'error'
                ? 'Thử lại nộp phiếu Vòng 2'
                : 'Xác nhận nộp Vòng 2'
            }
            disabled={isLocked}
            loading={submissionState === 'pending'}
            onPress={() => {
              if (submissionState === 'error') {
                void handleSubmit('consensus');
              } else {
                setConfirmModalVisible(true);
              }
            }}
            colors={colors}
          />
        </View>

        {onBack ? (
          <AppButton label="Quay lại Vòng 1" variant="quiet" onPress={onBack} colors={colors} />
        ) : null}
      </ScrollView>

      {/* Confirmation SheetDialog */}
      <SheetDialog
        visible={confirmModalVisible}
        title="Xác nhận nộp phiếu Vòng 2"
        onClose={() => setConfirmModalVisible(false)}
        colors={colors}
      >
        <View style={styles.modalBody}>
          <Text style={[styles.modalText, { color: colors.text }]}>
            Bạn đã chọn:
          </Text>
          <View style={styles.modalSummaryBox}>
            <Text style={[styles.summaryItem, { color: colors.primary }]}>
              ✓ Giữ lại: <Text style={{ fontWeight: '800' }}>{keptCount}</Text> món
            </Text>
            <Text style={[styles.summaryItem, { color: colors.danger }]}>
              ✕ Đã loại: <Text style={{ fontWeight: '800' }}>{removedCount}</Text> / {eliminationCap} món tối đa
            </Text>
          </View>

          {allRemoved ? (
            <Text style={[styles.modalWarning, { color: colors.danger }]}>
              ⚠ Chú ý: Bạn đang chọn LOẠI TẤT CẢ các món. Nếu cả nhóm cùng loại hết, phiên sẽ kết thúc không tìm thấy món đồng thuận (ALL_REMOVED).
            </Text>
          ) : (
            <Text style={[styles.modalHint, { color: colors.muted }]}>
              Món được giữ lại sẽ được hệ thống tính điểm đồng thuận để chọn ra quán quân. Sau khi gửi sẽ không thể hoàn tác.
            </Text>
          )}

          <View style={styles.modalActions}>
            <AppButton
              label="Quay lại chỉnh sửa"
              variant="quiet"
              onPress={() => setConfirmModalVisible(false)}
              colors={colors}
            />
            <AppButton
              label="Chốt phiếu ngay"
              onPress={() => void handleSubmit()}
              colors={colors}
            />
          </View>
        </View>
      </SheetDialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  batchActionsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  batchButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  batchButtonText: { fontSize: 13, fontWeight: '700' },
  capIndicator: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  capIndicatorText: { fontSize: 12, fontWeight: '700' },
  candidateList: { gap: 14 },
  submitSection: { gap: 8, marginTop: 8 },
  submitHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  modalBody: { gap: 14, paddingVertical: 8 },
  modalText: { fontSize: 15, fontWeight: '600' },
  modalSummaryBox: { gap: 6, padding: 10, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' },
  summaryItem: { fontSize: 14, fontWeight: '600' },
  modalWarning: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  modalHint: { fontSize: 12, lineHeight: 17 },
  modalActions: { gap: 8, marginTop: 6 },
});
