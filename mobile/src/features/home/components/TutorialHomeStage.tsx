import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, BrandBanner } from '../../../shared/ui';

/** Presentation-only Home backdrop: never mounts Home's session/network hooks. */
export function TutorialHomeStage({ onCreate }: { onCreate: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dimmed}>
      <Text style={[styles.title, { color: colors.text }, textStyle(700)]}>{'Hôm nay\ncả nhóm ăn gì?'}</Text>
      <Text style={[styles.lead, { color: colors.text }, textStyle(400)]}>Chọn món hợp ý, cùng nhau đi ăn.</Text>
      <BrandBanner colors={colors} titleTextStyle={textStyle(700)} illustrationSource={require('../../../../assets/brand/home/friends-dining-slot.png')} />
    </View>
    <View style={styles.tiles}>
      <View style={styles.highlight}><AppButton label="Tạo phòng mẫu" onPress={onCreate} iconSource={require('../../../../assets/brand/home/create.png')} iconSize={32} iconLayout="stacked" style={styles.tile} textStyle={textStyle(700)} colors={colors} /></View>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.passiveTile, { borderColor: colors.text }]}>
        <Image source={require('../../../../assets/brand/home/join.png')} accessible={false} style={[styles.icon, { tintColor: colors.text }]} />
        <Text style={[styles.tileLabel, { color: colors.text }, textStyle(700)]}>Tham gia phòng</Text>
      </View>
    </View>
    <Text style={[styles.hint, { color: colors.text }, textStyle(400)]}>Vào bằng mã phòng hoặc quét QR</Text>
  </>;
}
const styles = StyleSheet.create({
  dimmed: { gap: 24, marginTop: 44, marginBottom: 24, opacity: 0.38 }, title: { fontSize: 44, lineHeight: 53 }, lead: { fontSize: 18, lineHeight: 26, marginTop: -16 },
  tiles: { flexDirection: 'row', gap: 24, alignItems: 'stretch' }, highlight: { flex: 1, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 26, padding: 4, margin: -7 },
  tile: { aspectRatio: 1, minHeight: 174, borderRadius: 20, padding: 12 }, passiveTile: { flex: 1, borderWidth: 1, borderRadius: 20, minHeight: 174, alignItems: 'center', justifyContent: 'center', gap: 20, opacity: 0.38 },
  icon: { width: 32, height: 32 }, tileLabel: { fontSize: 18, lineHeight: 25, textAlign: 'center' }, hint: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16, opacity: 0.5 },
});
