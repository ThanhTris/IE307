import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoomResult, SubmissionReceipt } from '../../../data/api';
import { AppButton, StatusNotice, WaitingSummary, type Palette } from '../../../shared/ui';
import type { FinalScreenScenario } from '../fixtures';
import { formatDishPrice } from '../services/priceLabel';

export interface FinalRoundHeaderAndOutcomeProps {
  showScenarioPicker: boolean;
  submissionState: 'idle' | 'pending' | 'ack' | 'error';
  scenario: FinalScreenScenario;
  setScenario: (scenario: FinalScreenScenario) => void;
  receipt: SubmissionReceipt | null;
  candidatesLength: number;
  isWaitingForMembers: boolean;
  result: RoomResult | null;
  errorMessage: string;
  eliminationCap?: number;
  removedCount?: number;
  capNotice?: string;
  waitingCountdown?: number | null;
  isHost?: boolean;
  setIsHost?: (isHost: boolean) => void;
  rosterAcknowledgedCount?: number;
  setRosterAcknowledgedCount?: (count: number) => void;
  totalRosterCount?: number;
  canHostEarlyFinish?: boolean;
  onHostEarlyFinish?: () => void;
  onFinish?: () => void;
  onRetryConsensus: () => void;
  colors: Palette;
}

export function FinalRoundHeaderAndOutcome({
  showScenarioPicker,
  submissionState,
  scenario,
  setScenario,
  receipt,
  candidatesLength,
  isWaitingForMembers,
  result,
  errorMessage,
  eliminationCap = 1,
  removedCount = 0,
  capNotice = '',
  waitingCountdown,
  isHost = true,
  setIsHost,
  rosterAcknowledgedCount = 2,
  setRosterAcknowledgedCount,
  totalRosterCount = 3,
  canHostEarlyFinish = false,
  onHostEarlyFinish,
  onFinish,
  onRetryConsensus,
  colors,
}: FinalRoundHeaderAndOutcomeProps) {
  const winnerPriceLabel = result?.winnerDish ? formatDishPrice(result.winnerDish) : undefined;
  return (
    <>
      <View style={[styles.banner, { backgroundColor: colors.warm, borderColor: colors.primary }]}>
        <Text style={[styles.bannerTitle, { color: colors.primary }]}>
          ⚡ VÒNG 2 · CHỌN LỌC
        </Text>
        <Text style={[styles.bannerSubtitle, { color: colors.text }]}>
          Các món cả nhóm cùng ăn được. Chọn Giữ hoặc Loại để chốt.
        </Text>
        <Text style={[styles.bannerRule, { color: colors.muted }]}>
          Quy tắc Cap 30%: Bạn được loại tối đa {eliminationCap} món (kể cả N=1). Không bắt buộc loại món nào. Tối đa 2 vòng, không bao giờ mở vòng 3.
        </Text>

        <View style={[styles.capBadge, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Text style={[styles.capBadgeText, { color: colors.primary }]}>
            🎯 Đã chọn loại: {removedCount}/{eliminationCap} món (Tối đa {eliminationCap})
          </Text>
        </View>
      </View>

      {capNotice ? (
        <StatusNotice title="Giới hạn loại món (Cap 30%)" message={capNotice} tone="warning" colors={colors} />
      ) : null}

      {showScenarioPicker ? (
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

          {isWaitingForMembers && setIsHost && setRosterAcknowledgedCount ? (
            <View style={styles.waitingControlsRow}>
              <Text style={[styles.controlLabel, { color: colors.muted }]}>Mô phỏng chờ:</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Chuyển vai trò sang ${isHost ? 'Thành viên' : 'Host'}`}
                onPress={() => setIsHost(!isHost)}
                style={[styles.smallChip, { borderColor: colors.border }]}
              >
                <Text style={[styles.smallChipText, { color: colors.primary }]}>
                  Vai trò: {isHost ? 'Host 👑' : 'Thành viên 👤'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chuyển tiến độ 1/3 ACK"
                onPress={() => setRosterAcknowledgedCount(1)}
                style={[
                  styles.smallChip,
                  {
                    borderColor: rosterAcknowledgedCount === 1 ? colors.danger : colors.border,
                    backgroundColor: rosterAcknowledgedCount === 1 ? colors.warm : colors.surface,
                  },
                ]}
              >
                <Text style={styles.smallChipText}>1/3 (Chưa đủ &gt;50%)</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chuyển tiến độ 2/3 ACK"
                onPress={() => setRosterAcknowledgedCount(2)}
                style={[
                  styles.smallChip,
                  {
                    borderColor: rosterAcknowledgedCount === 2 ? colors.primary : colors.border,
                    backgroundColor: rosterAcknowledgedCount === 2 ? colors.soft : colors.surface,
                  },
                ]}
              >
                <Text style={styles.smallChipText}>2/3 (Đủ &gt;50%)</Text>
              </Pressable>
            </View>
          ) : null}
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
            message={`Biên nhận: ${receipt?.requestId || 'N/A'} · Đã gửi ${receipt?.voteCount || candidatesLength} lựa chọn.`}
            tone="success"
            colors={colors}
          />

          {isWaitingForMembers ? (
            <View style={styles.waitingContainer}>
              <StatusNotice
                title="Đang đợi các thành viên khác nộp phiếu… (Chờ kết quả nhóm)"
                message="Lựa chọn Vòng 2 của bạn đã được ghi nhận. Chưa có kết quả cuối cùng do các thành viên khác chưa nộp xong."
                tone="info"
                colors={colors}
              />
              <WaitingSummary
                acknowledged={rosterAcknowledgedCount}
                total={totalRosterCount}
                deadlineLabel={waitingCountdown != null ? `${waitingCountdown}s (Hạn 60s)` : 'Đang tính...'}
                statusLabel={`${rosterAcknowledgedCount}/${totalRosterCount} thành viên đã gửi phiếu`}
                colors={colors}
              />
              <View style={[styles.waitingRuleCard, { backgroundColor: colors.soft, borderColor: colors.line }]}>
                <Text style={[styles.waitingRuleText, { color: colors.text }]}>
                  ⏱ Countdown 60s theo deadline server sau lần vào waiting hợp lệ đầu tiên.
                </Text>
                <Text style={[styles.waitingRuleSubtext, { color: colors.muted }]}>
                  {isHost
                    ? canHostEarlyFinish
                      ? `👑 Bạn là Host. Đã có ${rosterAcknowledgedCount}/${totalRosterCount} thành viên nộp (quá nửa roster khóa A_r > M/2). Bạn có thể bấm Chốt ngay!`
                      : `👑 Bạn là Host. Hiện có ${rosterAcknowledgedCount}/${totalRosterCount} thành viên nộp (chưa quá nửa roster khóa). Nút Chốt ngay bị khóa cho đến khi đủ đa số.`
                    : '👤 Bạn là Thành viên. Vui lòng chờ Host chốt sớm hoặc chờ đồng hồ đếm ngược hết hạn.'}
                </Text>
              </View>

              {isHost && onHostEarlyFinish ? (
                <AppButton
                  label={
                    canHostEarlyFinish
                      ? 'Chốt ngay · Kết thúc chờ sớm (Đã quá nửa)'
                      : `Chốt ngay (${rosterAcknowledgedCount}/${totalRosterCount} chưa quá nửa)`
                  }
                  disabled={!canHostEarlyFinish}
                  onPress={onHostEarlyFinish}
                  colors={colors}
                />
              ) : null}
            </View>
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
                    {result.winnerDish.venueName ? (
                      <Text style={[styles.winnerMeta, { color: colors.muted }]}>
                        {result.winnerDish.venueName}
                      </Text>
                    ) : null}
                    {winnerPriceLabel ? (
                      <Text style={[styles.winnerPrice, { color: colors.primary }]}>
                        {winnerPriceLabel}
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
          onAction={onRetryConsensus}
          colors={colors}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  bannerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  bannerSubtitle: { fontSize: 14, fontWeight: '600' },
  bannerRule: { fontSize: 12, lineHeight: 17 },
  capBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start', marginTop: 2 },
  capBadgeText: { fontSize: 12, fontWeight: '800' },
  scenarioCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  scenarioTitle: { fontSize: 13, fontWeight: '700' },
  scenarioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenarioChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  scenarioChipText: { fontSize: 12, fontWeight: '700' },
  waitingControlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  controlLabel: { fontSize: 11, fontWeight: '600' },
  smallChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  smallChipText: { fontSize: 11, fontWeight: '700' },
  resultBox: { gap: 14 },
  waitingContainer: { gap: 10 },
  waitingRuleCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  waitingRuleText: { fontSize: 12, fontWeight: '700' },
  waitingRuleSubtext: { fontSize: 11, lineHeight: 16 },
  winnerCard: { padding: 16, borderRadius: 16, borderWidth: 2, gap: 8 },
  winnerHeading: { fontSize: 16, fontWeight: '800' },
  winnerSubheading: { fontSize: 12 },
  winnerContent: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 4 },
  winnerEmoji: { fontSize: 40 },
  winnerInfo: { flex: 1, gap: 4 },
  winnerName: { fontSize: 18, fontWeight: '800' },
  winnerMeta: { fontSize: 13 },
  winnerPrice: { fontSize: 14, fontWeight: '700' },
  podiumContainer: { marginTop: 8, gap: 4 },
  podiumTitle: { fontSize: 12, fontWeight: '600' },
  allRemovedCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  allRemovedTitle: { fontSize: 15, fontWeight: '800' },
  allRemovedBody: { fontSize: 13, lineHeight: 18 },
});
