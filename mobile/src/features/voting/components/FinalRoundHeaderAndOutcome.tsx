import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoomResult, SubmissionReceipt } from '../../../data/api';
import { AppButton, StatusNotice, type Palette } from '../../../shared/ui';
import type { FinalScreenScenario } from '../fixtures';

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
  onFinish,
  onRetryConsensus,
  colors,
}: FinalRoundHeaderAndOutcomeProps) {
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
          Giữ mặc định nhưng phải xác nhận nộp. Loại hết tất cả món vẫn hoàn toàn hợp lệ. Tối đa 2 vòng, không bao giờ mở vòng 3.
        </Text>
      </View>

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
            message={`Biên nhận: ${receipt?.requestId || 'N/A'} · Đã gửi ${receipt?.voteCount || candidatesLength} lựa chọn.`}
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
          onAction={onRetryConsensus}
          colors={colors}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  bannerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  bannerSubtitle: { fontSize: 14, fontWeight: '600' },
  bannerRule: { fontSize: 12, lineHeight: 17 },
  scenarioCard: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  scenarioTitle: { fontSize: 13, fontWeight: '700' },
  scenarioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenarioChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  scenarioChipText: { fontSize: 12, fontWeight: '700' },
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
});
