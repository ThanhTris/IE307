import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import { nearbyDistance, type ResultMapRenderer } from '../services/nearbyPresentation';
import type { NearbyPlace } from '../services/resultPresentation';

export function ResultMapCard({ place, places, resultId, winnerDishId, onSelect, isMock, renderMap, onMaps, busy }: { place: NearbyPlace; places: readonly NearbyPlace[]; resultId: string; winnerDishId: string; onSelect: (id: string) => void; isMock: boolean; renderMap?: ResultMapRenderer; onMaps?: () => void; busy: boolean }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), distance = nearbyDistance(place.distanceM);
  return <View style={[styles.frame, { borderColor: colors.line, backgroundColor: colors.warm }]}>
    {renderMap ? <View style={styles.map}>{renderMap({ resultId, winnerDishId, places, selectedPlaceId: place.id, onSelect })}</View> : isMock ? <View><Image source={require('../../../../assets/brand/result/map-illustration.png')} accessible={false} resizeMode="cover" style={styles.illustration} /><Text style={[styles.mock, { color: colors.muted }, textStyle(400)]}>Bản đồ minh họa · không phải vị trí thật</Text></View> : <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Chưa thể hiển thị bản đồ trong ứng dụng.</Text>}
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}><View style={styles.copy}>
      <Text style={[styles.name, { color: colors.text }, textStyle(600)]}>{place.name}</Text>
      {place.address ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{place.address}</Text> : null}
      {distance ? <Text style={[styles.caption, { color: colors.text }, textStyle(500)]}>{distance} · khoảng cách tham khảo</Text> : null}
    </View><AppButton label="Mở bản đồ" colors={colors} disabled={!onMaps || busy} onPress={onMaps} style={styles.button} /></View>
    {place.attribution ? <Text style={[styles.attribution, { color: colors.muted }, textStyle(400)]}>{place.attribution}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ frame: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', gap: 8, paddingBottom: 8 }, map: { height: 180 }, illustration: { width: '100%', height: 120 }, mock: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingTop: 4 }, card: { marginHorizontal: 8, borderRadius: 12, borderWidth: 1, padding: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, copy: { flexGrow: 1, flexBasis: 160, gap: 4 }, name: { fontSize: 14, lineHeight: 21 }, caption: { fontSize: 12, lineHeight: 18 }, button: { flexGrow: 1, flexBasis: 100 }, attribution: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8 } });
