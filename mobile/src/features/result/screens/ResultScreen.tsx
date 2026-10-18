import { useRef, useState, type ReactNode } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { RoomContext, RoomResult } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { ResultFrame, ResultPreviewLabel, ResultSection, resultStyles as s } from '../components/ResultFrame';
import { ResultOfferingCard, offeringActionLabels } from '../components/ResultOfferingCard';
import { belongsToWinner, isWinnerResult, publicTarget, tierCopy, timeLabel,
  type ExternalActionHandler, type OfferingState, type ResultAction, type ResultNavigation, type ResultOffering } from '../model';

export type ResultScreenProps = ResultNavigation & {
  result: RoomResult | null;
  context: RoomContext | null;
  offerings: OfferingState;
  readState?: 'ready' | 'loading' | 'error';
  onRefetch: () => void;
  onExternalAction?: ExternalActionHandler;
  previewLabel?: string;
  previewControls?: ReactNode;
};
const notices = {
  loading: ['Đang cập nhật nơi bán', 'Kết quả đã chốt được giữ nguyên trong khi tải nơi bán.'],
  error: ['Chưa tải được nơi bán', 'Kiểm tra kết nối rồi thử lại. Không chọn lại món thắng.'],
  stale: ['Thông tin nơi bán đã cũ', 'Cần cập nhật lại lịch và nguồn trước khi đi. Kết quả món ăn không thay đổi.'],
  closed: ['Nơi bán không còn phù hợp giờ ăn', 'Lịch mới báo đóng cửa. Cập nhật nơi bán khác cho cùng món hoặc tạo phiên mới.'],
  changed: ['Thông tin nơi bán đã thay đổi', 'Đối chiếu lại địa chỉ, giá và lịch mới bên dưới. Món đã chốt không thay đổi.'],
  unknown: ['Chưa đủ thông tin nơi bán', 'Không thể xác nhận lịch hoặc nơi bán phù hợp. Hãy cập nhật hoặc tạo phiên mới.'],
} as const;

function OfferingView({ offering, result, context, onExternalAction }: Pick<ResultScreenProps, 'context' | 'onExternalAction'> & { offering: ResultOffering; result: RoomResult }) {
  const [pending, setPending] = useState(false);
  const actionInFlight = useRef(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const target = publicTarget(offering, result, context);
  const labels = offeringActionLabels;
  const act = async (action: ResultAction) => {
    if (!target || !onExternalAction || actionInFlight.current) return;
    actionInFlight.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const response = await onExternalAction(action, target);
      setFeedback(response.ok ? `Đã nhận thao tác ${labels[action]}.` : 'Không thực hiện được thao tác. Hãy thử trình duyệt hoặc sao chép địa chỉ.');
    } catch {
      setFeedback('Không thực hiện được thao tác. Hãy thử trình duyệt hoặc sao chép địa chỉ.');
    } finally { actionInFlight.current = false; setPending(false); }
  };
  return <ResultOfferingCard offering={offering} hasPublicTarget={!!target} hasActionHandler={!!onExternalAction}
    pending={pending} feedback={feedback} onAction={action => { void act(action); }} />;
}

export function ResultScreen({ result, context, offerings, readState = 'ready', onHome, onNewSession, onRefetch,
  onExternalAction, previewLabel, previewControls }: ResultScreenProps) {
  const { colors } = useShellTheme();
  const valid = isWinnerResult(result);
  const showingWinner = readState === 'ready' && valid;
  const items = valid ? offerings.items.filter(item => belongsToWinner(item, result)) : [];
  const mismatched = valid && items.length !== offerings.items.length;
  const notice = offerings.status === 'ready' ? null : notices[offerings.status];
  return <ResultFrame onHome={onHome}>
    <FlatList data={showingWinner ? items : []} keyExtractor={item => item.offeringId}
      contentContainerStyle={s.content} ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      renderItem={({ item }) => valid ? <OfferingView key={`${result.resultId}:${item.offeringId}:${item.dish.venueId}:${item.dish.venueAddress}:${context?.anchorId}`} offering={item} result={result} context={context} onExternalAction={onExternalAction} /> : null}
      ListHeaderComponent={<View style={s.stack}>
        <ResultPreviewLabel label={previewLabel} />
        {readState === 'loading' ? <StatusNotice title="Đang tải kết quả" message="Chờ kết quả đã chốt, không chọn món trên máy." colors={colors} />
          : readState === 'error' || !valid ? <StatusNotice title="Chưa đọc được kết quả" message="Cập nhật lại kết quả trước khi xem nơi bán. Không suy món thắng từ danh sách món." tone="error" colors={colors} />
            : <>
              <View style={s.hero}>
                <View style={[s.badge, { backgroundColor: colors.warm }]}><Text style={[s.body, { color: colors.text }]}>✓ {tierCopy[result.matchTier].label}</Text></View>
                <Text accessibilityRole="header" style={[s.title, { color: colors.text }]}>Hôm nay ăn{ '\n' }{result.winnerDish.name}!</Text>
                <Text accessible={false} style={s.emoji}>🍜</Text>
                <Text style={[s.body, s.center, { color: colors.text }]}>{tierCopy[result.matchTier].reason}</Text>
              </View>
              <ResultSection title="Điểm ăn chung">
                <Text style={[s.body, { color: colors.text }]}>{context?.anchorName ?? 'Chưa rõ điểm ăn chung'}{ '\n' }Giờ ăn: {timeLabel(context?.desiredAt ?? null)}</Text>
              </ResultSection>
              <Text accessibilityRole="header" style={[s.heading, { color: colors.text }]}>Nơi bán cho món đã chốt</Text>
              <Text style={[s.caption, { color: colors.muted }]}>Lấy thông tin lúc: {timeLabel(offerings.fetchedAt)}</Text>
              {notice ? <StatusNotice title={notice[0]} message={notice[1]} tone={offerings.status === 'error' ? 'error' : 'warning'} colors={colors} /> : null}
              {mismatched ? <StatusNotice title="Thông tin nơi bán không khớp kết quả" message="Đã bỏ qua nơi bán của món khác. Hãy cập nhật lại thông tin cho món đã chốt." tone="error" colors={colors} /> : null}
              {items.length === 0 && offerings.status !== 'loading' ? <StatusNotice title="Chưa có nơi bán phù hợp" message="Kết quả món ăn vẫn được giữ nguyên. Cập nhật nơi bán hoặc tạo phiên mới để chọn lại bối cảnh." colors={colors} /> : null}
            </>}
      </View>}
      ListFooterComponent={<View style={s.stack}>
        <AppButton label={showingWinner ? 'Cập nhật nơi bán' : 'Tải lại kết quả'} variant="secondary" disabled={readState === 'loading' || (showingWinner && offerings.status === 'loading')} onPress={() => onRefetch()} colors={colors} />
        <AppButton label="＋ Tạo phiên mới" onPress={() => onNewSession()} colors={colors} accessibilityHint="Tạo phòng mới, chọn lại bối cảnh và phiếu; không mang phiếu cũ." />
        <AppButton label="Kết thúc · Về trang chủ" variant="quiet" onPress={() => onHome()} colors={colors} />
        {previewControls}
      </View>} />
  </ResultFrame>;
}
