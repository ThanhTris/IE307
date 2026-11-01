import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PoolDish, SubmissionReceipt } from '../../../data/api';
import { AppButton, StatusNotice, type Palette } from '../../../shared/ui';
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
  onGoToFinalRound,
  onRetryRoundTwo,
  colors,
}: VoteScenarioAndStatusBannerProps) {
  return (
    <>
      <StatusNotice
        title="GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)"
        message="Ba nút WANT/OK/NO luôn hiển thị. Double-tap thẻ đặt WANT nhưng không tự gửi. Scroll dọc không ghi nhận phiếu. UNSET khác OK. Dữ liệu mock fixture."
        tone="info"
        colors={colors}
      />

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
            message={`Biên nhận: ${receipt?.requestId || 'N/A'} · Đã gửi ${receipt?.voteCount || poolLength} phiếu.`}
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
  ackBox: { gap: 12 },
  roundTwoBox: { gap: 12 },
});
