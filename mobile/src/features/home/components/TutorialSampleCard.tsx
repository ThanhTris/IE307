import { Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { VoteValue } from '../../../shared/ui';

// Explicit illustrations transcribed from T03–T06, never sent to a room/catalogue.
const examples = [
  { name: 'Phở bò tái nạm', description: 'Món nước · Việt Nam', price: '45.000–65.000đ / phần' },
  { name: 'Cơm tấm sườn', description: 'Cơm · Việt Nam', price: '40.000–60.000đ / phần' },
  { name: 'Bún bò Huế', description: 'Món nước · Việt Nam', price: '40.000–65.000đ / phần' },
  { name: 'Cơm tấm sườn', description: 'Cơm · Việt Nam', price: '40.000–60.000đ / phần' },
];
export function TutorialSampleCard({ step, vote, onPress }: { step: number; vote?: VoteValue; onPress: (event: GestureResponderEvent) => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const sample = examples[step - 2] ?? examples[0]!, practice = step < 5;
  return <View style={[styles.highlight, practice && styles.outline]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Mở món ${sample.name}`} accessibilityHint="Thẻ mẫu hướng dẫn. Nhấn đúp để thử chọn Muốn ăn." accessibilityState={{ disabled: !practice }} disabled={!practice} onPress={onPress} unstable_pressDelay={0} style={[styles.card, { backgroundColor: colors.surface, borderColor: vote ? colors.green : colors.line }]}>
      <Image source={require('../../../../assets/brand/entry-ui/leaf.png')} accessible={false} resizeMode="contain" style={[styles.leaf, { tintColor: colors.text }]} />
      <View style={[styles.circle, { backgroundColor: colors.warm }]}><Image source={require('../../../../assets/brand/entry-ui/tutorial-bowl.png')} accessible={false} resizeMode="contain" style={[styles.bowl, { tintColor: colors.text }]} /></View>
      {practice ? <View pointerEvents="none" style={styles.gesture}><Image source={require('../../../../assets/brand/entry-ui/hand.png')} accessible={false} resizeMode="contain" style={styles.hand} /><Text accessible={false} style={styles.arrow}>{step === 2 ? '←' : step === 3 ? '→' : '×2'}</Text></View> : null}
      <View style={styles.copy}><Text style={[styles.name, { color: colors.text }, textStyle(700)]}>{sample.name}</Text><Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{sample.description}</Text><Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{sample.price}</Text></View>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  highlight: { marginHorizontal: -6, padding: 4, borderWidth: 2, borderColor: 'transparent', borderRadius: 28 }, outline: { borderColor: '#FFFFFF' },
  card: { minHeight: 452, borderWidth: 1, borderRadius: 24, padding: 16 }, leaf: { position: 'absolute', top: 40, right: 64, width: 28, height: 28 },
  circle: { width: 180, height: 180, borderRadius: 90, alignSelf: 'center', marginTop: 56, marginBottom: 88, alignItems: 'center', justifyContent: 'center' }, bowl: { width: 96, height: 96 },
  gesture: { position: 'absolute', top: 195, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8 }, hand: { width: 60, height: 60, tintColor: '#FFFFFF' }, arrow: { color: '#FFFFFF', fontSize: 42, lineHeight: 52 },
  copy: { marginTop: 'auto', gap: 12 }, name: { fontSize: 22, lineHeight: 29 }, body: { fontSize: 15, lineHeight: 22 },
});
