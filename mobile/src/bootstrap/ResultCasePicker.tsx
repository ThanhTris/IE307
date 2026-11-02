import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppFonts } from './AppFontProvider';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { AppButton } from '../shared/ui';
import { nearbyCaseOptions, resultCaseOptions, type ResultCase } from './dishResultFixtures';
import type { NearbyStatus } from '../features/result/services/resultPresentation';

export function ResultCasePicker({ noConsensus, showPlaces, locked, onCase, onNearby, onOtherScreen, onCelebrate, onReadReady, onActionFailure }: { noConsensus: boolean; showPlaces: boolean; locked: boolean; onCase: (id: ResultCase) => void; onNearby: (id: NearbyStatus) => void; onOtherScreen: () => void; onCelebrate?: () => void; onReadReady?: () => void; onActionFailure: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [all, setAll] = useState(false);
  const matches = (label: string) => label.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'));
  const options = resultCaseOptions.filter(option => (noConsensus ? ['empty-r1', 'removed-r2', 'loading', 'error', 'unknown', 'finalizing'].includes(option.id) : !['empty-r1', 'removed-r2'].includes(option.id)) && matches(option.label));
  const places = showPlaces ? nearbyCaseOptions.filter(option => matches(option.label)) : [];
  return <View style={styles.group}>
    <AppButton label={open ? 'Ẩn tình huống kiểm thử kết quả' : 'Tình huống kiểm thử kết quả'} variant="quiet" colors={colors} disabled={locked} onPress={() => setOpen(value => !value)} />
    {open ? <>
      <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Đổi kịch bản sẽ đặt lại dữ liệu mẫu. Thử lại tìm quán giữ nguyên kết quả.</Text>
      <TextInput accessibilityLabel="Tìm tình huống kết quả" value={query} onChangeText={setQuery} editable={!locked} placeholder="Tìm tình huống" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, borderColor: colors.line }, textStyle(400)]} />
      {(all || query.trim() ? options : options.slice(0, 6)).map(item => <AppButton key={item.id} label={`Kết quả · ${item.label}`} variant="secondary" colors={colors} disabled={locked} onPress={() => onCase(item.id)} />)}
      {(all || query.trim() ? places : places.slice(0, 4)).map(item => <AppButton key={item.id} label={`Quán · ${item.label}`} variant="secondary" colors={colors} disabled={locked} onPress={() => onNearby(item.id)} />)}
      {!query.trim() && (options.length > 6 || places.length > 4) ? <AppButton label={all ? 'Thu gọn tình huống' : 'Xem tất cả tình huống'} variant="quiet" colors={colors} disabled={locked} onPress={() => setAll(value => !value)} /> : null}
      {onCelebrate ? <AppButton label="Xem lại vinh danh mẫu" colors={colors} disabled={locked} onPress={onCelebrate} /> : null}
      {onReadReady ? <AppButton label="Nhận kết quả mẫu" colors={colors} disabled={locked} onPress={onReadReady} /> : null}
      {showPlaces ? <AppButton label="Đổi mô phỏng lỗi thao tác" variant="secondary" colors={colors} disabled={locked} onPress={onActionFailure} /> : null}
      <AppButton label={noConsensus ? 'Xem kết quả có món' : 'Xem chưa đồng thuận'} variant="secondary" colors={colors} disabled={locked} onPress={onOtherScreen} />
    </> : null}
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 8 }, caption: { fontSize: 11, lineHeight: 17 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 } });
