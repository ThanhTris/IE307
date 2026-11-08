import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import { useResultAction } from '../hooks/useResultAction';
import { nearbyPlaces, type ResultMapRenderer } from '../services/nearbyPresentation';
import { nearbyMatches, type NearbyState, type NearbyStatus, type ResultPresentationActions, type ScoredResult } from '../services/resultPresentation';
import { ResultMapCard } from './ResultMapCard';

const copy: Record<NearbyStatus, string> = { ready: 'Chưa tìm thấy quán phù hợp', loading: 'Đang tìm quán', empty: 'Chưa tìm thấy quán phù hợp', error: 'Không tải được danh sách quán', permission: 'Bật vị trí để tìm quán', denied: 'Bạn chưa cho phép dùng vị trí', blocked: 'Quyền vị trí đang bị chặn', 'location-off': 'Dịch vụ vị trí đang tắt', offline: 'Bạn đang ngoại tuyến', unsupported: 'Chưa thể hiển thị bản đồ' };
export function NearbyPlacesSection({ result, state, isMock = false, renderMap, actions }: { result: ScoredResult; state?: NearbyState; isMock?: boolean; renderMap?: ResultMapRenderer; actions: ResultPresentationActions }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), action = useResultAction(result.resultId, isMock);
  const [selected, setSelected] = useState<string>();
  if (result.status !== 'DECIDED' || !result.winner) return null;
  const matched = !!state && nearbyMatches(state, result), status = matched ? state.status : 'unsupported';
  const places = matched ? nearbyPlaces(state) : [], place = places.find(item => item.id === selected) ?? places[0];
  const external = (kind: 'maps' | 'tiktok' | 'youtube', includePlace = false) => { void action.run(kind === 'maps' ? 'Mở bản đồ' : kind, actions.onExternalAction ? () => actions.onExternalAction!(kind, { resultId: result.resultId, dishId: result.winner!.dishId, dishName: result.winner!.name, ...(includePlace && place ? { place } : {}) }) : undefined); };
  const pending = status === 'loading' || action.busy;
  const needsPermission = status === 'permission' || status === 'denied';
  const needsSettings = status === 'blocked' || status === 'location-off';
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>Quán có món này</Text>
    <Text accessibilityLiveRegion="polite" style={[styles.dishName, { color: colors.text }, textStyle(600)]}>Tìm quán cho: {result.winner.name}</Text>
    {place ? <>
      {state?.cached ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Dữ liệu lần tải trước · chưa cập nhật thành công</Text> : null}
      <ResultMapCard place={place} places={places} resultId={result.resultId} winnerDishId={result.winner.dishId} onSelect={setSelected} isMock={isMock} renderMap={renderMap} onMaps={actions.onExternalAction ? () => external('maps', true) : undefined} busy={action.busy} />
      {places.length > 1 ? <FlatList horizontal data={places} keyExtractor={item => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Chọn quán ${item.name}`} accessibilityState={{ selected: place.id === item.id }} onPress={() => setSelected(item.id)} style={[styles.place, { borderColor: place.id === item.id ? colors.primary : colors.line }]}><Text style={[styles.caption, { color: colors.text }, textStyle(500)]}>{item.name}</Text></Pressable>} /> : null}
      {status !== 'ready' ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{copy[status]}</Text> : null}
      {state?.fetchedAt && Number.isFinite(Date.parse(state.fetchedAt)) ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{state.cached ? 'Thông tin lần trước' : 'Cập nhật'}: {new Date(state.fetchedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}</Text> : null}
    </> : <View accessibilityLiveRegion="polite" style={[styles.notice, { borderColor: colors.line }]}>
      {status === 'loading' ? <ActivityIndicator color={colors.primary} accessibilityLabel="Đang tìm quán" /> : null}
      <Text style={[styles.message, { color: colors.text }, textStyle(600)]}>{state && !matched ? 'Thông tin quán chưa khớp kết quả' : copy[status]}</Text>
      {needsPermission ? <AppButton label="Cho phép vị trí" colors={colors} disabled={!actions.onRequestLocation || pending} onPress={() => { void action.run('Cho phép vị trí', actions.onRequestLocation); }} /> : null}
      {needsSettings ? <AppButton label="Mở cài đặt vị trí" colors={colors} disabled={!actions.onOpenSettings || pending} onPress={() => { void action.run('Mở cài đặt vị trí', actions.onOpenSettings); }} /> : null}
      {status === 'error' || status === 'offline' || (state && !matched) ? <AppButton label={status === 'error' ? 'Thử lại' : 'Thử lại tìm quán'} colors={colors} disabled={!actions.onRetryPlaces || pending} onPress={() => { void action.run('Tìm quán', actions.onRetryPlaces); }} /> : null}
      <AppButton label="Mở Google Maps" variant="secondary" colors={colors} disabled={!actions.onExternalAction || action.busy} onPress={() => external('maps')} />
    </View>}
    {place && status !== 'ready' ? <AppButton label={status === 'error' ? 'Thử lại' : 'Thử lại tìm quán'} variant="secondary" colors={colors} disabled={!actions.onRetryPlaces || pending} onPress={() => { void action.run('Tìm quán', actions.onRetryPlaces); }} /> : null}
    <View style={styles.social}><AppButton label="TikTok ↗" variant="secondary" colors={colors} disabled={!actions.onExternalAction || action.busy} onPress={() => external('tiktok')} style={styles.button} /><AppButton label="YouTube ↗" variant="secondary" colors={colors} disabled={!actions.onExternalAction || action.busy} onPress={() => external('youtube')} style={styles.button} /></View>
    {action.message ? <Text accessibilityLiveRegion="polite" style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{action.message}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 12 }, heading: { fontSize: 18, lineHeight: 26 }, notice: { minHeight: 156, borderWidth: 1, borderRadius: 16, padding: 16, justifyContent: 'center', gap: 12 }, dishName: { fontSize: 14, lineHeight: 22 }, message: { fontSize: 14, lineHeight: 22, textAlign: 'center' }, caption: { fontSize: 11, lineHeight: 17 }, social: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, button: { flexGrow: 1, flexBasis: 130 }, list: { gap: 8 }, place: { minHeight: 48, maxWidth: 240, borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center' } });
