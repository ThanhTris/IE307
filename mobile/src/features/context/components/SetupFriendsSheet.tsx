import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import type { SetupFriend } from '../services/dishSetup';

export function SetupFriendsSheet({ friends, initial, onConfirm, onClose, initialQuery = '' }: {
  friends: SetupFriend[]; initial: string[]; onConfirm: (ids: string[]) => void; onClose: () => void; initialQuery?: string;
}) {
  const { colors, dark } = useShellTheme(), { textStyle } = useAppFonts();
  const [query, setQuery] = useState(initialQuery), [selected, setSelected] = useState(initial);
  const matching = friends.filter(friend => friend.label.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  return <SheetDialog visible title="Rủ bạn ăn cùng" onClose={onClose} colors={colors} showHandle={false} backdropColor={dark ? undefined : 'rgba(70,195,79,0.22)'}>
    <Text style={[styles.description, { color: colors.muted }, textStyle(400)]}>Chỉ gửi lời mời sau khi tạo phòng.</Text>
    <TextInput accessibilityLabel="Tìm theo tên bạn bè" value={query} onChangeText={setQuery} placeholder="Tìm theo tên bạn bè" placeholderTextColor={colors.muted} autoCorrect={false} style={[styles.search, { borderColor: colors.line, color: colors.text }, textStyle(400)]} />
    <FlatList style={styles.list} contentContainerStyle={styles.items} keyboardShouldPersistTaps="handled" data={matching} keyExtractor={friend => friend.id}
      renderItem={({ item: friend }) => <Pressable accessibilityRole="checkbox" accessibilityLabel={friend.label} accessibilityState={{ checked: selected.includes(friend.id) }} onPress={() => setSelected(values => values.includes(friend.id) ? values.filter(id => id !== friend.id) : [...values, friend.id])}
        style={({ pressed }) => [styles.friend, { borderWidth: selected.includes(friend.id) ? 2 : 1, padding: selected.includes(friend.id) ? 11 : 12, borderColor: selected.includes(friend.id) ? colors.primary : colors.line, backgroundColor: selected.includes(friend.id) ? colors.warm : colors.surface, opacity: pressed ? 0.75 : 1 }]}>
        <View accessible={false} style={[styles.avatar, { backgroundColor: selected.includes(friend.id) ? colors.primary : colors.line }]}><Text style={[styles.initial, { color: selected.includes(friend.id) ? colors.onPrimary : colors.text }, textStyle(600)]}>{friend.label.trim().slice(0, 1).toLocaleUpperCase('vi')}</Text></View>
        <Text style={[styles.name, { color: colors.text }, textStyle(600)]}>{friend.label}</Text>
        {selected.includes(friend.id) ? <View accessible={false} style={[styles.check, { backgroundColor: colors.primary }]}><Text style={[styles.tick, { color: colors.onPrimary }, textStyle(700)]}>✓</Text></View> : null}
      </Pressable>}
      ListEmptyComponent={<View style={styles.items}><StatusNotice title="Chưa tìm thấy bạn" message="Thử tên khác." colors={colors} /><AppButton label="Xóa từ khóa" variant="secondary" onPress={() => setQuery('')} colors={colors} /></View>} />
    <AppButton label={`Chọn ${selected.length} người bạn`} colors={colors} onPress={() => onConfirm(selected)} />
  </SheetDialog>;
}
const styles = StyleSheet.create({ description: { fontSize: 13, lineHeight: 20 }, search: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, fontSize: 14 }, list: { maxHeight: 240, flexGrow: 0 }, items: { gap: 8 }, friend: { minHeight: 64, padding: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 16 }, name: { flex: 1, fontSize: 15, lineHeight: 22 }, check: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, tick: { fontSize: 16, lineHeight: 20 } });
