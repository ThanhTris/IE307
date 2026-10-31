import {
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
} from '../../../data/api';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  AppButton,
  AppHeader,
  type VoteValue,
} from '../../../shared/ui';
import type { VoteScreenScenario } from '../fixtures';
import { useRoundOneVoting } from '../hooks/useRoundOneVoting';
import { VoteScenarioAndStatusBanner } from '../components/VoteScenarioAndStatusBanner';
import { VoteDishCardItem } from '../components/VoteDishCardItem';

export type VoteScreenProps = {
  pool?: PoolDish[];
  roomId?: string;
  initialVotes?: Record<string, VoteValue>;
  api?: ApiClient;
  initialScenario?: VoteScreenScenario;
  simulateError?: boolean;
  simulateDelayMs?: number;
  showScenarioPicker?: boolean;
  onGoToFinalRound?: (candidates: PoolDish[]) => void;
  onBack?: () => void;
};

export function VoteScreen({
  pool = MOCK_DISHES,
  roomId = 'room_demo_gm12',
  initialVotes,
  api,
  initialScenario = 'round_two',
  simulateError = false,
  simulateDelayMs = 400,
  showScenarioPicker = true,
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
    handleVote,
    handleCardPress,
    handleClearVote,
    handleSubmit,
  } = useRoundOneVoting({
    pool,
    roomId,
    initialVotes,
    api,
    initialScenario,
    simulateError,
    simulateDelayMs,
  });

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
          onGoToFinalRound={onGoToFinalRound}
          onRetryRoundTwo={() => {
            setScenario('round_two');
            void handleSubmit('round_two');
          }}
          colors={colors}
        />

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

        <View style={styles.submitSection}>
          <Text style={[styles.submitHint, { color: colors.muted }]}>
            {submissionState === 'ack'
              ? 'Phiếu đã được nộp và ghi nhận trên hệ thống.'
              : allVoted
              ? 'Tất cả các món đã được chọn. Nhấn Gửi phiếu để xác nhận.'
              : 'Nút gửi chỉ bật khi đã chọn đủ phiếu cho tất cả các món. UNSET không phải là OK.'}
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
  dishList: { gap: 20 },
  submitSection: { gap: 8, marginTop: 8 },
  submitHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
