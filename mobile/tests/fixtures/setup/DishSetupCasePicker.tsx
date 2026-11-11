import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppFonts } from '../../../src/bootstrap/AppFontProvider';
import { useShellTheme } from '../../../src/shared/lib/useShellTheme';
import { AppButton } from '../../../src/shared/ui';
import type { SetupStage } from '../../../src/features/context/services/dishSetup';
import { casesForSetupStage } from './dishSetupCases';

export function DishSetupCasePicker({ stage, selectedId, locked, onSelect }: { stage: SetupStage; selectedId: string; locked: boolean; onSelect: (id: string) => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [showAll, setShowAll] = useState(false);
  const cases = casesForSetupStage(stage).filter(item => `${item.id} ${item.label}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  if (stage === 'complete' || stage === 'closed') return null;
  const visible = showAll || query.trim() ? cases : cases.slice(0, 6);
  return <View style={styles.group}>
    <AppButton label={open ? 'Ẩn tình huống kiểm thử' : 'Tình huống kiểm thử'} variant="quiet" disabled={locked} colors={colors} onPress={() => setOpen(value => !value)} />
    {open ? <>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(600)]}>{stage === 'preferences' ? 'Kiểm thử · Khẩu vị' : 'Kiểm thử · Thiết lập phòng'}</Text>
      <Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Đổi tình huống sẽ xóa nháp/phòng mẫu hiện tại.</Text>
      <TextInput accessibilityLabel="Tìm tình huống kiểm thử" value={query} onChangeText={setQuery} editable={!locked} placeholder="Tìm theo tên hoặc mã" placeholderTextColor={colors.muted} style={[styles.search, { color: colors.text, borderColor: colors.line }, textStyle(400)]} />
      {visible.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.id} · ${item.label}`} accessibilityState={{ selected: selectedId === item.id, disabled: locked }} disabled={locked} onPress={() => onSelect(item.id)} style={[styles.item, { borderColor: colors.line, backgroundColor: selectedId === item.id ? colors.warm : colors.surface }]}>
        <Text style={[styles.code, { color: colors.primary }, textStyle(700)]}>{item.id}</Text><Text style={[styles.name, { color: colors.text }, textStyle(500)]}>{item.label}</Text>
      </Pressable>)}
      {!cases.length ? <Text style={[styles.note, { color: colors.muted }]}>Không có tình huống phù hợp trong màn này.</Text> : null}
      {!query.trim() && cases.length > 6 ? <AppButton label={showAll ? 'Thu gọn danh sách' : `Xem thêm ${cases.length - 6} tình huống`} variant="quiet" disabled={locked} colors={colors} onPress={() => setShowAll(value => !value)} /> : null}
    </> : null}
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 8 }, heading: { fontSize: 14, lineHeight: 21 }, note: { fontSize: 12, lineHeight: 18 }, search: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 }, item: { minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, code: { fontSize: 12, minWidth: 36 }, name: { flex: 1, fontSize: 13, lineHeight: 20 } });
