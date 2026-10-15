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
  MOCK_DISHES,
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

export type FinalChoice = 'KEEP' | 'REMOVE';

export type FinalRoundScreenProps = {
  candidates?: PoolDish[];
  roomId?: string;
  initialChoices?: Record<string, FinalChoice>;
  api?: ApiClient;
  simulateError?: boolean;
  onFinish?: () => void;
  onBack?: () => void;
};

export function FinalRoundScreen({
  candidates = MOCK_DISHES.slice(0, 2),
  roomId = 'room_demo_gm12',
  initialChoices,
  api,
  simulateError = false,
  onFinish,
  onBack,
}: FinalRoundScreenProps) {
  const { colors } = useShellTheme();

  // Initialize choices with default KEEP or custom initialChoices
  const [choices, setChoices] = useState<Record<string, FinalChoice>>(() => {
    if (initialChoices) return initialChoices;
    const initial: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      initial[dish.roundDishId] = 'KEEP';
    }
    return initial;
  });

  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>('idle');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [result, setResult] = useState<RoomResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const keepCount = candidates.filter(dish => choices[dish.roundDishId] === 'KEEP').length;
  const removeCount = candidates.filter(dish => choices[dish.roundDishId] === 'REMOVE').length;
  const allRemoved = removeCount === candidates.length && candidates.length > 0;

  const handleToggle = (roundDishId: string, choice: FinalChoice) => {
    setChoices(prev => ({
      ...prev,
      [roundDishId]: choice,
    }));
  };

  const handleOpenConfirm = () => {
    setConfirmDialogVisible(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialogVisible(false);
    setSubmitting(true);
    setSubmissionState('pending');
    setErrorMessage('');

    if (simulateError) {
      setSubmitting(false);
      setSubmissionState('error');
      setErrorMessage('Mô phỏng lỗi mạng khi gửi phiếu Vòng 2. Vui lòng thử lại.');
      return;
    }

    try {
      const votes: BallotVoteItem[] = candidates.map(dish => ({
        roundDishId: dish.roundDishId,
        vote: choices[dish.roundDishId] || 'KEEP',
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

      const res = api
        ? await api.submitBallot(req)
        : {
            ok: true as const,
            requestId: req.requestId,
            roomId,
            data: {
              accepted: true,
              round: 2 as const,
              allMembersSubmitted: true,
              roomVersion: 3,
              receipt: {
                round: 2 as const,
                intentId: req.intentId,
                requestId: req.requestId,
                submittedAt: new Date().toISOString(),
                voteCount: votes.length,
              },
            },
          };

      setSubmitting(false);

      if (res.ok) {
        setSubmissionState('ack');
        setReceipt(res.data.receipt ?? {
          round: 2,
          intentId: `intent_r2_${Date.now()}`,
          requestId: res.requestId ?? `req_r2_${Date.now()}`,
          submittedAt: new Date().toISOString(),
          voteCount: votes.length,
        });

        // Server-decided result
        if (allRemoved) {
          setResult({
            resultId: `res_r2_${Date.now()}`,
            roomId,
            round: 2,
            winnerRoundDishId: null,
            winnerDish: null,
            reasonCode: 'ALL_REMOVED',
            matchTier: 'NO_CONSENSUS',
            finalizedAt: new Date().toISOString(),
            policyVersion: 'decision-v2',
          });
        } else {
          // First kept dish as winner in mock
          const keptDish = candidates.find(dish => choices[dish.roundDishId] === 'KEEP');
          if (keptDish) {
            setResult({
              resultId: `res_r2_${Date.now()}`,
              roomId,
              round: 2,
              winnerRoundDishId: keptDish.roundDishId,
              winnerDish: keptDish,
              reasonCode: 'ACCEPTABLE_FINAL',
              matchTier: 'CONSENSUS',
              finalizedAt: new Date().toISOString(),
              policyVersion: 'decision-v2',
            });
          }
        }
      } else {
        setSubmissionState('error');
        setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
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

        {submissionState === 'pending' && (
          <StatusNotice
            title="Đang gửi lựa chọn Vòng 2… (Pending)"
            message="Đang truyền tải danh sách Giữ/Loại lên mock server. Chưa nhận ACK."
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

            {result ? (
              <View style={[styles.consensusCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <Text style={[styles.consensusHeading, { color: colors.text }]}>
                  {result.matchTier === 'NO_CONSENSUS'
                    ? 'Chưa đồng thuận (No Consensus)'
                    : 'Đã tìm thấy món đồng thuận! 🎉'}
                </Text>
                <Text style={[styles.consensusReason, { color: colors.muted }]}>
                  {result.reasonCode === 'ALL_REMOVED'
                    ? 'Tất cả các món đã bị loại bỏ ở vòng 2. Mỗi bạn hôm nay đều có gu ăn riêng.'
                    : `Món được chọn: ${result.winnerDish?.name || 'Món chiến thắng'}`}
                </Text>
                <Text style={[styles.noRoundThreeHint, { color: colors.primary }]}>
                  ✓ Hoàn tất phiên bình chọn (Tối đa 2 vòng — Không có Vòng 3).
                </Text>
              </View>
            ) : null}

            {onFinish ? (
              <AppButton label="Hoàn tất và về trang chủ" onPress={onFinish} colors={colors} />
            ) : null}
          </View>
        )}

        {submissionState === 'error' && (
          <StatusNotice
            title="Lỗi nộp phiếu Vòng 2 (Fixture Error)"
            message={errorMessage}
            tone="error"
            actionLabel="Thử lại"
            onAction={handleConfirmSubmit}
            colors={colors}
          />
        )}

        {/* Summary of current selections */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Lựa chọn hiện tại: Giữ {keepCount} · Loại {removeCount}
          </Text>
          {allRemoved ? (
            <Text style={[styles.allRemovedNotice, { color: colors.warning }]}>
              ⚠️ Bạn đang chọn LOẠI HẾT tất cả món. Thao tác này hoàn toàn hợp lệ.
            </Text>
          ) : (
            <Text style={[styles.summaryHint, { color: colors.muted }]}>
              Chạm vào &quot;Giữ&quot; hoặc &quot;Đã loại&quot; trên từng thẻ món để thay đổi.
            </Text>
          )}
        </View>

        {/* Candidate dish cards */}
        <View style={styles.candidateList}>
          {candidates.map((dish, index) => {
            const currentChoice = choices[dish.roundDishId] || 'KEEP';
            const priceMin = dish.priceMin ?? dish.price?.priceMin;
            const priceMax = dish.priceMax ?? dish.price?.priceMax;
            const priceLabel = priceMin
              ? `~${Math.round(priceMin / 1000)}k${priceMax && priceMax !== priceMin ? `–${Math.round(priceMax / 1000)}k` : ''} / phần`
              : 'Chưa có giá';

            return (
              <View key={dish.roundDishId} style={[styles.dishCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                {dish.artwork?.url ? (
                  <Image
                    source={{ uri: dish.artwork.url }}
                    style={styles.dishImage as ImageStyle}
                    accessibilityLabel={`Ảnh ${dish.name}`}
                  />
                ) : (
                  <View
                    accessibilityLabel={`Ảnh dự phòng ${dish.name}`}
                    style={[styles.dishFallback, { backgroundColor: colors.warm }]}
                  >
                    <Text style={styles.dishEmoji}>🍜</Text>
                  </View>
                )}

                <View style={styles.dishBody}>
                  <View style={styles.dishHeader}>
                    <Text style={[styles.dishName, { color: colors.text }]}>
                      #{index + 1} · {dish.name}
                    </Text>
                    <Text style={[styles.priceTag, { color: colors.muted }]}>
                      {priceLabel}
                    </Text>
                  </View>

                  {dish.description ? (
                    <Text style={[styles.dishDescription, { color: colors.muted }]}>
                      {dish.description}
                    </Text>
                  ) : null}

                  {dish.venueName ? (
                    <Text style={[styles.venueLabel, { color: colors.primary }]}>
                      📍 {dish.venueName}
                    </Text>
                  ) : null}

                  {/* Dual toggle: Giữ / Loại */}
                  <View style={styles.toggleRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Giữ món ${dish.name}`}
                      accessibilityState={{ selected: currentChoice === 'KEEP' }}
                      onPress={() => handleToggle(dish.roundDishId, 'KEEP')}
                      style={[
                        styles.toggleButton,
                        {
                          backgroundColor: currentChoice === 'KEEP' ? colors.green : colors.soft,
                          borderColor: currentChoice === 'KEEP' ? colors.green : colors.line,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          { color: currentChoice === 'KEEP' ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        ✓ Giữ
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Loại món ${dish.name}`}
                      accessibilityState={{ selected: currentChoice === 'REMOVE' }}
                      onPress={() => handleToggle(dish.roundDishId, 'REMOVE')}
                      style={[
                        styles.toggleButton,
                        {
                          backgroundColor: currentChoice === 'REMOVE' ? colors.danger : colors.soft,
                          borderColor: currentChoice === 'REMOVE' ? colors.danger : colors.line,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          { color: currentChoice === 'REMOVE' ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        ✕ Đã loại
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Submit button with explicit confirmation */}
        <View style={styles.submitSection}>
          <AppButton
            label={submitting ? 'Đang xử lý…' : 'Gửi lựa chọn Vòng 2 →'}
            disabled={submitting || submissionState === 'pending'}
            loading={submitting}
            onPress={handleOpenConfirm}
            colors={colors}
          />
        </View>

        {onBack ? (
          <AppButton label="Quay lại Vòng 1" variant="quiet" onPress={onBack} colors={colors} />
        ) : null}
      </ScrollView>

      {/* Confirmation Dialog */}
      <SheetDialog
        visible={confirmDialogVisible}
        title="Xác nhận nộp lựa chọn Vòng 2"
        onClose={() => setConfirmDialogVisible(false)}
        colors={colors}
      >
        <View style={styles.dialogBody}>
          <Text style={[styles.dialogText, { color: colors.text }]}>
            Bạn đã chọn Giữ {keepCount} món và Loại {removeCount} món.
          </Text>
          {allRemoved ? (
            <Text style={[styles.dialogWarning, { color: colors.warning }]}>
              Lưu ý: Bạn đang loại bỏ tất cả các món. Lựa chọn này là hợp lệ và sẽ được gửi lên server để chốt kết quả.
            </Text>
          ) : (
            <Text style={[styles.dialogText, { color: colors.muted }]}>
              Thao tác nộp phiếu là quyết định cuối cùng cho Vòng 2. Sau khi gửi sẽ không thể hoàn tác.
            </Text>
          )}
          <AppButton
            label="Xác nhận nộp phiếu"
            onPress={handleConfirmSubmit}
            colors={colors}
          />
        </View>
      </SheetDialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  banner: { padding: 16, borderRadius: 16, borderWidth: 1.5, gap: 6 },
  bannerTitle: { fontSize: 18, fontWeight: '800' },
  bannerSubtitle: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  bannerRule: { fontSize: 12, lineHeight: 17 },
  summaryCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  summaryTitle: { fontSize: 15, fontWeight: '700' },
  summaryHint: { fontSize: 12 },
  allRemovedNotice: { fontSize: 12, fontWeight: '700' },
  candidateList: { gap: 16 },
  dishCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  dishImage: { width: '100%', height: 140, backgroundColor: '#E2E8F0' },
  dishFallback: { width: '100%', height: 140, justifyContent: 'center', alignItems: 'center' },
  dishEmoji: { fontSize: 44 },
  dishBody: { padding: 14, gap: 10 },
  dishHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dishName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  priceTag: { fontSize: 12, fontWeight: '600' },
  dishDescription: { fontSize: 13, lineHeight: 18 },
  venueLabel: { fontSize: 12, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  toggleButton: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  submitSection: { gap: 8, marginTop: 8 },
  dialogBody: { gap: 12, paddingVertical: 8 },
  dialogText: { fontSize: 14, lineHeight: 20 },
  dialogWarning: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  resultBox: { gap: 12 },
  consensusCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  consensusHeading: { fontSize: 18, fontWeight: '800' },
  consensusReason: { fontSize: 14, lineHeight: 20 },
  noRoundThreeHint: { fontSize: 13, fontWeight: '700' },
});
