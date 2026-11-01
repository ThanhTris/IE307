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
import { useRoundTwoVoting, type FinalChoice } from '../hooks/useRoundTwoVoting';
import { FinalRoundHeaderAndOutcome } from '../components/FinalRoundHeaderAndOutcome';
import { CandidateKeepRemoveCard } from '../components/CandidateKeepRemoveCard';

export type { FinalChoice };

export type FinalRoundScreenProps = {
  candidates?: PoolDish[];
  roomId?: string;
  initialChoices?: Record<string, FinalChoice>;
  api?: ApiClient;
  initialScenario?: FinalScreenScenario;
  initialResult?: RoomResult | null;
  simulateError?: boolean;
  simulateDelayMs?: number;
  showScenarioPicker?: boolean;
  onFinish?: () => void;
  onBack?: () => void;
};

export function FinalRoundScreen({
  candidates = FIXTURE_ROUND_TWO_CANDIDATES,
  roomId = 'room_demo_gm12',
  initialChoices,
  api,
  initialScenario = 'consensus',
  initialResult = null,
  simulateError = false,
  simulateDelayMs = 400,
  showScenarioPicker = true,
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
    receipt,
    result,
    isWaitingForMembers,
    keptCount,
    removedCount,
    allRemoved,
    isLocked,
    handleToggleChoice,
    handleSetAllKeep,
    handleSetAllRemove,
    handleSubmit,
  } = useRoundTwoVoting({
    candidates,
    roomId,
    initialChoices,
    api,
    initialScenario,
    initialResult,
    simulateError,
    simulateDelayMs,
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
              ✓ Giữ tất cả ({candidates.length})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn loại tất cả"
            onPress={handleSetAllRemove}
            disabled={isLocked}
            style={[
              styles.batchButton,
              {
                borderColor: colors.danger,
                backgroundColor: colors.warm,
                opacity: isLocked ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.batchButtonText, { color: colors.danger }]}>
              ✕ Loại tất cả ({candidates.length})
            </Text>
          </Pressable>
        </View>

        <View style={styles.candidateList}>
          {candidates.map((dish, index) => (
            <CandidateKeepRemoveCard
              key={dish.roundDishId}
              dish={dish}
              index={index}
              currentChoice={choices[dish.roundDishId] || 'KEEP'}
              isLocked={isLocked}
              onToggleChoice={handleToggleChoice}
              colors={colors}
            />
          ))}
        </View>

        <View style={styles.submitSection}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            Đang chọn giữ: <Text style={{ fontWeight: '700', color: colors.primary }}>{keptCount}</Text> món · Đã loại: <Text style={{ fontWeight: '700', color: colors.danger }}>{removedCount}</Text> món
          </Text>
          {allRemoved ? (
            <Text style={[styles.allRemovedWarning, { color: colors.danger }]}>
              ⚠ Bạn đang chọn LOẠI TẤT CẢ các món. Thao tác này hoàn toàn hợp lệ nếu bạn không thích món nào.
            </Text>
          ) : null}

          <AppButton
            label={
              submissionState === 'pending'
                ? 'Đang nộp lựa chọn…'
                : submissionState === 'ack'
                ? 'Đã nộp phiếu Vòng 2 (Đã xác nhận)'
                : submissionState === 'error'
                ? 'Thử lại nộp phiếu Vòng 2'
                : 'Xác nhận nộp Vòng 2'
            }
            disabled={submissionState === 'pending' || submissionState === 'ack'}
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
          <AppButton label="Quay lại" variant="quiet" onPress={onBack} colors={colors} />
        ) : null}

        <SheetDialog
          visible={confirmModalVisible}
          title="Xác nhận nộp phiếu Vòng 2"
          onClose={() => setConfirmModalVisible(false)}
          colors={colors}
        >
          <Text style={[styles.modalMessage, { color: colors.text }]}>
            {allRemoved
              ? 'Bạn đang chọn LOẠI TẤT CẢ các món trong danh sách. Sau khi gửi sẽ không thể hoàn tác. Bạn có chắc chắn muốn nộp?'
              : `Bạn đã chọn GIỮ ${keptCount} món và LOẠI ${removedCount} món. Sau khi gửi sẽ không thể hoàn tác. Xác nhận chốt phiếu?`}
          </Text>
          <AppButton
            label="Chốt phiếu ngay"
            onPress={() => void handleSubmit()}
            colors={colors}
          />
        </SheetDialog>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  batchActionsRow: { flexDirection: 'row', gap: 10 },
  batchButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  batchButtonText: { fontSize: 13, fontWeight: '700' },
  candidateList: { gap: 16 },
  submitSection: { gap: 8, marginTop: 8 },
  summaryText: { fontSize: 13, textAlign: 'center' },
  allRemovedWarning: { fontSize: 12, textAlign: 'center', fontWeight: '600', paddingHorizontal: 16 },
  modalMessage: { fontSize: 14, lineHeight: 20 },
});
