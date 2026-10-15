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

export type SubmissionState = 'idle' | 'pending' | 'ack' | 'error';

export type VoteScreenProps = {
  pool?: PoolDish[];
  roomId?: string;
  initialVotes?: Record<string, VoteValue>;
  api?: ApiClient;
  simulateError?: boolean;
  onGoToFinalRound?: (candidates: PoolDish[]) => void;
  onBack?: () => void;
};

export function poolDishToCardData(dish: PoolDish): DishCardData {
  const priceMin = dish.priceMin ?? dish.price?.priceMin;
  const priceMax = dish.priceMax ?? dish.price?.priceMax;
  const serving = dish.servingSize ?? dish.price?.servingSize ?? 'phần';

  let priceLabel = 'Chưa có giá';
  if (priceMin) {
    const minK = Math.round(priceMin / 1000);
    const maxK = priceMax && priceMax !== priceMin ? Math.round(priceMax / 1000) : null;
    priceLabel = maxK ? `~${minK}k–${maxK}k / ${serving}` : `~${minK}k / ${serving}`;
  }

  const tags: string[] = [];
  if (dish.origin && dish.origin !== 'unknown' && dish.origin !== 'not_applicable') {
    tags.push(dish.origin === 'north' ? 'Miền Bắc' : dish.origin === 'central' ? 'Miền Trung' : 'Miền Nam');
  }
  if (dish.temperature && dish.temperature !== 'unknown') {
    tags.push(dish.temperature === 'hot' ? 'Món nóng' : dish.temperature === 'cold' ? 'Món lạnh' : 'Món vừa');
  }

  return {
    id: dish.roundDishId,
    name: dish.name,
    description: dish.description ?? undefined,
    imageUrl: dish.artwork?.url,
    priceLabel,
    venueLabel: dish.venueName,
    tags,
  };
}

export function VoteScreen({
  pool = MOCK_DISHES,
  roomId = 'room_demo_gm12',
  initialVotes = {},
  api,
  simulateError = false,
  onGoToFinalRound,
  onBack,
}: VoteScreenProps) {
  const { colors } = useShellTheme();
  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastActionNotice, setLastActionNotice] = useState<string>('');
  const [needsRoundTwo, setNeedsRoundTwo] = useState<boolean>(false);

  // Track double tap per dish
  const lastTapRef = useRef<Record<string, number>>({});

  const votedCount = pool.filter(dish => Boolean(votes[dish.roundDishId])).length;
  const allVoted = pool.length > 0 && votedCount === pool.length;

  const handleVote = (dishId: string, vote: VoteValue) => {
    setVotes(prev => {
      // Toggle off to UNSET if tapping same vote
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
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const last = lastTapRef.current[dishId] ?? 0;
    if (now - last < 350) {
      // Double tap detected: sets WANT, never auto-submits
      handleVote(dishId, 'WANT');
      const dish = pool.find(d => d.roundDishId === dishId);
      setLastActionNotice(`Double-tap: Đã đặt WANT (Muốn ăn) cho ${dish?.name || dishId} (chưa gửi)`);
      lastTapRef.current[dishId] = 0;
    } else {
      lastTapRef.current[dishId] = now;
    }
  };

  const handleClearVote = (dishId: string) => {
    setVotes(prev => {
      const next = { ...prev };
      delete next[dishId];
      return next;
    });
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Đã hoàn tác phiếu của ${dish?.name || dishId} về UNSET`);
  };

  const handleSubmit = async () => {
    if (!allVoted || submissionState === 'pending') return;

    setSubmissionState('pending');
    setErrorMessage('');

    if (simulateError) {
      setSubmissionState('error');
      setErrorMessage('Mô phỏng lỗi mạng khi gửi phiếu (Fixture Error). Vui lòng thử lại.');
      return;
    }

    try {
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

      const res = api
        ? await api.submitBallot(req)
        : {
            ok: true as const,
            requestId: req.requestId,
            roomId,
            data: {
              accepted: true,
              round: 1 as const,
              allMembersSubmitted: true,
              roomVersion: 2,
              receipt: {
                round: 1 as const,
                intentId: req.intentId,
                requestId: req.requestId,
                submittedAt: new Date().toISOString(),
                voteCount: ballotVotes.length,
              },
            },
          };

      if (res.ok) {
        setSubmissionState('ack');
        setReceipt(res.data.receipt ?? {
          round: 1,
          intentId: `intent_${Date.now()}`,
          requestId: res.requestId ?? `req_${Date.now()}`,
          submittedAt: new Date().toISOString(),
          voteCount: ballotVotes.length,
        });

        // Check if round 2 is needed
        if (res.data.round === 2 || (res as { state?: string }).state === 'ROUND_2') {
          setNeedsRoundTwo(true);
        }
      } else {
        setSubmissionState('error');
        setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
      }
    } catch (err) {
      setSubmissionState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi gửi phiếu');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bình chọn · Vòng 1" onPressBrand={onBack} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <StatusNotice
          title="GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)"
          message="Ba nút WANT/OK/NO luôn hiển thị. Double-tap thẻ đặt WANT nhưng không tự gửi. Scroll dọc không ghi nhận phiếu. UNSET khác OK. Dữ liệu mock fixture."
          tone="info"
          colors={colors}
        />

        {lastActionNotice ? (
          <StatusNotice title="Tương tác gần nhất" message={lastActionNotice} tone="success" colors={colors} />
        ) : null}

        {submissionState === 'pending' && (
          <StatusNotice
            title="Đang gửi phiếu… (Pending)"
            message="Đang truyền tải danh sách phiếu lên mock server. Chưa nhận ACK."
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
            {needsRoundTwo ? (
              <StatusNotice
                title="Yêu cầu Vòng 2 (Chưa đồng thuận)"
                message="Phiếu Vòng 1 chưa đạt đồng thuận tuyệt đối. Tiến hành Vòng 2 để chọn lọc."
                tone="warning"
                colors={colors}
              />
            ) : null}
            {onGoToFinalRound ? (
              <AppButton
                label="Tiến hành Vòng 2 · Chọn lọc →"
                onPress={() => onGoToFinalRound(pool.slice(0, 2))}
                colors={colors}
              />
            ) : null}
          </View>
        )}

        {submissionState === 'error' && (
          <StatusNotice
            title="Lỗi nộp phiếu (Fixture Error)"
            message={errorMessage}
            tone="error"
            actionLabel="Thử lại"
            onAction={handleSubmit}
            colors={colors}
          />
        )}

        <View style={styles.statusBar}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            Tiến độ: {votedCount}/{pool.length} món
          </Text>
          <Text style={[styles.statusHelper, { color: allVoted ? colors.green : colors.warning }]}>
            {allVoted ? '✓ Đã đủ phiếu cho tất cả các món' : `Còn ${pool.length - votedCount} món chưa chọn (UNSET)`}
          </Text>
        </View>

        <View style={styles.dishList}>
          {pool.map((dish, index) => {
            const cardData = poolDishToCardData(dish);
            const currentVote = votes[dish.roundDishId];

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
                  colors={colors}
                />

                {currentVote ? (
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
            {allVoted
              ? 'Tất cả các món đã được chọn. Nhấn Gửi phiếu để xác nhận.'
              : 'Nút gửi chỉ bật khi đã chọn đủ phiếu cho tất cả các món. UNSET không phải là OK.'}
          </Text>
          <AppButton
            label={submissionState === 'pending' ? 'Đang gửi phiếu…' : 'Gửi phiếu'}
            disabled={!allVoted || submissionState === 'pending'}
            loading={submissionState === 'pending'}
            onPress={handleSubmit}
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
  statusBar: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 4 },
  statusText: { fontSize: 16, fontWeight: '700' },
  statusHelper: { fontSize: 13, fontWeight: '600' },
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
});
