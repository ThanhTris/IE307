import { useRef, useState } from 'react';
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
  type BallotVoteItem,
  type PoolDish,
  type SubmissionReceipt,
} from '../../../data/api';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  AppButton,
  AppHeader,
  DishCard,
  StatusNotice,
  type DishCardData,
  type VoteValue,
} from '../../../shared/ui';
import {
  FIXTURE_ROUND_TWO_CANDIDATES,
  simulateDeferredRequest,
  type VoteScreenScenario,
} from '../fixtures';

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

  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes || {});
  const [scenario, setScenario] = useState<VoteScreenScenario>(initialScenario);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);
  const [needsRoundTwo, setNeedsRoundTwo] = useState(false);
  const [roundTwoCandidates, setRoundTwoCandidates] = useState<PoolDish[]>(FIXTURE_ROUND_TWO_CANDIDATES);
  const [lastActionNotice, setLastActionNotice] = useState<string>('');

  const lastTapRef = useRef<Record<string, number>>({});

  const votedCount = pool.filter(dish => Boolean(votes[dish.roundDishId])).length;
  const allVoted = pool.length > 0 && votedCount === pool.length;

  // Once submitted (pending or ack), all interaction is locked to prevent re-vote or double-submission
  const isLocked = submissionState === 'pending' || submissionState === 'ack';

  // Double-tap explicitly sets WANT without toggling off and without auto-submitting
  const handleSetWant = (dishId: string) => {
    if (isLocked) return;
    setVotes(prev => ({ ...prev, [dishId]: 'WANT' }));
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Double-tap: Đã đặt WANT (Muốn ăn) cho ${dish?.name || dishId} (chưa gửi)`);
  };

  // Button tap handles normal selection and toggle off to UNSET
  const handleVote = (dishId: string, vote: VoteValue) => {
    if (isLocked) return;
    setVotes(prev => {
      if (prev[dishId] === vote) {
        const next = { ...prev };
        delete next[dishId];
        return next;
      }
      return { ...prev, [dishId]: vote };
    });
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Đã đặt "${vote}" cho ${dish?.name || dishId}`);
  };

  const handleCardPress = (dishId: string) => {
    if (isLocked) return;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const last = lastTapRef.current[dishId] ?? 0;
    if (now - last < 350) {
      // Double tap detected: sets WANT, never auto-submits, never toggles to UNSET
      handleSetWant(dishId);
      lastTapRef.current[dishId] = 0;
    } else {
      lastTapRef.current[dishId] = now;
    }
  };

  const handleClearVote = (dishId: string) => {
    if (isLocked) return;
    setVotes(prev => {
      const next = { ...prev };
      delete next[dishId];
      return next;
    });
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Đã hoàn tác phiếu của ${dish?.name || dishId} về UNSET`);
  };

  const handleSubmit = async (overrideScenario?: VoteScreenScenario) => {
    if (!allVoted || (isLocked && typeof overrideScenario !== 'string')) return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setSubmissionState('pending');
    setErrorMessage('');

    const ballotVotes: BallotVoteItem[] = pool.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: votes[dish.roundDishId]!,
    }));

    const req = {
      roomId,
      round: 1 as const,
      poolVersion: 1,
      intentId: `intent_${Date.now()}`,
      expectedVersion: 1,
      votes: ballotVotes,
      requestId: `req_vote_${Date.now()}`,
    };

    try {
      if (api) {
        const res = await api.submitBallot(req);
        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 1,
            intentId: req.intentId,
            requestId: res.requestId ?? req.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setNeedsRoundTwo(false);
          } else {
            setIsWaitingForMembers(false);
            if (res.data.round === 2 || res.state === 'ROUND_2') {
              setNeedsRoundTwo(true);
              setRoundTwoCandidates(FIXTURE_ROUND_TWO_CANDIDATES);
            } else {
              setNeedsRoundTwo(false);
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
        }
      } else {
        // Fallback / stand-alone mock using simulated deferred request
        const shouldFail = simulateError ? true : activeScenario === 'error';
        const mockResultData = await simulateDeferredRequest(
          {
            accepted: true,
            round: 1 as const,
            allMembersSubmitted: activeScenario !== 'waiting',
            roomVersion: 2,
            requestId: req.requestId,
            receipt: {
              round: 1 as const,
              intentId: req.intentId,
              requestId: req.requestId,
              submittedAt: new Date().toISOString(),
              voteCount: ballotVotes.length,
            },
            needsRoundTwo: activeScenario === 'round_two',
            candidates: FIXTURE_ROUND_TWO_CANDIDATES,
          },
          {
            delayMs: simulateDelayMs,
            shouldFail,
            errorMessage: 'Mô phỏng lỗi kết nối máy chủ (Fixture Error). Vui lòng thử lại.',
          }
        );

        setSubmissionState('ack');
        setReceipt(mockResultData.receipt);
        if (mockResultData.allMembersSubmitted === false) {
          setIsWaitingForMembers(true);
          setNeedsRoundTwo(false);
        } else {
          setIsWaitingForMembers(false);
          if (mockResultData.needsRoundTwo) {
            setNeedsRoundTwo(true);
            setRoundTwoCandidates(mockResultData.candidates);
          } else {
            setNeedsRoundTwo(false);
          }
        }
      }
    } catch (err) {
      setSubmissionState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi gửi phiếu');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bình chọn · Vòng 1" onPressBrand={onBack} colors={colors} />
      <ScrollView
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {
          // Scrolling cancels double-tap detection to avoid accidental votes
          lastTapRef.current = {};
        }}
      >
        <StatusNotice
          title="GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)"
          message="Ba nút WANT/OK/NO luôn hiển thị. Double-tap thẻ đặt WANT nhưng không tự gửi. Scroll dọc không ghi nhận phiếu. UNSET khác OK. Dữ liệu mock fixture."
          tone="info"
          colors={colors}
        />

        {/* Demo / QA Scenario Selector */}
        {showScenarioPicker && submissionState === 'idle' ? (
          <View style={[styles.scenarioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scenarioTitle, { color: colors.text }]}>
              🧪 Kịch bản thử nghiệm (QA / Demo):
            </Text>
            <View style={styles.scenarioRow}>
              {(['round_two', 'waiting', 'success', 'error'] as const).map(item => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn kịch bản ${item}`}
                  onPress={() => setScenario(item)}
                  style={[
                    styles.scenarioChip,
                    {
                      borderColor: scenario === item ? colors.primary : colors.border,
                      backgroundColor: scenario === item ? colors.soft : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.scenarioChipText,
                      { color: scenario === item ? colors.primary : colors.muted },
                    ]}
                  >
                    {item === 'round_two'
                      ? '⚡ Cần Vòng 2'
                      : item === 'waiting'
                      ? '⏳ Chờ nhóm'
                      : item === 'success'
                      ? '✓ Thành công'
                      : '⚠ Lỗi/Retry'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {lastActionNotice ? (
          <StatusNotice title="Tương tác gần nhất" message={lastActionNotice} tone="success" colors={colors} />
        ) : null}

        {submissionState === 'pending' && (
          <StatusNotice
            title="Đang gửi phiếu… (Pending)"
            message="Đang truyền tải danh sách phiếu lên mock server. Chưa nhận ACK. Tất cả thao tác đang khóa."
            tone="info"
            colors={colors}
          />
        )}

        {submissionState === 'ack' && (
          <View style={styles.ackBox}>
            <StatusNotice
              title="Đã nhận phiếu thành công! (Server ACK)"
              message={`Biên nhận: ${receipt?.requestId || 'N/A'} · Đã gửi ${receipt?.voteCount || pool.length} phiếu.`}
              tone="success"
              colors={colors}
            />

            {isWaitingForMembers ? (
              <StatusNotice
                title="Đang đợi các thành viên khác nộp phiếu… (Chờ kết quả)"
                message="Phiếu của bạn đã được ghi nhận. Chưa thể xác định kết quả do nhóm chưa nộp đủ."
                tone="info"
                colors={colors}
              />
            ) : null}

            {needsRoundTwo && !isWaitingForMembers ? (
              <View style={styles.roundTwoBox}>
                <StatusNotice
                  title="Yêu cầu Vòng 2 · Chọn lọc (Chưa đồng thuận)"
                  message="Phiếu Vòng 1 chưa đạt đồng thuận tuyệt đối. Tiến hành Vòng 2 để chọn lọc giữa các ứng viên."
                  tone="warning"
                  colors={colors}
                />
                {onGoToFinalRound ? (
                  <AppButton
                    label="Tiến hành Vòng 2 · Chọn lọc →"
                    onPress={() => onGoToFinalRound(roundTwoCandidates)}
                    colors={colors}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {submissionState === 'error' && (
          <StatusNotice
            title="Lỗi nộp phiếu (Fixture Error)"
            message={errorMessage}
            tone="error"
            actionLabel="Thử lại"
            onAction={() => {
              setScenario('round_two');
              handleSubmit('round_two');
            }}
            colors={colors}
          />
        )}

        {/* Dish List */}
        <View style={styles.dishList}>
          {pool.map((dish, index) => {
            const currentVote = votes[dish.roundDishId];
            const cardData: DishCardData = {
              id: dish.roundDishId,
              name: dish.name,
              description: dish.description ?? undefined,
              imageUrl: dish.artwork?.url ?? undefined,
              tags: [dish.origin, dish.temperature, ...(dish.cuisineIds || []), ...(dish.categoryIds || [])].filter(Boolean) as string[],
              priceLabel:
                dish.priceMin != null && dish.priceMax != null
                  ? `${dish.priceMin.toLocaleString()} - ${dish.priceMax.toLocaleString()} đ`
                  : undefined,
              venueLabel: dish.venueName,
            };

            return (
              <View key={dish.roundDishId} style={styles.dishCardContainer}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.dishIndex, { color: colors.primary }]}>
                    Món #{index + 1}
                  </Text>
                  <Text
                    accessibilityRole="text"
                    accessibilityLabel={`Trạng thái phiếu món ${dish.name}: ${currentVote ?? 'UNSET'}`}
                    style={[
                      styles.voteBadge,
                      {
                        color: currentVote ? (currentVote === 'WANT' ? colors.primary : currentVote === 'OK' ? colors.green : colors.danger) : colors.muted,
                        backgroundColor: colors.soft,
                      },
                    ]}
                  >
                    {currentVote ? `Phiếu: ${currentVote}` : 'Chưa chọn (UNSET)'}
                  </Text>
                </View>

                <DishCard
                  dish={cardData}
                  selectedVote={currentVote}
                  onVote={vote => handleVote(dish.roundDishId, vote)}
                  onPress={() => handleCardPress(dish.roundDishId)}
                  disabled={isLocked}
                  delayPressIn={100}
                  colors={colors}
                />

                {currentVote && !isLocked ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Bỏ chọn phiếu cho ${dish.name}`}
                    onPress={() => handleClearVote(dish.roundDishId)}
                    style={styles.undoRow}
                  >
                    <Text style={[styles.undoText, { color: colors.muted }]}>
                      ↺ Bỏ chọn / Hoàn tác về UNSET
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
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
            onPress={() => handleSubmit(submissionState === 'error' ? 'round_two' : undefined)}
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
  scenarioCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  scenarioTitle: { fontSize: 13, fontWeight: '700' },
  scenarioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenarioChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  scenarioChipText: { fontSize: 12, fontWeight: '700' },
  dishList: { gap: 20 },
  dishCardContainer: { gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishIndex: { fontSize: 13, fontWeight: '700' },
  voteBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  undoRow: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8 },
  undoText: { fontSize: 12, fontWeight: '600' },
  submitSection: { gap: 8, marginTop: 8 },
  submitHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  ackBox: { gap: 12 },
  roundTwoBox: { gap: 12 },
});
