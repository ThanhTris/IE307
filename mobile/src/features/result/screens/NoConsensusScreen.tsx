import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { RoomResult } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { ResultFrame, ResultPreviewLabel, resultStyles as s } from '../components/ResultFrame';
import { noConsensusReason, type ResultNavigation } from '../model';

export type NoConsensusScreenProps = ResultNavigation & { result: RoomResult | null; previewLabel?: string; previewControls?: ReactNode };
export function NoConsensusScreen({ result, onHome, onNewSession, previewLabel, previewControls }: NoConsensusScreenProps) {
  const { colors } = useShellTheme();
  const reason = noConsensusReason(result);
  return <ResultFrame onHome={onHome}>
    <ScrollView contentContainerStyle={s.content}>
      <ResultPreviewLabel label={previewLabel} />
      <View style={s.hero}>
        <Text accessible={false} style={s.emoji}>🥢</Text>
        <Text accessibilityRole="header" style={[s.title, { color: colors.text }]}>{reason ? 'Chưa chọn được món chung' : 'Chưa đọc được kết quả'}</Text>
        <Text style={[s.body, s.center, { color: colors.text }]}>{reason ?? 'Cần kiểm tra lại kết quả đã chốt trước khi kết luận chưa đồng thuận.'}</Text>
        {reason ? <Text style={[s.body, s.center, { color: colors.muted }]}>Mỗi bữa một gu, mình thử một kèo khác nhé!</Text> : null}
      </View>
      <StatusNotice title="Bắt đầu lại bằng một phiên mới" message={reason ? 'Phiên này đã kết thúc. Không có vòng ba; phiên mới cần chọn lại bối cảnh, sẵn sàng và phiếu của từng bạn.' : 'Bạn có thể về trang chủ hoặc tạo phiên mới. Không dùng dữ liệu chưa xác nhận làm kết quả.'} colors={colors} />
      <AppButton label="＋ Tạo phiên mới" onPress={() => onNewSession()} colors={colors} />
      <AppButton label="Kết thúc · Về trang chủ" variant="quiet" onPress={() => onHome()} colors={colors} />
      {previewControls}
    </ScrollView>
  </ResultFrame>;
}
