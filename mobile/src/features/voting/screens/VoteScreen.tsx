import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiClient, PoolDish, RoomResult } from '../../../data/api';
import { MOCK_DISHES } from '../fixtures';
import {
  AppButton,
  StatusNotice,
  AppHeader,
  type VoteValue,
} from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { VoteScreenScenario } from '../fixtures';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { VoteSkeleton } from '../components/VoteSkeleton';
import type { VoteRepository } from '../services/voteRepository';
import { useRoundOneVoting } from '../hooks/useRoundOneVoting';
import { VoteScenarioAndStatusBanner } from '../components/VoteScenarioAndStatusBanner';
import { VoteDishCardItem } from '../components/VoteDishCardItem';
import { FlashcardRoundView } from '../components/FlashcardRoundView';
import { RoundWaitingView } from '../components/RoundWaitingView';

export type VoteScreenProps = {
  pool?: PoolDish[];
  roomId?: string;
  identityId?: string;
  initialVotes?: Record<string, VoteValue>;
  api?: ApiClient;
  repository?: VoteRepository;
  initialScenario?: VoteScreenScenario;
  simulateError?: boolean;
  simulateDelayMs?: number;
  showScenarioPicker?: boolean;
  initialViewMode?: 'flashcard' | 'list';
  initialIsHost?: boolean;
  onGoToFinalRound?: (candidates: PoolDish[]) => void;
  onGoToResult?: (result: RoomResult) => void;
  onGoToNoConsensus?: (result?: RoomResult) => void;
  onBack?: () => void;
};

export function VoteScreen({
  pool: poolProp,
  roomId = 'room_demo_gm12',
  identityId = 'anonymous',
  initialVotes,
  api,
  repository,
  initialScenario = 'round_two',
  simulateError = false,
  simulateDelayMs = 400,
  showScenarioPicker,
  initialViewMode = 'list',
  initialIsHost = true,
  onGoToFinalRound,
  onGoToResult,
  onGoToNoConsensus,
  onBack,
}: VoteScreenProps) {
  const { colors } = useShellTheme();
  // Hide QA scenario picker in real mode when repository is provided (F2)
  const shouldShowScenarioPicker = showScenarioPicker ?? !repository;

  const {
    votes,
    scenario,
    setScenario,
    submissionState,
    errorMessage,
    receipt,
    isWaitingForMembers,
    waitingError,
    needsWaitingTransition,
    isRetryingWaiting,
    needsRoundTwo,
    roundTwoCandidates,
    lastActionNotice,
    allVoted,
    isLocked,
    activeCardIndex,
    viewMode,
    canUndo,
    handleSwipeVote,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    isLoadingSnapshot,
    snapshotError,
    pool: effectivePool,
    fetchSnapshot,
    handleHostEarlyFinish,
    handleRetryWaiting,
    handleVote,
    handleCardDoubleTap,
    handleUndoCard,
    handleClearVote,
    handleSubmit,
  } = useRoundOneVoting({
    pool: poolProp ?? (repository ? undefined : MOCK_DISHES),
    roomId,
    identityId,
    initialVotes,
    api,
    repository,
    initialScenario,
    simulateError,
    simulateDelayMs,
    initialIsHost,
    initialViewMode,
    onRoundTwo: onGoToFinalRound,
    onGoToResult,
    onGoToNoConsensus,
  });

  const pool = effectivePool;
  const votedCount = pool.filter(dish => Boolean(votes[dish.roundDishId])).length;
  // Flashcard deck: answering the last card sends the ballot straight away (no extra "done" screen).
  const [deckFinished, setDeckFinished] = useState(false);
  const submit = () => void handleSubmit(submissionState === 'error' ? 'round_two' : undefined);
  useEffect(() => {
    if (viewMode === 'flashcard' && deckFinished && allVoted && submissionState === 'idle') void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckFinished, allVoted, submissionState, viewMode]);

  if (isLoadingSnapshot) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title="Bình chọn · Vòng 1" onPressBrand={onBack} colors={colors} />
        <VoteSkeleton label="Đang tải phòng bình chọn" colors={colors} />
      </SafeAreaView>
    );
  }

  if (snapshotError && pool.length === 0) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title="Bình chọn · Vòng 1" onPressBrand={onBack} colors={colors} />
        <View style={styles.loadingContainer}>
          <StatusNotice title="Không thể tải dữ liệu phòng" message={`Lỗi: ${snapshotError}. Vui lòng kiểm tra lại kết nối mạng.`} tone="error" actionLabel="Thử lại tải phòng" onAction={() => void fetchSnapshot()} colors={colors} />
        </View>
      </SafeAreaView>
    );
  }

  if (viewMode === 'flashcard' && !shouldShowScenarioPicker) {
    const sent = submissionState === 'pending' || submissionState === 'ack';
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {submissionState === 'error' && errorMessage ? <ToastNotice title="Chưa gửi được phiếu" message={errorMessage} tone="error" /> : null}
        {waitingError ? <ToastNotice title={waitingError} tone="error" /> : null}
        {sent ? (
          <>
            <RoundWaitingView
              pending={submissionState === 'pending'}
              waiting={isWaitingForMembers}
              needsRoundTwo={needsRoundTwo}
              countdown={waitingCountdown}
              acknowledged={rosterAcknowledgedCount}
              total={totalRosterCount}
              isHost={isHost}
              canFinish={canHostEarlyFinish}
              onFinish={handleHostEarlyFinish}
              onRoundTwo={onGoToFinalRound ? () => onGoToFinalRound(roundTwoCandidates) : undefined}
              colors={colors}
            />
            {waitingError || needsWaitingTransition ? (
              <AppButton label={isRetryingWaiting ? 'Đang thử lại…' : 'Thử lại vào phòng chờ'} disabled={isRetryingWaiting} variant="quiet" onPress={handleRetryWaiting} colors={colors} />
            ) : null}
          </>
        ) : (
          <FlashcardRoundView
            pool={pool}
            votes={votes}
            index={activeCardIndex}
            retry={deckFinished && submissionState === 'error'}
            locked={isLocked}
            canUndo={(deckFinished && submissionState === 'idle') || canUndo}
            onVote={(dish, vote) => {
              handleSwipeVote(dish.roundDishId, vote);
              if (activeCardIndex >= pool.length - 1) setDeckFinished(true);
            }}
            onUndo={() => {
              // Undo takes back the answer of the card you return to, so the progress bar goes down too.
              if (deckFinished) { setDeckFinished(false); handleClearVote(pool[activeCardIndex]!.roundDishId); return; }
              const previous = pool[activeCardIndex - 1];
              if (previous) handleClearVote(previous.roundDishId);
              handleUndoCard();
            }}
            onRetry={submit}
            colors={colors}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bình chọn · Vòng 1" onPressBrand={onBack} colors={colors} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <VoteScenarioAndStatusBanner
          showScenarioPicker={shouldShowScenarioPicker}
          submissionState={submissionState}
          scenario={scenario}
          setScenario={setScenario}
          lastActionNotice={lastActionNotice}
          receipt={receipt}
          poolLength={pool.length}
          isWaitingForMembers={isWaitingForMembers}
          needsRoundTwo={needsRoundTwo}
          roundTwoCandidates={roundTwoCandidates}
          errorMessage={errorMessage}
          waitingCountdown={waitingCountdown}
          isHost={isHost}
          setIsHost={setIsHost}
          rosterAcknowledgedCount={rosterAcknowledgedCount}
          setRosterAcknowledgedCount={setRosterAcknowledgedCount}
          totalRosterCount={totalRosterCount}
          canHostEarlyFinish={canHostEarlyFinish}
          onHostEarlyFinish={handleHostEarlyFinish}
          onGoToFinalRound={onGoToFinalRound}
          onRetryRoundTwo={() => {
            setScenario('round_two');
            void handleSubmit('round_two');
          }}
          colors={colors}
        />

        {/* Waiting error banner with retry (F4) */}
        {waitingError || needsWaitingTransition ? (
          <View>
            {waitingError ? <ToastNotice title={waitingError} tone="error" /> : null}
            <AppButton
              label={isRetryingWaiting ? 'Đang thử lại…' : 'Thử lại vào hàng chờ'}
              disabled={isRetryingWaiting}
              variant="quiet"
              onPress={handleRetryWaiting}
              colors={colors}
            />
          </View>
        ) : null}

        {(
          <View style={styles.dishList}>
            {pool.map((dish, index) => (
              <VoteDishCardItem
                key={dish.roundDishId}
                dish={dish}
                index={index}
                currentVote={votes[dish.roundDishId]}
                isLocked={isLocked}
                onVote={handleVote}
                onCardPress={handleCardDoubleTap}
                onClearVote={handleClearVote}
                colors={colors}
              />
            ))}
          </View>
        )}

        <View style={styles.submitSection}>
          <Text style={[styles.submitHint, { color: colors.muted }]}>
            {submissionState === 'ack'
              ? 'Phiếu đã được nộp và ghi nhận trên hệ thống.'
              : allVoted
              ? 'Tất cả các món đã được chọn. Nhấn Gửi phiếu để xác nhận.'
              : `Nút gửi chỉ bật khi đã chọn đủ phiếu cho tất cả các món (${votedCount}/${pool.length}). UNSET không phải là OK.`}
          </Text>
          <AppButton
            label={
              submissionState === 'pending'
                ? 'Đang gửi phiếu…'
                : submissionState === 'ack'
                ? 'Đã nộp phiếu (Đã xác nhận)'
                : submissionState === 'error'
                ? 'Thử lại gửi phiếu'
                : 'Gửi phiếu'
            }
            disabled={!allVoted || isLocked}
            loading={submissionState === 'pending'}
            onPress={() => void handleSubmit(submissionState === 'error' ? 'round_two' : undefined)}
            colors={colors}
          />
        </View>

        {onBack ? (
          <AppButton label="Quay lại" variant="quiet" onPress={onBack} colors={colors} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  loadingText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  viewModeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  viewModeBtn: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  viewModeBtnText: { fontSize: 13, fontWeight: '700' },
  dishList: { gap: 20 },
  submitSection: { gap: 8, marginTop: 8 },
  submitHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
