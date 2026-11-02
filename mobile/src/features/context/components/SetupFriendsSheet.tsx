import { useState } from 'react';
import { FlatList, TextInput } from 'react-native';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { SetupFriend } from '../services/dishSetup';
import { SetupChoice } from './SetupChoice';

export function SetupFriendsSheet({ friends, initial, onConfirm, onClose, initialQuery = '' }: {
  friends: SetupFriend[]; initial: string[]; onConfirm: (ids: string[]) => void; onClose: () => void; initialQuery?: string;
}) {
  const { colors } = useShellTheme();
  const [query, setQuery] = useState(initialQuery), [selected, setSelected] = useState(initial);
  const matching = friends.filter(friend => friend.label.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  return <SheetDialog visible title="Rủ bạn ăn cùng" onClose={onClose} colors={colors}>
    <TextInput accessibilityLabel="Tìm theo tên bạn bè" value={query} onChangeText={setQuery} placeholder="Tìm theo tên bạn bè" placeholderTextColor={colors.muted} style={{ minHeight: 52, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.text }} />
    <FlatList style={{ maxHeight: 240 }} keyboardShouldPersistTaps="handled" data={matching} keyExtractor={friend => friend.id}
      renderItem={({ item: friend }) => <SetupChoice label={friend.label} checkbox columns={1} selected={selected.includes(friend.id)} onPress={() => setSelected(values => values.includes(friend.id) ? values.filter(id => id !== friend.id) : [...values, friend.id])} />}
      ListEmptyComponent={<StatusNotice title="Chưa tìm thấy bạn" message="Thử tên khác." colors={colors} />} />
    <AppButton label={`Chọn ${selected.length} người bạn`} colors={colors} onPress={() => onConfirm(selected)} />
  </SheetDialog>;
}
