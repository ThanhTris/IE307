import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SkeletonBlock } from '../../../shared/ui';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
import { useResultAction } from '../hooks/useResultAction';
import { nearbyPlaces, type ResultMapRenderer } from '../services/nearbyPresentation';
import { nearbyMatches, type NearbyState, type NearbyStatus, type ResultPresentationActions, type ScoredResult } from '../services/resultPresentation';
import { EmbeddedDishMap } from './EmbeddedDishMap';
import { ResultMapCard } from './ResultMapCard';

const copy: Record<NearbyStatus, string> = { ready: 'Chưa tìm thấy quán phù hợp', loading: 'Đang tìm quán', empty: 'Chưa tìm thấy quán phù hợp', error: 'Không tải được danh sách quán', permission: 'Cần cấp quyền vị trí để tìm quán gần bạn', denied: 'Cần cấp quyền vị trí để tìm quán gần bạn', blocked: 'Quyền vị trí đang bị chặn', 'location-off': 'Dịch vụ vị trí đang tắt', offline: 'Bạn đang ngoại tuyến', unsupported: 'Chưa thể hiển thị bản đồ' };
export function NearbyPlacesSection({ result, state, renderMap, actions }: { result: ScoredResult; state?: NearbyState; renderMap?: ResultMapRenderer; actions: ResultPresentationActions }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), action = useResultAction(result.resultId);
  const [selected, setSelected] = useState<string>();
  const [mapFailed, setMapFailed] = useState(false);
  if (result.status !== 'DECIDED' || !result.winner) return null;
  const matched = !!state && nearbyMatches(state, result), status = matched ? state.status : 'unsupported';
  const places = matched ? nearbyPlaces(state) : [], place = places.find(item => item.id === selected) ?? places[0];
  const external = (kind: 'maps' | 'tiktok' | 'youtube', includePlace = false) => { void action.run(kind === 'maps' ? 'Mở bản đồ' : kind, actions.onExternalAction ? () => actions.onExternalAction!(kind, { resultId: result.resultId, dishId: result.winner!.dishId, dishName: result.winner!.name, ...(includePlace && place ? { place } : {}) }) : undefined); };
  const pending = status === 'loading' || action.busy;
  const needsSettings = status === 'blocked' || status === 'location-off';
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>Quán ăn gần đây</Text>
    {place ? <>
      {state?.cached ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Dữ liệu lần tải trước · chưa cập nhật thành công</Text> : null}
      <ResultMapCard place={place} places={places} resultId={result.resultId} winnerDishId={result.winner.dishId} onSelect={setSelected} renderMap={renderMap} onMaps={actions.onExternalAction ? () => external('maps', true) : undefined} busy={action.busy} />
      {places.length > 1 ? <FlatList horizontal data={places} keyExtractor={item => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Chọn quán ${item.name}`} accessibilityState={{ selected: place.id === item.id }} onPress={() => setSelected(item.id)} style={[styles.place, { borderColor: place.id === item.id ? colors.primary : colors.line }]}><Text style={[styles.caption, { color: colors.text }, textStyle(500)]}>{item.name}</Text></Pressable>} /> : null}
      {status !== 'ready' && status !== 'loading' ? <PlacesStatus status={status} /> : null}
      {state?.fetchedAt && Number.isFinite(Date.parse(state.fetchedAt)) ? <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>{state.cached ? 'Thông tin lần trước' : 'Cập nhật'}: {new Date(state.fetchedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })}</Text> : null}
    </> : <View accessibilityLiveRegion="polite" style={styles.notice}>
      {!mapFailed ? <EmbeddedDishMap dishName={result.winner.name} onFailed={() => setMapFailed(true)} /> : null}
      {status === 'loading' ? <View accessibilityRole="progressbar" accessibilityLabel="Đang tìm quán" style={styles.group}><SkeletonBlock height={156} radius={16} colors={colors} /><SkeletonBlock width="60%" height={14} colors={colors} /></View> : null}
      {state && !matched ? <ToastNotice title="Thông tin quán chưa khớp kết quả" tone="error" /> : status !== 'loading' ? <PlacesStatus status={status} withMap={!mapFailed} /> : null}
      <LinkButton label="Mở Google Maps" icon={<MaterialCommunityIcons name="google-maps" size={20} color={colors.onPrimary} />} primary colors={colors} disabled={!actions.onExternalAction || action.busy} onPress={() => external('maps')} />
      {needsSettings ? <AppButton label="Mở cài đặt vị trí" colors={colors} disabled={!actions.onOpenSettings || pending} onPress={() => { void action.run('Mở cài đặt vị trí', actions.onOpenSettings); }} /> : null}
    </View>}
    {place && status === 'error' ? <AppButton label="Thử lại" variant="secondary" colors={colors} disabled={!actions.onRetryPlaces || pending} onPress={() => { void action.run('Tìm quán', actions.onRetryPlaces); }} /> : null}
    <Text accessibilityRole="header" style={[styles.subheading, { color: colors.text }, textStyle(600)]}>Xem review món</Text>
    <View style={styles.social}>
      <LinkButton label="TikTok" icon={<Ionicons name="logo-tiktok" size={20} color={colors.text} />} colors={colors} disabled={!actions.onExternalAction || action.busy} onPress={() => external('tiktok')} style={styles.button} />
      <LinkButton label="YouTube" icon={<Ionicons name="logo-youtube" size={22} color="#E11D48" />} colors={colors} disabled={!actions.onExternalAction || action.busy} onPress={() => external('youtube')} style={styles.button} />
    </View>
    {action.message ? <ToastNotice title={action.message} tone="error" /> : null}
  </View>;
}
/** Places status: a failed request is a red toast, offline an amber toast, the rest (permission, nothing found) a caption. */
function PlacesStatus({ status, withMap = false }: { status: NearbyStatus; withMap?: boolean }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  if (status === 'error') return <ToastNotice title={copy.error} tone="error" />;
  if (status === 'offline') return <ToastNotice title={copy.offline} tone="warning" />;
  // The embedded map already answers "where to eat": no caption for an unsupported list or an empty one.
  if (withMap && (status === 'unsupported' || status === 'ready' || status === 'empty')) return null;
  return <Text style={[styles.message, { color: colors.muted }, textStyle(400)]}>{copy[status]}</Text>;
}
const styles = StyleSheet.create({ group: { gap: 12 }, heading: { fontSize: 18, lineHeight: 26 }, subheading: { fontSize: 15, lineHeight: 22, marginTop: 4 }, notice: { justifyContent: 'center', gap: 12 }, dishName: { fontSize: 14, lineHeight: 22 }, message: { fontSize: 14, lineHeight: 22, textAlign: 'center' }, caption: { fontSize: 11, lineHeight: 17 }, social: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, button: { flexGrow: 1, flexBasis: 130 }, list: { gap: 8 }, place: { minHeight: 48, maxWidth: 240, borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center' } });

function LinkButton({ label, icon, primary, disabled, onPress, colors, style }: { label: string; icon: React.ReactNode; primary?: boolean; disabled?: boolean; onPress: () => void; colors: ReturnType<typeof useShellTheme>['colors']; style?: object }) {
  const { textStyle } = useAppFonts();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [linkStyles.button, { backgroundColor: primary ? colors.primary : colors.surface, borderColor: primary ? colors.primary : colors.line, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}>
    {icon}<Text numberOfLines={1} style={[linkStyles.label, { color: primary ? colors.onPrimary : colors.text }, textStyle(600)]}>{label}</Text>
  </Pressable>;
}
const linkStyles = StyleSheet.create({ button: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, label: { fontSize: 15, lineHeight: 22 } });
