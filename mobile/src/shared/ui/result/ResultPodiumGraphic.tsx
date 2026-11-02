import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { lightColors, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import type { PodiumDish } from './ResultPodium';
import { ResultDishArtwork } from './ResultDishArtwork';

/** Fixed podium slots only; never changes input rank, score, winner or tied ordering. */
export function ResultPodiumGraphic({ dishes, colors }: ComponentThemeProps & { dishes: PodiumDish[] }) {
  const { width, fontScale } = useWindowDimensions();
  const top = dishes[0], second = dishes[1];
  const ordered = top?.rank === 1 && second && second.rank > 1 ? dishes.length === 3 ? [second, top, dishes[2]!] : [second, top] : dishes;
  const scale = Math.max(1, fontScale * 0.7), picture = dishes.length === 1 ? 120 : width < 360 ? 88 : 112;
  return <View style={styles.group}>
    <View accessibilityLabel="Bảng xếp hạng món ăn" style={[styles.row, { borderBottomColor: colors?.line }]}>
      {ordered.map(item => <View key={item.id} testID={`podium-${item.id}`} style={styles.column}>
        <ResultDishArtwork source={item.imageSource} uri={item.imageUri} label={item.name} size={item.rank === 1 ? picture : picture * 0.85} winner={item.rank === 1} colors={colors} />
        <Text style={[styles.name, { color: colors?.text }]}>{item.name}</Text>
        {item.scoreLabel ? <Text style={[styles.points, { color: colors?.text }]}>{item.scoreLabel}</Text> : null}
        {item.imageAttribution ? <Text style={[styles.attribution, { color: colors?.muted }]}>{item.imageAttribution}</Text> : null}
        <View accessibilityLabel={`Hạng ${item.rank}${item.winner ? ' · Món được chọn' : ''}`} testID={`podium-bar-${item.id}`} style={[styles.bar, { height: (item.rank === 1 ? 128 : item.rank === 2 ? 96 : 76) * scale, backgroundColor: item.rank === 1 ? colors?.green : colors?.line }]}>
          <Image source={require('../../../../assets/brand/result/laurel.png')} accessible={false} resizeMode="contain" style={[styles.laurel, { left: 4, tintColor: item.rank === 1 ? colors?.line : colors?.primary }]} />
          <Text style={[styles.rank, { color: item.rank === 1 ? lightColors.text : colors?.text }]}>{item.rank}</Text>
          <Image source={require('../../../../assets/brand/result/laurel.png')} accessible={false} resizeMode="contain" style={[styles.laurel, { right: 4, tintColor: item.rank === 1 ? colors?.line : colors?.primary, transform: [{ scaleX: -1 }] }]} />
        </View>
      </View>)}
    </View>
    {dishes.some(item => item.winner) ? <View style={[styles.badge, { borderColor: colors?.primary, backgroundColor: colors?.surface }]}><Text style={[styles.badgeText, { color: colors?.text }]}>Món được chọn · {dishes.find(item => item.winner)!.name}</Text></View> : null}
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 8, paddingTop: 16 }, row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', borderBottomWidth: 1 }, column: { flex: 1, maxWidth: 190, minWidth: 0, alignItems: 'center', gap: 8 }, name: { ...typography.bodyBold, textAlign: 'center', paddingHorizontal: 2 }, points: { ...typography.titleMedium, textAlign: 'center' }, bar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, rank: { fontFamily: 'InterBold', fontSize: 42, lineHeight: 56 }, laurel: { position: 'absolute', width: '20%', height: 50, maxWidth: 25 }, badge: { borderWidth: 1, borderRadius: 16, alignSelf: 'center', paddingVertical: 5, paddingHorizontal: 12, maxWidth: '100%' }, badgeText: { ...typography.caption, textAlign: 'center' }, attribution: { ...typography.caption, textAlign: 'center' } });
