import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { AppButton, AppIcon, SheetDialog } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import type { SetupFriend } from '../services/dishSetup';

/** A room holds 20 people, the host included. */
export const MAX_INVITEES = 19;
const collator = new Intl.Collator('vi');
const initialOf = (label: string) => label.trim().slice(0, 1).toLocaleUpperCase('vi');

/** Friend picker: search, an A–Z list in a tinted area, and a footer with a short summary, a review toggle and the actions. */
export function SetupFriendsSheet({ friends, initial, onConfirm, onClose, initialQuery = '' }: {
  friends: SetupFriend[]; initial: string[]; onConfirm: (ids: string[]) => void; onClose: () => void; initialQuery?: string;
}) {
  const { colors, dark } = useShellTheme(), { textStyle } = useAppFonts(), { height } = useWindowDimensions();
  const [query, setQuery] = useState(initialQuery), [selected, setSelected] = useState(initial), [reviewing, setReviewing] = useState(false);
  const chosen = selected.map(id => friends.find(friend => friend.id === id)).filter((friend): friend is SetupFriend => !!friend);
  const full = selected.length >= MAX_INVITEES;
  const needle = query.trim().toLocaleLowerCase('vi');
  const source = reviewing ? chosen : friends.filter(friend => friend.label.toLocaleLowerCase('vi').includes(needle));
  const sections = [...source].sort((a, b) => collator.compare(a.label, b.label)).reduce<{ title: string; data: SetupFriend[] }[]>((groups, friend) => {
    const title = initialOf(friend.label) || '#', last = groups[groups.length - 1];
    if (last && last.title === title) last.data.push(friend); else groups.push({ title, data: [friend] });
    return groups;
  }, []);
  const toggle = (id: string) => setSelected(values => values.includes(id) ? values.filter(value => value !== id) : values.length >= MAX_INVITEES ? values : [...values, id]);
  const panelHeight = Math.round(Math.min(440, Math.max(248, height * 0.42)));
  const emptyIcon = reviewing ? 'friends' : query.trim() ? 'search' : 'friends';
  const emptyText = reviewing ? 'Bạn chưa chọn ai' : query.trim() ? 'Chưa tìm thấy bạn' : 'Bạn chưa có bạn bè nào';
  return <SheetDialog visible title="Rủ bạn ăn cùng" onClose={onClose} colors={colors} showHandle={false} showClose={false} backdropColor={dark ? undefined : 'rgba(70,195,79,0.22)'}>
    <Text style={[styles.description, { color: colors.muted }, textStyle(400)]}>Chỉ gửi lời mời sau khi tạo phòng.</Text>
    <View style={[styles.search, { borderColor: colors.line, backgroundColor: colors.surface, opacity: reviewing ? 0.5 : 1 }]}>
      <AppIcon name="search" size={20} color={colors.muted} />
      <TextInput accessibilityLabel="Tìm theo tên bạn bè" editable={!reviewing} value={query} onChangeText={setQuery} placeholder="Tìm theo tên bạn bè" placeholderTextColor={colors.muted} autoCorrect={false} style={[styles.searchInput, { color: colors.text }, textStyle(400)]} />
    </View>
    <View style={[styles.panel, { backgroundColor: colors.soft, height: panelHeight }]}>
      <SectionList style={styles.list} contentContainerStyle={sections.length ? styles.items : styles.emptyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} stickySectionHeadersEnabled={false}
        sections={sections} keyExtractor={friend => friend.id}
        renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={[styles.letter, { color: colors.muted }, textStyle(700)]}>{section.title}</Text>}
        renderItem={({ item: friend }) => {
          const on = selected.includes(friend.id), blocked = full && !on;
          return <Pressable accessibilityRole="checkbox" accessibilityLabel={friend.label} accessibilityState={{ checked: on, disabled: blocked }} disabled={blocked} onPress={() => toggle(friend.id)}
            style={({ pressed }) => [styles.friend, { borderWidth: on ? 2 : 1, padding: on ? 9 : 10, borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.warm : colors.surface, opacity: blocked ? 0.4 : pressed ? 0.75 : 1 }]}>
            <View accessible={false} style={[styles.avatar, { backgroundColor: on ? colors.primary : colors.soft }]}><Text style={[styles.initial, { color: on ? colors.onPrimary : colors.text }, textStyle(600)]}>{initialOf(friend.label)}</Text></View>
            <Text numberOfLines={1} style={[styles.name, { color: colors.text }, textStyle(600)]}>{friend.label}</Text>
            <View accessible={false} style={[styles.check, { borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primary : 'transparent' }]}>{on ? <AppIcon name="check" size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
          </Pressable>;
        }}
        ListEmptyComponent={<View style={styles.empty}>
          <View accessible={false} style={[styles.emptyIcon, { backgroundColor: colors.surface }]}><AppIcon name={emptyIcon} size={28} color={colors.muted} /></View>
          <Text style={[styles.emptyText, { color: colors.muted }, textStyle(500)]}>{emptyText}</Text>
        </View>} />
    </View>
    <View style={[styles.footer, { borderTopColor: colors.line }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={reviewing ? 'Quay lại danh sách bạn bè' : 'Xem lại người đã chọn'} accessibilityState={{ disabled: !chosen.length && !reviewing }} disabled={!chosen.length && !reviewing} onPress={() => setReviewing(value => !value)} style={styles.summary}>
        {chosen.length ? <View accessible={false} style={styles.stack}>
          {chosen.slice(0, 4).map((friend, index) => <View key={friend.id} style={[styles.stackAvatar, { marginLeft: index ? -10 : 0, backgroundColor: colors.primary, borderColor: colors.surface }]}><Text style={[styles.stackInitial, { color: colors.onPrimary }, textStyle(600)]}>{initialOf(friend.label)}</Text></View>)}
          {chosen.length > 4 ? <View style={[styles.stackAvatar, { marginLeft: -10, backgroundColor: colors.soft, borderColor: colors.surface }]}><Text style={[styles.stackInitial, { color: colors.text }, textStyle(600)]}>{`+${chosen.length - 4}`}</Text></View> : null}
        </View> : null}
        <Text style={[styles.summaryText, { color: chosen.length ? colors.text : colors.muted }, textStyle(500)]}>{chosen.length ? `Đã chọn ${chosen.length}/${MAX_INVITEES}` : `Chưa chọn ai (tối đa ${MAX_INVITEES})`}</Text>
        {chosen.length || reviewing ? <Text style={[styles.clearText, { color: colors.primary }, textStyle(600)]}>{reviewing ? 'Xong' : 'Xem lại'}</Text> : null}
      </Pressable>
      {chosen.length ? <Pressable accessibilityRole="button" accessibilityLabel="Bỏ chọn tất cả" onPress={() => { setSelected([]); setReviewing(false); }} hitSlop={8} style={styles.clear}><Text style={[styles.clearText, { color: colors.muted }, textStyle(500)]}>Bỏ chọn tất cả</Text></Pressable> : null}
      <AppButton label={`Chọn ${selected.length} người bạn`} colors={colors} onPress={() => onConfirm(selected)} />
      <AppButton label="Đóng" variant="quiet" colors={colors} onPress={onClose} />
    </View>
  </SheetDialog>;
}
const styles = StyleSheet.create({
  description: { fontSize: 13, lineHeight: 20 },
  search: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minHeight: 46, fontSize: 14, padding: 0 },
  panel: { borderRadius: 16, padding: 8 },
  list: { flex: 1 },
  items: { gap: 8 },
  emptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  letter: { fontSize: 12, lineHeight: 18, paddingHorizontal: 4, paddingTop: 4 },
  friend: { minHeight: 56, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 15 },
  name: { flex: 1, fontSize: 15, lineHeight: 22 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 4 },
  summary: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stackInitial: { fontSize: 12 },
  summaryText: { flex: 1, fontSize: 14, lineHeight: 20 },
  clear: { minHeight: 32, alignSelf: 'flex-start', justifyContent: 'center' },
  clearText: { fontSize: 13, lineHeight: 20 },
});
