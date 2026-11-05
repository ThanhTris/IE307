import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MOCK_DISHES,
  type ApiClient,
  type PoolDish,
  type RoomResult,
} from '../../../data/api';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  AppButton,
  AppHeader,
  type VoteValue,
} from '../../../shared/ui';
import type { VoteScreenScenario } from '../fixtures';
import type { VoteRepository } from '../services/voteRepository';
import { useRoundOneVoting } from '../hooks/useRoundOneVoting';
import { VoteScenarioAndStatusBanner } from '../components/VoteScenarioAndStatusBanner';
import { VoteDishCardItem } from '../components/VoteDishCardItem';
import { FlashcardDeckView } from '../components/FlashcardDeckView';

export type VoteScreenProps = {
  pool?: PoolDish[];
  roomId?: string;
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
  onGoToNoConsensus?: () => void;
  onBack?: () => void;
};

export function VoteScreen({
  pool = MOCK_DISHES,
  roomId = 'room_demo_gm12',
  initialVotes,
  api,
  repository,
  initialScenario = 'round_two',
  simulateError = false,
  simulateDelayMs = 400,
  showScenarioPicker = true,
  initialViewMode = 'list',
  initialIsHost = true,
  onGoToFinalRound,
  onBack,
}: VoteScreenProps) {
  const { colors } = useShellTheme();
  const {
    votes,
    scenario,
    setScenario,
    submissionState,
    errorMessage,
    receipt,
    isWaitingForMembers,
    needsRoundTwo,
    roundTwoCandidates,
    lastActionNotice,
    lastTapRef,
    allVoted,
    isLocked,
    activeCardIndex,
    viewMode,
    setViewMode,
    canUndo,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    handleHostEarlyFinish,
    handleVote,
    handleFlashcardVote,
    handleCardPress,
    handleClearVote,
    handleUndoCard,
    handleNextCard,
    handlePrevCard,
    handleSubmit,
  } = useRoundOneVoting({
    pool,
    roomId,
    initialVotes,
    api,
    repository,
    initialScenario,
    simulateError,
    simulateDelayMs,
    initialIsHost,
    initialViewMode,
  });

  const currentDish = pool[activeCardIndex] || pool[0];
  const votedCount = pool.filter(dish => Boolean(votes[dish.roundDishId])).length;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bình chọn · Vòng 1" onPressBrand={onBack} colors={colors} />
      <ScrollView
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {
          lastTapRef.current = {};
        }}
      >
        <VoteScenarioAndStatusBanner
          showScenarioPicker={showScenarioPicker}
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

        {/* View Mode Switcher */}
        {submissionState === 'idle' ? (
          <View style={styles.viewModeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang chế độ Flashcard"
              onPress={() => setViewMode('flashcard')}
              style={[
                styles.viewModeBtn,
                {
                  backgroundColor: viewMode === 'flashcard' ? colors.primary : colors.surface,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.viewModeBtnText,
                  { color: viewMode === 'flashcard' ? colors.onPrimary : colors.primary },
                ]}
              >
                🎴 Flashcard từng thẻ
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang chế độ Danh sách đầy đủ"
              onPress={() => setViewMode('list')}
              style={[
                styles.viewModeBtn,
                {
                  backgroundColor: viewMode === 'list' ? colors.primary : colors.surface,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.viewModeBtnText,
                  { color: viewMode === 'list' ? colors.onPrimary : colors.primary },
                ]}
              >
                📋 Toàn bộ danh sách ({votedCount}/{pool.length})
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Flashcard or List view */}
        {viewMode === 'flashcard' && currentDish ? (
          <FlashcardDeckView
            dish={currentDish}
            cardIndex={activeCardIndex}
            totalCards={pool.length}
            votedCount={votedCount}
            currentVote={votes[currentDish.roundDishId]}
            isLocked={isLocked}
            canUndo={canUndo}
            onVote={vote => handleFlashcardVote(currentDish.roundDishId, vote)}
            onCardPress={() => handleCardPress(currentDish.roundDishId)}
            onUndo={handleUndoCard}
            onNext={handleNextCard}
            onPrev={handlePrevCard}
            onClearVote={() => handleClearVote(currentDish.roundDishId)}
            colors={colors}
          />
        ) : (
          <View style={styles.dishList}>
            {pool.map((dish, index) => (
              <VoteDishCardItem
                key={dish.roundDishId}
                dish={dish}
                index={index}
                currentVote={votes[dish.roundDishId]}
                isLocked={isLocked}
                onVote={handleVote}
                onCardPress={handleCardPress}
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
  viewModeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  viewModeBtn: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  viewModeBtnText: { fontSize: 13, fontWeight: '700' },
  dishList: { gap: 20 },
  submitSection: { gap: 8, marginTop: 8 },
  submitHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
