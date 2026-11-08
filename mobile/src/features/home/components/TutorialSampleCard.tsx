import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { VoteValue } from '../../../shared/ui';
import { useTutorialCardMotion } from '../hooks/useTutorialCardMotion';

// Explicit illustrations transcribed from T03–T06, never sent to a room/catalogue.
const examples = [
  { name: 'Phở bò tái nạm', description: 'Món nước · Việt Nam', price: '45.000–65.000đ / phần' },
  { name: 'Cơm tấm sườn', description: 'Cơm · Việt Nam', price: '40.000–60.000đ / phần' },
  { name: 'Bún bò Huế', description: 'Món nước · Việt Nam', price: '40.000–65.000đ / phần' },
  { name: 'Cơm tấm sườn', description: 'Cơm · Việt Nam', price: '40.000–60.000đ / phần' },
];
export function TutorialSampleCard({ step, vote, onVote }: { step: number; vote?: VoteValue; onVote: (value: VoteValue) => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const sample = examples[step - 2] ?? examples[0]!, practice = step < 5;
  const motion = useTutorialCardMotion({ enabled: practice, vote, onVote });
  return <Animated.View testID="tutorial-swipe-card" {...motion.panHandlers} style={[styles.highlight, practice && styles.outline, !motion.reduceMotion && { transform: [...motion.position.getTranslateTransform(), { rotate: motion.rotate }] }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Mở món ${sample.name}`} accessibilityHint="Thẻ mẫu hướng dẫn. Nhấn đúp để thử chọn Muốn ăn." accessibilityState={{ disabled: !practice }} disabled={!practice} onPress={motion.tap} unstable_pressDelay={0} style={[styles.card, { backgroundColor: vote === 'WANT' ? colors.warm : colors.surface, borderColor: vote ? colors.green : colors.line }]}>
      <Animated.View testID="tutorial-want-glow" pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, { opacity: motion.flashOpacity, backgroundColor: colors.green }]} />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dragLabels}>
        <Animated.Text style={[styles.dragLabel, { opacity: motion.noOpacity, color: colors.text, backgroundColor: colors.warm }, textStyle(700)]}>Không ăn</Animated.Text>
        <Animated.Text style={[styles.dragLabel, { opacity: motion.okOpacity, color: colors.text, backgroundColor: colors.warm }, textStyle(700)]}>Ăn được</Animated.Text>
      </View>
      <Image source={require('../../../../assets/brand/entry-ui/leaf.png')} accessible={false} resizeMode="contain" style={[styles.leaf, { tintColor: colors.text }]} />
      <View style={[styles.circle, { backgroundColor: colors.warm }]}><Image source={require('../../../../assets/brand/entry-ui/tutorial-bowl.png')} accessible={false} resizeMode="contain" style={[styles.bowl, { tintColor: colors.text }]} /></View>
      {practice ? <View pointerEvents="none" style={styles.gesture}><Image source={require('../../../../assets/brand/entry-ui/hand.png')} accessible={false} resizeMode="contain" style={styles.hand} /><Text accessible={false} style={styles.arrow}>{step === 2 ? '←' : step === 3 ? '→' : '×2'}</Text></View> : null}
      <View style={styles.copy}><Text style={[styles.name, { color: colors.text }, textStyle(700)]}>{sample.name}</Text><Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{sample.description}</Text><Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{sample.price}</Text></View>
      {vote ? <Text accessibilityLiveRegion="polite" style={[styles.selected, { color: colors.text }, textStyle(600)]}>{`Đã chọn: ${vote === 'NO' ? 'Không ăn' : vote === 'OK' ? 'Ăn được' : 'Muốn ăn'}`}</Text> : null}
    </Pressable>
  </Animated.View>;
}
const styles = StyleSheet.create({
  highlight: { marginHorizontal: -6, padding: 4, borderWidth: 2, borderColor: 'transparent', borderRadius: 28 }, outline: { borderColor: '#FFFFFF' },
  card: { minHeight: 452, borderWidth: 1, borderRadius: 24, padding: 16 }, leaf: { position: 'absolute', top: 40, right: 64, width: 28, height: 28 },
  circle: { width: 180, height: 180, borderRadius: 90, alignSelf: 'center', marginTop: 56, marginBottom: 88, alignItems: 'center', justifyContent: 'center' }, bowl: { width: 96, height: 96 },
  gesture: { position: 'absolute', top: 195, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8 }, hand: { width: 60, height: 60, tintColor: '#FFFFFF' }, arrow: { color: '#FFFFFF', fontSize: 42, lineHeight: 52 },
  copy: { marginTop: 'auto', gap: 12 }, name: { fontSize: 22, lineHeight: 29 }, body: { fontSize: 15, lineHeight: 22 },
  glow: { borderRadius: 24 }, dragLabels: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }, dragLabel: { fontSize: 14, lineHeight: 21, padding: 8, borderRadius: 8 }, selected: { fontSize: 14, lineHeight: 21, marginTop: 16 },
});
