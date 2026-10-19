import { useState } from 'react';
import { Text, View } from 'react-native';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { AppButton } from '../shared/ui';
import { NoConsensusScreen, ResultScreen } from '../features/result';
import { resultStyles as s } from '../features/result/components/ResultFrame';
import { noConsensusFixture, offeringFixture, resultContext, winnerFixture, type OfferingScenario, type WinnerTier } from './resultFixtures';
import { setPreviewScenario } from './roomPreview';

type Props = { noConsensus?: boolean; onHome: () => void; onNewSession: () => void; onOtherScreen: () => void };
const scenarios: { value: OfferingScenario; label: string }[] = [
  { value: 'ready', label: 'Có nơi bán' }, { value: 'empty', label: 'Không có nơi bán' },
  { value: 'stale', label: 'Nơi bán cũ' }, { value: 'closed', label: 'Đóng cửa' },
  { value: 'changed', label: 'Đổi thông tin' }, { value: 'unknown', label: 'Chưa rõ dữ liệu' },
  { value: 'loading-initial', label: 'Đang tải nơi bán lần đầu' },
  { value: 'loading-refresh', label: 'Đang cập nhật nơi bán' },
  { value: 'error-initial', label: 'Lỗi tải nơi bán lần đầu' },
  { value: 'error-refresh', label: 'Lỗi cập nhật nơi bán' },
];
export function ResultPreview({ noConsensus = false, onHome, onNewSession, onOtherScreen }: Props) {
  const { colors } = useShellTheme();
  const [expanded, setExpanded] = useState(false);
  const [tier, setTier] = useState<WinnerTier>('PERFECT');
  const [reason, setReason] = useState<'EMPTY_INTERSECTION' | 'ALL_REMOVED'>('EMPTY_INTERSECTION');
  const [scenario, setScenario] = useState<OfferingScenario>('ready');
  const [readState, setReadState] = useState<'ready' | 'loading' | 'error'>('ready');
  const [refreshed, setRefreshed] = useState(false);
  const [actionFails, setActionFails] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const result = winnerFixture(tier);
  const createNew = () => {
    // Reset only GM-09's in-memory synthetic room, never any real membership/cache.
    setPreviewScenario('default');
    onNewSession();
  };
  const tools = <View style={s.stack}>
    {actionFeedback ? <Text accessibilityLiveRegion="polite" style={[s.body, { color: colors.text }]}>{actionFeedback}</Text> : null}
    <AppButton label={expanded ? 'Ẩn công cụ GM-13' : 'Công cụ kiểm thử GM-13'} variant="secondary" onPress={() => setExpanded(!expanded)} colors={colors} />
    {expanded ? <>
      <Text style={[s.caption, { color: colors.muted }]}>Đổi fixture tạo kịch bản mẫu khác. Cập nhật nơi bán giữ cùng món và mã kết quả.</Text>
      {noConsensus ? <View style={s.stack}>
        <AppButton label="Không giao nhau vòng 1" variant="secondary" onPress={() => setReason('EMPTY_INTERSECTION')} colors={colors} />
        <AppButton label="Loại hết vòng 2" variant="secondary" onPress={() => setReason('ALL_REMOVED')} colors={colors} />
      </View> : <>
        <View style={s.actions}>{(['PERFECT', 'CONSENSUS', 'COMPROMISE'] as const).map(value => <AppButton key={value}
          label={`Fixture ${value}`} variant="secondary" style={s.action} colors={colors} onPress={() => { setTier(value); setReadState('ready'); }} />)}</View>
        <View style={s.actions}>{scenarios.map(option => <AppButton key={option.value} label={`Fixture ${option.label}`} variant="secondary" style={s.action} colors={colors}
          onPress={() => { setScenario(option.value); setReadState('ready'); setRefreshed(false); }} />)}</View>
        <AppButton label="Fixture đang tải kết quả" variant="secondary" onPress={() => setReadState('loading')} colors={colors} />
        <AppButton label="Fixture lỗi kết quả" variant="secondary" onPress={() => setReadState('error')} colors={colors} />
        <AppButton label={actionFails ? 'Mô phỏng thao tác thành công' : 'Mô phỏng lỗi Maps/review/copy'} variant="secondary" onPress={() => setActionFails(!actionFails)} colors={colors} />
        <Text style={[s.caption, { color: colors.muted }]}>Fixture hiện tại: {tier} · {result.resultId}</Text>
      </>}
      <AppButton label={noConsensus ? 'Xem kết quả có món' : 'Xem chưa đồng thuận'} variant="secondary" onPress={onOtherScreen} colors={colors} />
    </> : null}
  </View>;
  const navigation = { onHome, onNewSession: createNew, previewLabel: 'Mô phỏng · GM-13', previewControls: tools };
  return noConsensus ? <NoConsensusScreen {...navigation} result={noConsensusFixture(reason)} />
    : <ResultScreen {...navigation} result={readState === 'ready' ? result : null} context={resultContext}
      readState={readState} offerings={offeringFixture(result, scenario, refreshed)}
      onRefetch={() => { setScenario('ready'); setReadState('ready'); setRefreshed(true); }}
      onExternalAction={(action, target) => {
        setActionFeedback(`Mô phỏng ${action} · ${target.venueName} · ${target.address}. Chưa mở provider hoặc sao chép thật.`);
        return { ok: !actionFails };
      }} />;
}
