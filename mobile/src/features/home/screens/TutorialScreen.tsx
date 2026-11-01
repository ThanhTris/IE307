import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, BrandBanner, DishCard, StatusNotice, type VoteValue } from '../../../shared/ui';
import { MOCK_DISHES } from '../../../data/api/mock/discoveryFixtures';
import { HomeFlowFrame } from '../components/HomeFlowFrame';

const steps = ['Tạo phòng', 'Thiết lập phòng', 'Không ăn', 'Ăn được', 'Muốn ăn', 'Hoàn tác'] as const;
const expected: Partial<Record<number, VoteValue>> = { 2: 'NO', 3: 'OK', 4: 'WANT' };
const instruction = [
  'Chạm Tạo phòng để bắt đầu. Đây chỉ là ví dụ hướng dẫn.',
  'Chủ phòng chọn 10–20 món. Mọi người có thể tự chọn khẩu vị ở bước thiết lập.',
  'Vuốt sang trái để chọn Không ăn. Bạn cũng có thể dùng nút Không ăn.',
  'Vuốt sang phải để chọn Ăn được. Bạn cũng có thể dùng nút Ăn được.',
  'Nhấn đúp trên thẻ để chọn Muốn ăn. Bạn cũng có thể dùng nút Muốn ăn.',
  'Hoàn tác được trước khi gửi phiếu. Thử hoàn tác lựa chọn trên thẻ mẫu.',
];
const sample = { id: 'gm09-tutorial-only', name: MOCK_DISHES[0]?.name ?? 'Thẻ mẫu hướng dẫn', description: 'Thẻ mẫu hướng dẫn · không thuộc phòng đang chơi' };

/** No repository props: all actions are confined to this component's sample state. */
export function TutorialScreen({ onExit, onComplete }: { onExit: () => void; onComplete?: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [step, setStep] = useState(0), [vote, setVote] = useState<VoteValue>(), [undone, setUndone] = useState(false), [complete, setComplete] = useState(false);
  const lastTap = useRef<number | null>(null);
  const completed = useRef(false);
  const applyVote = useCallback((value: VoteValue) => { if (step >= 2 && step <= 4) setVote(value); }, [step]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => step >= 2 && step <= 4 && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dx) >= 40 && Math.abs(gesture.dx) > Math.abs(gesture.dy)) applyVote(gesture.dx < 0 ? 'NO' : 'OK'); },
  }), [applyVote, step]);
  const tap = (event?: GestureResponderEvent) => {
    const now = event?.nativeEvent.timestamp ?? Date.now();
    if (lastTap.current !== null && now - lastTap.current <= 350) { lastTap.current = null; applyVote('WANT'); }
    else lastTap.current = now;
  };
  const advance = () => {
    if (step >= 2 && step <= 4 && vote !== expected[step]) return;
    if (step === 5) { if (undone && !completed.current) { completed.current = true; setComplete(true); onComplete?.(); } return; }
    if (step < 4) setVote(undefined);
    setStep(value => value + 1); lastTap.current = null;
  };
  const restart = () => { completed.current = false; setStep(0); setVote(undefined); setUndone(false); setComplete(false); lastTap.current = null; };
  const back = () => { if (step === 0 || complete) { onExit(); return; } setStep(value => value - 1); setVote(undefined); setUndone(false); lastTap.current = null; };
  return <HomeFlowFrame title="Hướng dẫn chọn món" onHome={back} isMock>
    <View style={[styles.bar, { backgroundColor: colors.text }]}>
      <Text style={[styles.barText, { color: colors.surface }, textStyle(500)]}>{complete ? 'ĐÃ HOÀN TẤT' : `HƯỚNG DẪN · ${step + 1}/${steps.length}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Bỏ qua hướng dẫn" onPress={onExit} style={styles.skip}><Text style={[styles.barText, { color: colors.surface }, textStyle(500)]}>Bỏ qua</Text></Pressable>
    </View>
    {complete ? <>
      <StatusNotice title="Bạn đã sẵn sàng" message="Các thao tác vừa rồi chỉ áp dụng cho thẻ mẫu. Chưa có phòng hay phiếu nào được tạo." colors={colors} />
      <AppButton label="Xem lại hướng dẫn" onPress={restart} colors={colors} />
      <AppButton label="Về trang chủ" variant="secondary" onPress={onExit} colors={colors} />
    </> : <>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>{steps[step]}</Text>
      {step === 0 ? <View style={styles.sample}>
        <BrandBanner illustrationSource={require('../../../../assets/brand/home/friends-dining-slot.png')} titleTextStyle={textStyle(700)} colors={colors} />
        <AppButton label="Tạo phòng mẫu" iconSource={require('../../../../assets/brand/home/create.png')} iconSize={32} onPress={advance} colors={colors} />
      </View> : step === 1 ? <View style={[styles.coach, { backgroundColor: colors.warm }]}>
        <Text style={[styles.body, { color: colors.text }, textStyle(500)]}>Thiết lập minh họa · 15 món · Bữa trưa</Text>
        <AppButton label="Thử thiết lập mẫu" onPress={advance} colors={colors} />
      </View> : <View testID="tutorial-swipe-card" {...pan.panHandlers}>
        <DishCard dish={sample} selectedVote={vote} onVote={applyVote} onPress={tap} disabled={step === 5} delayPressIn={0} colors={colors} />
      </View>}
      <View style={[styles.coach, { backgroundColor: colors.surface, borderColor: colors.line }]}><Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.text }, textStyle(400)]}>{instruction[step]}</Text></View>
      {step >= 2 && step <= 4 && vote && vote !== expected[step] ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.text }, textStyle(500)]}>{`Ở bước này, hãy thử chọn ${steps[step]}.`}</Text> : null}
      {step >= 2 && step <= 4 ? <AppButton label="Tiếp tục hướng dẫn" disabled={vote !== expected[step]} onPress={advance} colors={colors} /> : null}
      {step === 5 ? <>
        <AppButton label="Hoàn tác trên thẻ mẫu" disabled={undone} onPress={() => { setVote(undefined); setUndone(true); }} colors={colors} />
        <AppButton label="Hoàn tất hướng dẫn" disabled={!undone} onPress={advance} colors={colors} />
      </> : null}
    </>}
  </HomeFlowFrame>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 12, marginBottom: 24 },
  barText: { fontSize: 12, lineHeight: 18 }, skip: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 27, lineHeight: 34, marginBottom: 20 }, body: { fontSize: 16, lineHeight: 24 },
  coach: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 16, marginVertical: 20 }, sample: { gap: 24 },
});
