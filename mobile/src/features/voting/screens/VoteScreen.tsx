import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiClient, ErrorCode, PoolDish, RoomResult } from '../../../data/api';
import { MOCK_DISHES } from '../fixtures';
import {
  AppButton,
  ErrorRecovery,
  AppHeader,
  SheetDialog,
  type VoteValue,
} from '../../../shared/ui';
import { describeError } from '../../../shared/errors/describeError';
import type { FailureExit } from '../../../shared/errors/failure';
import { useHelp } from '../../../shared/help/HelpContext';
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
import { RoundTwoNotice } from '../components/RoundTwoNotice';
import { CONTAINER_STYLE, CONTAINER_GUTTER } from '../../../shared/ui/layout/ScreenContainer';

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
  onExit?: (exit: FailureExit) => void;
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
  onExit,
}: VoteScreenProps) {
  const { colors } = useShellTheme();
  const help = useHelp();
  const [confirmExit, setConfirmExit] = useState(false);
  // Round 1 found no winner: tell the player before the screen moves on to round 2.
  const [roundTwoNotice, setRoundTwoNotice] = useState<PoolDish[] | null>(null);
  const announceRoundTwo = useCallback((candidates: PoolDish[]) => setRoundTwoNotice(candidates), []);
  // The notice stays on screen (blank background) while the app moves to round 2, so nothing of round 1 flashes back
  // behind the sliding screen; it goes only once.
  const movedToRoundTwo = useRef(false);
  const continueToRoundTwo = useCallback(() => {
    if (!roundTwoNotice || movedToRoundTwo.current) return;
    movedToRoundTwo.current = true;
    onGoToFinalRound?.(roundTwoNotice);
  }, [roundTwoNotice, onGoToFinalRound]);
  const roundTwoDialog = roundTwoNotice ? <RoundTwoNotice remaining={roundTwoNotice.length} onContinue={continueToRoundTwo} /> : null;
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
    snapshotRetryCount,
    submitFailureCode,
    submitRetryCount,
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
    onRoundTwo: onGoToFinalRound ? announceRoundTwo : undefined,
    onGoToResult,
    onGoToNoConsensus,
    onExit,
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

  useEffect(() => {
    if (!repository || shouldShowScenarioPicker || !onBack) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (confirmExit) { setConfirmExit(false); return true; }
      setConfirmExit(true);
      return true;
    });
    return () => subscription.remove();
  }, [repository, shouldShowScenarioPicker, onBack, confirmExit]);

  const leaveDialog = onBack ? (
    <SheetDialog visible={confirmExit} presentation="dialog" showClose={false} title="Rời màn hình bình chọn?" onClose={() => setConfirmExit(false)} colors={colors}>
      <Text style={[styles.leaveBody, { color: colors.muted }]}>Nhóm vẫn đang chọn món. Bạn có thể quay lại phòng từ Trang chủ.</Text>
      <View style={styles.leaveActions}>
        <AppButton label="Ở lại" variant="secondary" onPress={() => setConfirmExit(false)} colors={colors} style={styles.leaveButton} />
        <AppButton label="Về trang chủ" variant="danger" onPress={() => { setConfirmExit(false); onBack(); }} colors={colors} style={styles.leaveButton} />
      </View>
    </SheetDialog>
  ) : null;

  if (isLoadingSnapshot) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <VoteSkeleton label="Đang tải phòng bình chọn" colors={colors} />
      </SafeAreaView>
    );
  }

  if (snapshotError && pool.length === 0) {
    const desc = describeError({ messageKey: snapshotError as ErrorCode });
    const showHelp = help && desc.reportable && (snapshotRetryCount >= 2 || desc.code === 'MALFORMED_RESPONSE' || desc.code === 'CONTRACT_MISMATCH');
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader variant="back" title="Vòng 1" centeredTitle hideDivider onPressBack={onBack} colors={colors} />
        <View style={styles.loadingContainer}>
          <ErrorRecovery
            variant="empty"
            heading="Không thể tải dữ liệu phòng"
            title={desc.title}
            message={desc.message}
            note={desc.message}
            actionLabel="Thử lại tải phòng"
            onAction={() => void fetchSnapshot()}
            onHelp={showHelp ? () => help.open({ errorCode: desc.code, screen: 'room/vote', action: 'load_round_one' }) : undefined}
            colors={colors}
          />
        </View>
        {leaveDialog}
      </SafeAreaView>
    );
  }

  const sentSubmitToast = submissionState === 'error' && errorMessage ? (() => {
    const showSubmitHelp = Boolean(help && submitFailureCode && describeError({ messageKey: submitFailureCode }).reportable
      && (submitRetryCount >= 2 || submitFailureCode === 'MALFORMED_RESPONSE' || submitFailureCode === 'CONTRACT_MISMATCH'));
    return <ToastNotice
      title="Chưa gửi được phiếu"
      message={errorMessage}
      tone="error"
      triggerKey={submitRetryCount}
      actionLabel={showSubmitHelp ? 'Báo lỗi' : undefined}
      actionAccessibilityLabel={showSubmitHelp ? 'Báo lỗi hoặc cần trợ giúp' : undefined}
      onAction={showSubmitHelp ? () => help!.open({ errorCode: submitFailureCode!, screen: 'room/vote', action: 'submit_ballot' }) : undefined}
    />;
  })() : null;

  // Round 1 found no winner: the dialog covers the whole screen and the app moves on to round 2, so nothing of round 1
  // is drawn behind it, only the plain background.
  if (roundTwoNotice) {
    return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {sentSubmitToast}
      {waitingError ? <ToastNotice title={waitingError} tone="error" /> : null}
      {roundTwoDialog}
    </SafeAreaView>;
  }

  if (viewMode === 'flashcard' && !shouldShowScenarioPicker) {
    const sent = submissionState === 'pending' || submissionState === 'ack';
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {sentSubmitToast}
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
            failureCode={submitFailureCode}
            retryCount={submitRetryCount}
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
        {leaveDialog}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader variant="back" title="Bình chọn · Vòng 1" centeredTitle hideDivider onPressBack={onBack} colors={colors} />
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
              : `Hãy chọn đủ tất cả các món trước khi gửi phiếu (${votedCount}/${pool.length}).`}
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
      {leaveDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: CONTAINER_GUTTER, gap: 16, ...CONTAINER_STYLE },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  leaveBody: { fontSize: 14, lineHeight: 20 },
  leaveActions: { flexDirection: 'row', gap: 10 },
  leaveButton: { flex: 1 },
  loadingText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  viewModeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  viewModeBtn: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  viewModeBtnText: { fontSize: 13, fontWeight: '700' },
  dishList: { gap: 20 },
  submitSection: { gap: 8, marginTop: 8 },
  submitHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
