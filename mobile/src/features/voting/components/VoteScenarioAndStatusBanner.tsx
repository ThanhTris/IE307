import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PoolDish, SubmissionReceipt } from '../../../data/api';
import { AppButton, StatusNotice, WaitingSummary, type Palette } from '../../../shared/ui';
import type { VoteScreenScenario } from '../fixtures';

export interface VoteScenarioAndStatusBannerProps {
  showScenarioPicker: boolean;
  submissionState: 'idle' | 'pending' | 'ack' | 'error';
  scenario: VoteScreenScenario;
  setScenario: (scenario: VoteScreenScenario) => void;
  lastActionNotice: string;
  receipt: SubmissionReceipt | null;
  poolLength: number;
  isWaitingForMembers: boolean;
  needsRoundTwo: boolean;
  roundTwoCandidates: PoolDish[];
  errorMessage: string;
  waitingCountdown?: number | null;
  isHost?: boolean;
  setIsHost?: (isHost: boolean) => void;
  rosterAcknowledgedCount?: number;
  setRosterAcknowledgedCount?: (count: number) => void;
  totalRosterCount?: number;
  canHostEarlyFinish?: boolean;
  onHostEarlyFinish?: () => void;
  onGoToFinalRound?: (candidates: PoolDish[]) => void;
  onRetryRoundTwo: () => void;
  colors: Palette;
}

export function VoteScenarioAndStatusBanner({
  showScenarioPicker,
  submissionState,
  scenario,
  setScenario,
  lastActionNotice,
  receipt,
  poolLength,
  isWaitingForMembers,
  needsRoundTwo,
  roundTwoCandidates,
  errorMessage,
  waitingCountdown,
  isHost = true,
  setIsHost,
  rosterAcknowledgedCount = 2,
  setRosterAcknowledgedCount,
  totalRosterCount = 3,
  canHostEarlyFinish = false,
  onHostEarlyFinish,
  onGoToFinalRound,
  onRetryRoundTwo,
  colors,
}: VoteScenarioAndStatusBannerProps) {
  return (
    <>
      <StatusNotice
        title="GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)"
        message="Flashcard từng thẻ: vuốt trái NO, vuốt phải OK, chạm hai lần WANT kèm 3 nút thay gesture. Hoàn tác Undo trước khi gửi. Đếm ngược 60s và nút Chốt ngay khi A_r > M/2."
        tone="info"
        colors={colors}
      />

      {showScenarioPicker ? (
        <View style={[styles.scenarioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.scenarioTitle, { color: colors.text }]}>
            🧪 Kịch bản thử nghiệm (QA / Fixture Scenario):
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
                    ? '⚡ Vòng 2 (#1)'
                    : item === 'waiting'
                    ? '⏳ Chờ nhóm'
                    : item === 'success'
                    ? '🎉 Đồng thuận'
                    : '⚠ Lỗi/Retry'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Simulated waiting controls */}
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
            message={`Biên nhận: ${receipt?.requestId || 'N/A'} · Đã gửi ${receipt?.voteCount || poolLength} phiếu.`}
            tone="success"
            colors={colors}
          />

          {isWaitingForMembers ? (
            <View style={styles.waitingContainer}>
              <StatusNotice
                title="Đang đợi các thành viên khác nộp phiếu… (Chờ kết quả)"
                message="Phiếu của bạn đã được ghi nhận. Chưa thể xác định kết quả do nhóm chưa nộp đủ."
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
          onAction={onRetryRoundTwo}
          colors={colors}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scenarioCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  scenarioTitle: { fontSize: 13, fontWeight: '700' },
  scenarioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenarioChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  scenarioChipText: { fontSize: 12, fontWeight: '700' },
  waitingControlsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  controlLabel: { fontSize: 11, fontWeight: '600' },
  smallChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  smallChipText: { fontSize: 11, fontWeight: '700' },
  ackBox: { gap: 12 },
  waitingContainer: { gap: 10 },
  waitingRuleCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  waitingRuleText: { fontSize: 12, fontWeight: '700' },
  waitingRuleSubtext: { fontSize: 11, lineHeight: 16 },
  roundTwoBox: { gap: 12 },
});
