import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice, type VoteValue } from '../../../shared/ui';
import { TutorialHomeStage } from '../components/TutorialHomeStage';
import { TutorialHomeFooter } from '../components/TutorialHomeFooter';
import { TutorialSetupStage } from '../components/TutorialSetupStage';
import { TutorialSampleCard } from '../components/TutorialSampleCard';

const expected: Partial<Record<number, VoteValue>> = { 2: 'NO', 3: 'OK', 4: 'WANT' };
const labels = { NO: 'Không ăn', OK: 'Ăn được', WANT: 'Muốn ăn' };

/** Every action is local practice: no repository, session or live room dependency. */
export function TutorialScreen({ onExit, onComplete }: { onExit: () => void; onComplete?: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [step, setStep] = useState(0), [vote, setVote] = useState<VoteValue>(), [undone, setUndone] = useState(false), [complete, setComplete] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null), completed = useRef(false);
  const practice = step >= 2 && step <= 4, dimmed = !complete && (step === 0 || practice);
  const applyVote = useCallback((value: VoteValue) => { if (step >= 2 && step <= 4) setVote(value); }, [step]);
  const advance = () => {
    if (practice && vote !== expected[step]) return;
    if (step === 5) { if (undone && !completed.current) { completed.current = true; setComplete(true); onComplete?.(); } return; }
    if (step < 4) setVote(undefined);
    setStep(value => value + 1);
  };
  const restart = () => { completed.current = false; setStep(0); setVote(undefined); setUndone(false); setComplete(false); };
  const back = useCallback(() => { if (step === 0 || complete) { onExit(); return; } setStep(value => value - 1); setVote(undefined); setUndone(false); }, [complete, onExit, step]);
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => subscription.remove(); }, [back]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step, complete]);
  return <SafeAreaView style={[styles.root, { backgroundColor: dimmed ? '#426B57' : colors.background }]}>
    <ScrollView ref={scroll} contentContainerStyle={styles.content}>
      <View style={[styles.bar, { backgroundColor: dimmed ? '#043B22' : colors.surface }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={back} style={styles.back}><Image source={require('../../../../assets/brand/home/back.png')} accessible={false} style={[styles.backIcon, { tintColor: dimmed ? '#FFFFFF' : colors.text }]} /></Pressable>
        <Text accessibilityRole="header" style={[styles.barText, { color: dimmed ? '#FFFFFF' : colors.text }, textStyle(500)]}>{complete ? 'ĐÃ HOÀN TẤT' : step === 1 ? 'Tạo phòng' : step === 5 ? 'Vòng 1' : 'HƯỚNG DẪN'}</Text>
        {!complete && step !== 5 ? <Text accessibilityLabel={`Bước ${step + 1} trên 6`} style={[styles.barText, { color: dimmed ? '#FFFFFF' : colors.text }, textStyle(500)]}>{step < 2 ? `${step + 1}/2` : `${step - 1}/3`}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Bỏ qua hướng dẫn" onPress={onExit} style={styles.skip}><Text style={[styles.barText, { color: dimmed ? '#FFFFFF' : colors.text }, textStyle(500)]}>Bỏ qua</Text></Pressable>
      </View>
      {complete ? <>
        <StatusNotice title="Bạn đã sẵn sàng" message="Các thao tác vừa rồi chỉ áp dụng cho thẻ mẫu. Chưa có phòng hay phiếu nào được tạo." colors={colors} />
        <AppButton label="Xem lại hướng dẫn" onPress={restart} colors={colors} />
        <AppButton label="Về trang chủ" variant="secondary" onPress={onExit} colors={colors} />
      </> : step === 0 ? <>
        <TutorialHomeStage onCreate={advance} />
        <View style={[styles.coach, { backgroundColor: colors.surface }]}><View style={[styles.pointer, { backgroundColor: colors.surface }]} /><Text style={[styles.body, { color: colors.text }, textStyle(400)]}>Chạm Tạo phòng để bắt đầu.</Text></View>
        <TutorialHomeFooter />
        <Text style={[styles.mock, { color: '#FFFFFF' }, textStyle(400)]}>Hướng dẫn mẫu · không tạo phòng thật</Text>
      </> : step === 1 ? <TutorialSetupStage onNext={advance} /> : <>
        <View style={styles.sampleHeading}><Text style={[styles.body, { color: practice ? '#FFFFFF' : colors.text }, textStyle(400)]}>{step === 5 ? 'Chọn món' : 'Thẻ mẫu'}</Text><Text style={[styles.small, { color: practice ? '#FFFFFF' : colors.text }, textStyle(500)]}>{step === 5 ? '2 / 10' : 'Không tính lượt chọn'}</Text></View>
        <View style={[styles.progressTrack, { backgroundColor: colors.warm }]}><View style={[styles.progress, { backgroundColor: colors.green, width: step === 5 ? '20%' : '10%' }]} /></View>
        <TutorialSampleCard key={step} step={step} vote={vote} onVote={applyVote} />
        <View style={[styles.coach, { backgroundColor: practice ? colors.surface : colors.warm, borderColor: colors.line }, !practice && styles.undoCoach]}>
          <View style={[styles.pointer, { backgroundColor: practice ? colors.surface : colors.warm }]} />
          <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.text }, textStyle(600)]}>{step === 2 ? 'Vuốt sang trái' : step === 3 ? 'Vuốt sang phải' : step === 4 ? 'Nhấn đúp vào thẻ' : 'Chọn nhầm? Bạn có thể Hoàn tác.'}</Text>
          {practice ? <><Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{`để chọn ${labels[expected[step]!]}.`}</Text><Text style={[styles.small, { color: colors.muted }, textStyle(400)]}>Thử ngay trên thẻ mẫu</Text></> : null}
        </View>
        {practice ? <>
          <View accessibilityLabel="Nút thay thế thao tác vuốt" style={styles.voteButtons}>{(['NO', 'OK', 'WANT'] as const).map(value => <AppButton key={value} label={labels[value]} variant={vote === value ? 'primary' : 'secondary'} onPress={() => applyVote(value)} colors={colors} style={styles.voteButton} textStyle={{ fontSize: 12, lineHeight: 18, paddingHorizontal: 4, ...textStyle(600) }} />)}</View>
          {vote && vote !== expected[step] ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: '#FFFFFF' }, textStyle(500)]}>{`Ở bước này, hãy thử chọn ${labels[expected[step]!]}.`}</Text> : null}
          <AppButton label="Tiếp tục hướng dẫn" disabled={vote !== expected[step]} onPress={advance} colors={colors} />
        </> : <>
          <View style={styles.spacer} />
          <AppButton label="Hoàn tác trên thẻ mẫu" variant="secondary" disabled={undone} onPress={() => { setVote(undefined); setUndone(true); }} colors={colors} />
          <AppButton label="Hoàn tất hướng dẫn" disabled={!undone} onPress={advance} colors={colors} />
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 8 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', borderRadius: 12, minHeight: 48, paddingRight: 12, gap: 8 }, barText: { fontSize: 12, lineHeight: 18 }, back: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }, backIcon: { width: 20, height: 20 }, skip: { minHeight: 48, minWidth: 48, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'center' }, small: { fontSize: 12, lineHeight: 18 },
  sampleHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 12 }, progressTrack: { height: 4, borderRadius: 2 }, progress: { height: 4, borderRadius: 2 },
  coach: { borderRadius: 20, padding: 20, gap: 8, alignItems: 'center', marginTop: 24, marginBottom: 8 }, pointer: { position: 'absolute', top: -8, width: 18, height: 18, transform: [{ rotate: '45deg' }] }, undoCoach: { borderWidth: 1, borderRadius: 12 },
  voteButtons: { flexDirection: 'row', gap: 8 }, voteButton: { flex: 1, minWidth: 0 }, spacer: { flexGrow: 1, minHeight: 24 }, mock: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
