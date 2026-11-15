import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useDialogMotion } from '../../../shared/lib/useDialogMotion';
import { AppButton, SheetDialog } from '../../../shared/ui';
import { ResultDishArtwork } from '../../../shared/ui/result/ResultDishArtwork';
import type { RankedDish } from '../services/resultPresentation';
import { lightColors } from '../../../shared/theme/tokens';

export function WinnerCelebration({ winner, imageSource, imageScale, onDismiss }: { winner: RankedDish; imageSource?: ImageSourcePropType; imageScale?: number; onDismiss: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), { height } = useWindowDimensions();
  const motion = useDialogMotion(height), close = () => motion.dismiss(onDismiss);
  return <SheetDialog visible title="Món chiến thắng" showTitle={false} presentation="dialog" colors={colors} showClose={false} showHandle={false} onClose={close} nativeAnimation="none" backdropColor="rgba(8,20,10,0.72)" backdropAnimation={{ opacity: motion.opacity }} panelAnimation={{ transform: [{ translateY: motion.translation }] }}>
    <ScrollView style={{ maxHeight: height * 0.7 }} contentContainerStyle={{ alignItems: 'center' }}><Pressable accessible={false} disabled={motion.closing} onPress={close} style={styles.content}>
      <View accessible={false} style={styles.medal}>
        <Image source={require('../../../../assets/brand/result/laurel.png')} resizeMode="contain" style={styles.leaf} />
        <View style={[styles.circle, { backgroundColor: colors.green }]}><Text style={[styles.number, { color: lightColors.text }, textStyle(700)]}>1</Text></View>
        <Image source={require('../../../../assets/brand/result/laurel.png')} resizeMode="contain" style={[styles.leaf, { transform: [{ scaleX: -1 }] }]} />
      </View>
      <Text accessibilityRole="header" style={[styles.name, { color: colors.text }, textStyle(700)]}>Món chiến thắng</Text>
      <ResultDishArtwork source={imageSource} imageScale={imageScale} uri={winner.dish.artwork?.uri} label={winner.dish.name} winner size={180} colors={colors} />
      <Text style={[styles.name, { color: colors.text }, textStyle(700)]}>{winner.dish.name}</Text>
      <Text style={[styles.points, { color: colors.text, backgroundColor: colors.warm }, textStyle(700)]}>{winner.score} điểm</Text>
      {winner.dish.artwork?.attribution ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{winner.dish.artwork.attribution}</Text> : null}
      <AppButton label="Chạm để bỏ qua" variant="quiet" disabled={motion.closing} onPress={close} colors={colors} style={styles.dismiss} />
    </Pressable></ScrollView>
  </SheetDialog>;
}
const styles = StyleSheet.create({ content: { alignItems: 'center', gap: 16 }, medal: { flexDirection: 'row', alignItems: 'center', gap: 12 }, leaf: { width: 24, height: 44 }, circle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }, number: { color: '#FFFFFF', fontSize: 42, lineHeight: 54 }, name: { fontSize: 24, lineHeight: 32, textAlign: 'center' }, points: { fontSize: 26, lineHeight: 34, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 }, caption: { fontSize: 12, lineHeight: 18, textAlign: 'center' }, dismiss: { alignSelf: 'stretch', backgroundColor: 'transparent', borderWidth: 0 } });
