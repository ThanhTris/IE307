import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type ApiClient,
  type BallotVoteItem,
  type PoolDish,
  type RoomResult,
  type SubmissionReceipt,
} from '../../../data/api';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  AppButton,
  AppHeader,
  SheetDialog,
  StatusNotice,
} from '../../../shared/ui';
import {
  FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT,
  FIXTURE_ROUND_TWO_CANDIDATES,
  FIXTURE_ROUND_TWO_CONSENSUS_RESULT,
  simulateDeferredRequest,
  type FinalScreenScenario,
} from '../fixtures';

export type FinalChoice = 'KEEP' | 'REMOVE';

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

  const [choices, setChoices] = useState<Record<string, FinalChoice>>(() => {
    if (initialChoices) return initialChoices;
    const initial: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      initial[dish.roundDishId] = 'KEEP';
    }
    return initial;
  });

  const [scenario, setScenario] = useState<FinalScreenScenario>(initialScenario);
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>('idle');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [result, setResult] = useState<RoomResult | null>(initialResult);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);

  const keptCount = candidates.filter(dish => choices[dish.roundDishId] === 'KEEP').length;
  const removedCount = candidates.filter(dish => choices[dish.roundDishId] === 'REMOVE').length;
  const allRemoved = candidates.length > 0 && removedCount === candidates.length;

  // Once submitted (pending or ack), all choices and submit buttons are locked
  const isLocked = submitting || submissionState === 'pending' || submissionState === 'ack';

  const handleToggleChoice = (dishId: string, choice: FinalChoice) => {
    if (isLocked) return;
    setChoices(prev => ({ ...prev, [dishId]: choice }));
  };

  const handleSetAllKeep = () => {
    if (isLocked) return;
    const allKeep: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      allKeep[dish.roundDishId] = 'KEEP';
    }
    setChoices(allKeep);
  };

  const handleSetAllRemove = () => {
    if (isLocked) return;
    const allRemove: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      allRemove[dish.roundDishId] = 'REMOVE';
    }
    setChoices(allRemove);
  };

  const handleSubmit = async (overrideScenario?: FinalScreenScenario) => {
    if (isLocked && typeof overrideScenario !== 'string') return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setConfirmModalVisible(false);
    setSubmitting(true);
    setSubmissionState('pending');
    setErrorMessage('');

    const votes: BallotVoteItem[] = candidates.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: choices[dish.roundDishId] === 'REMOVE' ? 'REMOVE' : 'KEEP',
    }));

    const req = {
      roomId,
      round: 2 as const,
      poolVersion: 2,
      intentId: `intent_r2_${Date.now()}`,
      expectedVersion: 2,
      votes,
      requestId: `req_r2_${Date.now()}`,
    };

    try {
      if (api) {
        const res = await api.submitBallot(req);
        setSubmitting(false);

        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 2,
            intentId: req.intentId,
            requestId: res.requestId ?? req.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: votes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            if (initialResult) {
              setResult(initialResult);
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
            round: 2 as const,
            allMembersSubmitted: activeScenario !== 'waiting',
            roomVersion: 3,
            requestId: req.requestId,
            receipt: {
              round: 2 as const,
              intentId: req.intentId,
              requestId: req.requestId,
              submittedAt: new Date().toISOString(),
              voteCount: votes.length,
            },
            result:
              activeScenario === 'all_removed' || allRemoved
                ? FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT
                : activeScenario === 'consensus'
                ? FIXTURE_ROUND_TWO_CONSENSUS_RESULT
                : null,
          },
          {
            delayMs: simulateDelayMs,
            shouldFail,
            errorMessage: 'Mô phỏng lỗi kết nối máy chủ (Fixture Error). Vui lòng thử lại.',
          }
        );

        setSubmitting(false);
        setSubmissionState('ack');
        setReceipt(mockResultData.receipt);

        if (mockResultData.allMembersSubmitted === false) {
          setIsWaitingForMembers(true);
          setResult(null);
        } else {
          setIsWaitingForMembers(false);
          setResult(initialResult || mockResultData.result);
        }
      }
    } catch (err) {
      setSubmitting(false);
      setSubmissionState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi gửi phiếu');
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bình chọn · Vòng 2" onPressBrand={onBack} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Vòng 2 */}
        <View style={[styles.banner, { backgroundColor: colors.warm, borderColor: colors.primary }]}>
          <Text style={[styles.bannerTitle, { color: colors.primary }]}>
            ⚡ VÒNG 2 · CHỌN LỌC
          </Text>
          <Text style={[styles.bannerSubtitle, { color: colors.text }]}>
            Các món cả nhóm cùng ăn được. Chọn Giữ hoặc Loại để chốt.
          </Text>
          <Text style={[styles.bannerRule, { color: colors.muted }]}>
            Giữ mặc định nhưng phải xác nhận nộp. Loại hết tất cả món vẫn hoàn toàn hợp lệ. Tối đa 2 vòng, không bao giờ mở vòng 3.
          </Text>
        </View>

        {/* Demo / QA Scenario Selector */}
        {showScenarioPicker && submissionState === 'idle' ? (
          <View style={[styles.scenarioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scenarioTitle, { color: colors.text }]}>
              🧪 Kịch bản thử nghiệm (QA / Demo):
            </Text>
            <View style={styles.scenarioRow}>
              {(['consensus', 'waiting', 'all_removed', 'error'] as const).map(item => (
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
                    {item === 'consensus'
                      ? '⚡ Đồng thuận (#2)'
                      : item === 'waiting'
                      ? '⏳ Chờ nhóm'
                      : item === 'all_removed'
                      ? '✕ Loại hết'
                      : '⚠ Lỗi/Retry'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {submissionState === 'pending' && (
          <StatusNotice
            title="Đang gửi lựa chọn Vòng 2… (Pending)"
            message="Đang truyền tải danh sách Giữ/Loại lên mock server. Chưa nhận ACK. Mọi thao tác đang khóa."
            tone="info"
            colors={colors}
          />
        )}

        {submissionState === 'ack' && (
          <View style={styles.resultBox}>
            <StatusNotice
              title="Đã nộp phiếu Vòng 2 thành công! (Server ACK)"
              message={`Biên nhận: ${receipt?.requestId || 'N/A'} · Đã gửi ${receipt?.voteCount || candidates.length} lựa chọn.`}
              tone="success"
              colors={colors}
            />

            {isWaitingForMembers ? (
              <StatusNotice
                title="Đang đợi các thành viên khác nộp phiếu… (Chờ kết quả nhóm)"
                message="Lựa chọn Vòng 2 của bạn đã được ghi nhận. Chưa có kết quả cuối cùng do các thành viên khác chưa nộp xong."
                tone="info"
                colors={colors}
              />
            ) : null}

            {result && !isWaitingForMembers ? (
              result.winnerDish ? (
                <View style={[styles.winnerCard, { backgroundColor: colors.soft, borderColor: colors.primary }]}>
                  <Text style={[styles.winnerHeading, { color: colors.primary }]}>
                    🎉 ĐÃ TÌM THẤY MÓN ĐỒNG THUẬN!
                  </Text>
                  <Text style={[styles.winnerSubheading, { color: colors.muted }]}>
                    Kết quả chốt từ hệ thống:
                  </Text>
                  <View style={styles.winnerContent}>
                    <Text style={styles.winnerEmoji}>🏆</Text>
                    <View style={styles.winnerInfo}>
                      <Text style={[styles.winnerName, { color: colors.text }]}>
                        {result.winnerDish.name}
                      </Text>
                      <Text style={[styles.winnerMeta, { color: colors.muted }]}>
                        {result.winnerDish.venueName || 'Quán ăn được chọn'}
                      </Text>
                      {result.winnerDish.priceMin != null && result.winnerDish.priceMax != null ? (
                        <Text style={[styles.winnerPrice, { color: colors.primary }]}>
                          {result.winnerDish.priceMin.toLocaleString()} - {result.winnerDish.priceMax.toLocaleString()} đ
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.allRemovedCard, { backgroundColor: colors.warm, borderColor: colors.border }]}>
                  <Text style={[styles.allRemovedTitle, { color: colors.danger }]}>
                    🚫 KHÔNG TÌM THẤY MÓN ĐỒNG THUẬN
                  </Text>
                  <Text style={[styles.allRemovedBody, { color: colors.text }]}>
                    Cả nhóm đã loại toàn bộ các món trong Vòng 2. Đạt trạng thái kết thúc (ALL_REMOVED).
                  </Text>
                </View>
              )
            ) : null}

            {onFinish ? (
              <AppButton
                label="Hoàn tất phiên chọn món"
                onPress={onFinish}
                colors={colors}
              />
            ) : null}
          </View>
        )}

        {submissionState === 'error' && (
          <StatusNotice
            title="Lỗi nộp phiếu Vòng 2 (Fixture Error)"
            message={errorMessage}
            tone="error"
            actionLabel="Thử lại"
            onAction={() => {
              setScenario('consensus');
              handleSubmit('consensus');
            }}
            colors={colors}
          />
        )}

        {/* Global batch actions */}
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

        {/* Candidate List */}
        <View style={styles.candidateList}>
          {candidates.map((dish, index) => {
            const currentChoice = choices[dish.roundDishId] || 'KEEP';
            const isKeep = currentChoice === 'KEEP';
            const source = dish.artwork?.url ? { uri: dish.artwork.url } : undefined;

            return (
              <View
                key={dish.roundDishId}
                style={[
                  styles.candidateCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isKeep ? colors.primary : colors.line,
                    borderWidth: isKeep ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.candidateHeader}>
                  <Text style={[styles.candidateIndex, { color: colors.primary }]}>
                    Ứng viên #{index + 1}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: isKeep ? colors.primary : colors.danger },
                    ]}
                  >
                    <Text style={styles.statusPillText}>
                      {isKeep ? '✓ GIỮ' : '✕ ĐÃ LOẠI'}
                    </Text>
                  </View>
                </View>

                {/* Dish content summary */}
                <View style={styles.candidateBody}>
                  {source ? (
                    <Image source={source} style={styles.candidateImage as ImageStyle} />
                  ) : (
                    <View style={[styles.candidateFallback, { backgroundColor: colors.warm }]}>
                      <Text style={styles.candidateEmoji}>🍜</Text>
                    </View>
                  )}
                  <View style={styles.candidateMeta}>
                    <Text style={[styles.candidateName, { color: colors.text }]}>
                      {dish.name}
                    </Text>
                    <Text style={[styles.candidateVenue, { color: colors.muted }]}>
                      {dish.venueName || 'Quán ăn'}
                    </Text>
                    {dish.priceMin != null && dish.priceMax != null ? (
                      <Text style={[styles.candidatePrice, { color: colors.primary }]}>
                        {dish.priceMin.toLocaleString()} - {dish.priceMax.toLocaleString()} đ
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Dual Toggle Buttons */}
                <View style={styles.toggleRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Giữ món ${dish.name}`}
                    accessibilityState={{ selected: isKeep, disabled: isLocked }}
                    disabled={isLocked}
                    onPress={() => handleToggleChoice(dish.roundDishId, 'KEEP')}
                    style={[
                      styles.toggleBtn,
                      {
                        backgroundColor: isKeep ? colors.primary : colors.surface,
                        borderColor: colors.primary,
                        opacity: isLocked ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: isKeep ? colors.onPrimary : colors.primary },
                      ]}
                    >
                      ✓ Giữ
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Loại món ${dish.name}`}
                    accessibilityState={{ selected: !isKeep, disabled: isLocked }}
                    disabled={isLocked}
                    onPress={() => handleToggleChoice(dish.roundDishId, 'REMOVE')}
                    style={[
                      styles.toggleBtn,
                      {
                        backgroundColor: !isKeep ? colors.danger : colors.surface,
                        borderColor: colors.danger,
                        opacity: isLocked ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: !isKeep ? colors.onPrimary : colors.danger },
                      ]}
                    >
                      ✕ Đã loại
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Button Section */}
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
                handleSubmit('consensus');
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

        {/* Confirmation Modal */}
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
            onPress={handleSubmit}
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
  banner: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  bannerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  bannerSubtitle: { fontSize: 14, fontWeight: '600' },
  bannerRule: { fontSize: 12, lineHeight: 17 },
  scenarioCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  scenarioTitle: { fontSize: 13, fontWeight: '700' },
  scenarioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenarioChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  scenarioChipText: { fontSize: 12, fontWeight: '700' },
  batchActionsRow: { flexDirection: 'row', gap: 10 },
  batchButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  batchButtonText: { fontSize: 13, fontWeight: '700' },
  candidateList: { gap: 16 },
  candidateCard: { borderRadius: 16, padding: 14, gap: 12 },
  candidateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  candidateIndex: { fontSize: 13, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  candidateBody: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  candidateImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#E2E8F0' },
  candidateFallback: { width: 72, height: 72, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  candidateEmoji: { fontSize: 32 },
  candidateMeta: { flex: 1, gap: 4 },
  candidateName: { fontSize: 16, fontWeight: '700' },
  candidateVenue: { fontSize: 13 },
  candidatePrice: { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  toggleBtnText: { fontSize: 14, fontWeight: '700' },
  submitSection: { gap: 8, marginTop: 8 },
  summaryText: { fontSize: 13, textAlign: 'center' },
  allRemovedWarning: { fontSize: 12, textAlign: 'center', fontWeight: '600', paddingHorizontal: 16 },
  resultBox: { gap: 14 },
  winnerCard: { padding: 16, borderRadius: 16, borderWidth: 2, gap: 8 },
  winnerHeading: { fontSize: 16, fontWeight: '800' },
  winnerSubheading: { fontSize: 12 },
  winnerContent: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 4 },
  winnerEmoji: { fontSize: 40 },
  winnerInfo: { flex: 1, gap: 4 },
  winnerName: { fontSize: 18, fontWeight: '800' },
  winnerMeta: { fontSize: 13 },
  winnerPrice: { fontSize: 14, fontWeight: '700' },
  allRemovedCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  allRemovedTitle: { fontSize: 15, fontWeight: '800' },
  allRemovedBody: { fontSize: 13, lineHeight: 18 },
  modalMessage: { fontSize: 14, lineHeight: 20 },
});
