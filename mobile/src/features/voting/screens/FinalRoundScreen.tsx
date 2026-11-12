import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiClient, PoolDish, RoomResult } from '../../../data/api';
import {
  AppButton,
  StatusNotice,
  AppHeader,
  SheetDialog,
} from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  FIXTURE_ROUND_TWO_CANDIDATES,
  type FinalScreenScenario,
} from '../fixtures';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { VoteSkeleton } from '../components/VoteSkeleton';
import type { VoteRepository } from '../services/voteRepository';
import { useRoundTwoVoting, type FinalChoice } from '../hooks/useRoundTwoVoting';
import { FinalRoundHeaderAndOutcome } from '../components/FinalRoundHeaderAndOutcome';
import { CandidateKeepRemoveCard } from '../components/CandidateKeepRemoveCard';

export type FinalRoundScreenProps = {
  candidates?: PoolDish[];
  roomId?: string;
  identityId?: string;
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
  onFinish?: (result: RoomResult) => void;
  onGoToResult?: (result: RoomResult) => void;
  onGoToNoConsensus?: (result?: RoomResult) => void;
  onBack?: () => void;
};

export function FinalRoundScreen({
  candidates: candidatesProp,
  roomId = 'room_demo_gm12',
  identityId = 'anonymous',
  initialChoices,
  api,
  repository,
  initialScenario = 'consensus',
  initialResult = null,
  simulateError = false,
  simulateDelayMs = 400,
  showScenarioPicker,
  initialIsHost = true,
  enforceCap = true,
  onFinish,
  onGoToResult,
  onGoToNoConsensus,
  onBack,
}: FinalRoundScreenProps) {
  const { colors } = useShellTheme();
  const shouldShowScenarioPicker = showScenarioPicker ?? !repository;

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
    waitingError,
    isRetryingWaiting,
    needsWaitingTransition,
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
    isLoadingSnapshot,
    snapshotError,
    candidates: effectiveCandidates,
    fetchSnapshot,
    handleHostEarlyFinish,
    handleRetryWaiting,
    handleToggleChoice,
    handleSetAllKeep,
    handleSubmit,
  } = useRoundTwoVoting({
    candidates: candidatesProp ?? (repository ? undefined : FIXTURE_ROUND_TWO_CANDIDATES),
    roomId,
    identityId,
    initialChoices,
    api,
    repository,
    initialScenario,
    initialResult,
    simulateError,
    simulateDelayMs,
    initialIsHost,
    enforceCap,
    onFinish,
    onGoToResult,
    onGoToNoConsensus,
  });

  const candidates = effectiveCandidates;

  if (isLoadingSnapshot) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title="Bình chọn · Vòng 2" onPressBrand={onBack} colors={colors} />
        <VoteSkeleton label="Đang tải Vòng 2" colors={colors} />
      </SafeAreaView>
    );
  }

  if (snapshotError && candidates.length === 0) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title="Bình chọn · Vòng 2" onPressBrand={onBack} colors={colors} />
        <View style={styles.loadingContainer}>
          <StatusNotice title="Không thể tải dữ liệu Vòng 2" message={`Lỗi: ${snapshotError}. Vui lòng kiểm tra lại kết nối mạng.`} tone="error" actionLabel="Thử lại tải phòng" onAction={() => void fetchSnapshot()} colors={colors} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bình chọn · Vòng 2" onPressBrand={onBack} colors={colors} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <FinalRoundHeaderAndOutcome
          showScenarioPicker={shouldShowScenarioPicker}
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
          onFinish={() => result && onFinish?.(result)}
          onRetryConsensus={() => {
            setScenario('consensus');
            void handleSubmit('consensus');
          }}
          colors={colors}
        />

        {/* Waiting error banner with retry (F4) */}
        {waitingError || needsWaitingTransition ? (
          <View>
            {waitingError ? <ToastNotice title={waitingError} tone="error" /> : null}
            <AppButton
              label={isRetryingWaiting ? 'Đang thử lại…' : 'Thử lại vào hàng chờ Vòng 2'}
              disabled={isRetryingWaiting}
              variant="quiet"
              onPress={handleRetryWaiting}
              colors={colors}
            />
          </View>
        ) : null}

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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  loadingText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  batchActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  batchButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5 },
  batchButtonText: { fontSize: 13, fontWeight: '700' },
  capIndicator: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  capIndicatorText: { fontSize: 11, fontWeight: '600' },
  candidateList: { gap: 16 },
  submitSection: { gap: 8, marginTop: 8 },
  submitHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  modalBody: { gap: 14, paddingVertical: 8 },
  modalText: { fontSize: 14 },
  modalSummaryBox: { padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', gap: 6 },
  summaryItem: { fontSize: 14, fontWeight: '600' },
  modalWarning: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  modalHint: { fontSize: 12, lineHeight: 17 },
  modalActions: { gap: 8, marginTop: 12 },
});
