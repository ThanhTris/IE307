import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Friend, InboxItem, SocialIdentity } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, FormField, SheetDialog, StatusNotice } from '../../../shared/ui';
import { ApiFeatureFrame } from '../../shared/components/ApiFeatureFrame';
import type { InboxRepository } from '../../inbox/services/inboxRepository';
import type { SocialRepository } from '../services/socialRepository';
import SearchIcon from '../../../../assets/brand/icons/search.svg';
import PlusIcon from '../../../../assets/brand/icons/plus.svg';

type Props = {
  repository: SocialRepository;
  inboxRepository?: InboxRepository;
  onNavigate: (path: string) => void;
  onHome: () => void;
};
type PendingAction = { kind: 'invite' } | { kind: 'unfriend'; friend: Friend } | null;

export function FriendsScreen({ repository, inboxRepository, onNavigate, onHome }: Props) {
  const { colors } = useShellTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.5;
  const [identity, setIdentity] = useState<SocialIdentity | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [inboxError, setInboxError] = useState('');
  const [search, setSearch] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [action, setAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const query = normalizeSearch(search);
  const visibleFriends = query
    ? friends.filter(friend => normalizeSearch(`${friend.displayName} ${friend.friendCode}`).includes(query))
    : friends;

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setInboxError('');
    try {
      const [who, list, inbox] = await Promise.all([
        repository.getIdentity(),
        repository.listFriends(),
        inboxRepository?.list(),
      ]);
      if (!who.ok) { setIdentity(null); setFriends([]); setError(who.error.messageKey); }
      else if (!list.ok) { setIdentity(who.data); setFriends([]); setError(list.error.messageKey); }
      else {
        setIdentity(who.data);
        setFriends(list.data);
        if (inbox) {
          if (inbox.ok) setIncoming(inbox.data.items.filter(item => item.type === 'friend_invite'));
          else { setIncoming([]); setInboxError(inbox.error.messageKey); }
        } else setIncoming([]);
      }
    } catch {
      setIdentity(null);
      setFriends([]);
      setIncoming([]);
      setError('NETWORK_ERROR');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [inboxRepository, repository]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const confirm = async () => {
    if (!action || lock.current) return;
    if (action.kind === 'invite' && !/^[A-HJ-NP-Z2-9]{10}$/.test(friendCode.trim().toUpperCase())) {
      setMessage('Nhập mã bạn bè gồm 10 ký tự rồi thử lại.');
      return;
    }
    lock.current = true;
    setBusy(true);
    const pending = action;
    setAction(null);
    setMessage('');
    try {
      if (pending.kind === 'invite') {
        const result = await repository.invite({ friendCode: friendCode.trim().toUpperCase() });
        if (!result.ok) { setMessage(`Chưa hoàn tất · ${errorMessage(result.error.messageKey)}`); return; }
        setMessage('Đã gửi lời mời. Người nhận cần tự chấp nhận.');
      } else {
        const result = await repository.removeFriend(pending.friend.friendUserId);
        if (!result.ok) { setMessage(`Chưa hoàn tất · ${errorMessage(result.error.messageKey)}`); return; }
        setMessage('Đã xóa quan hệ bạn bè trên máy chủ.');
      }
      setFriendCode('');
      await load(true);
    } catch {
      setMessage('Không kết nối được máy chủ. Hãy tải lại trước khi thử tiếp.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const answerIncoming = async (item: InboxItem, kind: 'accept' | 'reject') => {
    if (!inboxRepository || lock.current) return;
    const invitationId = item.metadata?.invitationId;
    if (typeof invitationId !== 'string') { setMessage('Lời mời thiếu mã từ máy chủ.'); return; }
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = kind === 'accept'
        ? await inboxRepository.acceptFriend(invitationId)
        : await inboxRepository.rejectFriend(invitationId);
      if (!result.ok) { setMessage(errorMessage(result.error.messageKey)); await load(true); return; }
      inboxRepository.markHandled(item.eventId);
      setMessage(kind === 'accept' ? 'Đã đồng ý lời mời trên máy chủ.' : 'Đã từ chối lời mời trên máy chủ.');
      await load(true);
    } catch {
      setMessage('Chưa rõ máy chủ đã nhận thao tác chưa. Tải lại danh sách để kiểm tra.');
      await load(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const shareCode = async () => {
    if (!identity?.friendCode) return;
    try {
      await Share.share({ message: `Mã bạn bè Gì Cũng Được của mình: ${identity.friendCode}` });
    } catch {
      setMessage('Không mở được chức năng chia sẻ. Bạn có thể xem mã ở thẻ bên dưới.');
    }
  };

  return (
    <ApiFeatureFrame active="friends" title="Bạn bè" onNavigate={onNavigate} onHome={onHome}>
      <View style={styles.content}>
        <View style={[styles.titleRow, largeText && styles.titleRowLarge]}>
          <View style={styles.titleCopy}>
            <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.text }]}>Bạn bè</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{friends.length} người bạn</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Thêm bạn" accessibilityState={{ disabled: busy }} onPress={() => setAction({ kind: 'invite' })} disabled={busy} style={({ pressed }) => [styles.addFriendButton, { backgroundColor: pressed ? colors.soft : colors.surface, borderColor: colors.line, opacity: busy ? 0.55 : 1 }]}>
            <PlusIcon />
            <Text style={[styles.addFriendLabel, { color: colors.text }]}>Thêm bạn</Text>
          </Pressable>
        </View>

        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <SearchIcon />
          <FormField hideLabel label="Tìm trong danh sách bạn bè" value={search} onChangeText={setSearch} autoCorrect={false} placeholder="Tìm trong danh sách bạn bè" colors={colors} inputStyle={styles.searchInput} />
        </View>

        {loading ? <StatusNotice title="Đang tải bạn bè…" message="Đang đọc danh sách theo danh tính hiện tại." tone="info" colors={colors} /> : null}
        {!loading && error ? <StatusNotice title="Chưa tải được bạn bè" message={errorMessage(error)} tone="error" actionLabel="Thử lại" onAction={() => { void load(true); }} colors={colors} /> : null}
        {!loading && !error && incoming.length > 0 ? <View style={styles.section}>
          <View style={styles.sectionTop}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Lời mời kết bạn</Text>
            <Text style={[styles.count, { color: colors.primary }]}>{incoming.length}</Text>
          </View>
          {incoming.map(item => <View key={item.eventId} style={[styles.invitationCard, { backgroundColor: colors.warm, borderColor: colors.line }]}>
            <View style={styles.invitationIdentity}>
              <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.line }]}><Text style={[styles.avatarText, { color: colors.text }]}>{initialFrom(item.title)}</Text></View>
              <View style={styles.friendCopy}>
                <Text style={[styles.friendName, { color: colors.text }]}>{item.title}</Text>
                <Text numberOfLines={2} style={[styles.caption, { color: colors.muted }]}>{item.body}</Text>
              </View>
            </View>
            <View style={styles.invitationActions}>
              <AppButton label="Đồng ý" onPress={() => { void answerIncoming(item, 'accept'); }} disabled={busy} colors={colors} style={styles.actionButton} />
              <AppButton label="Từ chối" variant="secondary" onPress={() => { void answerIncoming(item, 'reject'); }} disabled={busy} colors={colors} style={styles.actionButton} />
            </View>
          </View>)}
        </View> : null}

        {!loading && !error ? <View style={styles.section}>
          <View style={styles.sectionTop}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Danh sách bạn bè</Text><Text style={[styles.count, { color: colors.muted }]}>{visibleFriends.length}</Text></View>
          {inboxError ? <StatusNotice title="Không tải được lời mời" message={errorMessage(inboxError)} tone="warning" actionLabel="Tải lại" onAction={() => { void load(true); }} colors={colors} /> : null}
          {friends.length === 0 ? <StatusNotice title="Chưa có bạn bè" message="Thêm bạn bằng mã để bắt đầu kết nối." tone="info" colors={colors} /> : visibleFriends.length === 0 ? <StatusNotice title="Không tìm thấy bạn" message="Thử tên khác trong danh sách bạn bè." tone="info" actionLabel="Xóa từ khóa" onAction={() => setSearch('')} colors={colors} /> : visibleFriends.map(friend => (
            <View key={friend.id} style={[styles.friendRow, largeText && styles.friendRowLarge, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.friendIdentity}>
                <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.line }]}><Text style={[styles.avatarText, { color: colors.text }]}>{initialFrom(friend.displayName)}</Text></View>
                <View style={styles.friendCopy}><Text style={[styles.friendName, { color: colors.text }]}>{friend.displayName}</Text><Text style={[styles.caption, { color: colors.muted }]}>Bạn bè</Text></View>
              </View>
              <View style={[styles.friendActions, largeText && styles.friendActionsLarge]}>
                <AppButton label="Rủ ăn" onPress={() => onNavigate('/room/create')} disabled={busy} colors={colors} style={[styles.inviteToMeal, largeText && styles.inviteToMealLarge]} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Tùy chọn ${friend.displayName}`} accessibilityState={{ disabled: busy }} onPress={() => setAction({ kind: 'unfriend', friend })} disabled={busy} style={({ pressed }) => [styles.moreButton, { backgroundColor: pressed ? colors.soft : 'transparent', opacity: busy ? 0.55 : 1 }]}>
                  <Text style={[styles.moreGlyph, { color: colors.text }]}>⋯</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {refreshing ? <Text style={[styles.caption, { color: colors.muted }]}>Đang cập nhật danh sách…</Text> : null}
        </View> : null}

        {identity?.friendCode ? <Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ mã kết bạn" onPress={() => { void shareCode(); }} style={[styles.shareCard, largeText && styles.shareCardLarge, { backgroundColor: colors.warm }]}>
          <View style={[styles.plusCircle, { backgroundColor: colors.green }]}><PlusIcon /></View>
          <View style={styles.friendCopy}><Text style={[styles.friendName, { color: colors.text }]}>Chia sẻ mã kết bạn</Text><Text selectable style={[styles.caption, { color: colors.muted }]}>{identity.friendCode}</Text></View>
          <Text style={[styles.chevron, { color: colors.text }]}>›</Text>
        </Pressable> : null}
        {message ? <StatusNotice title="Kết quả máy chủ" message={message} tone={message.startsWith('Chưa') ? 'warning' : 'success'} colors={colors} /> : null}
      </View>

      <SheetDialog visible={action !== null} title={action?.kind === 'invite' ? 'Thêm bạn bằng mã' : `Xóa ${action?.friend.displayName ?? 'bạn'}?`} onClose={() => { if (!busy) setAction(null); }} colors={colors}>
        {action?.kind === 'invite' ? <FormField label="Mã bạn bè" value={friendCode} onChangeText={value => setFriendCode(value.toUpperCase().slice(0, 10))} autoCapitalize="characters" autoCorrect={false} placeholder="Nhập mã 10 ký tự" colors={colors} /> : <Text style={[styles.caption, { color: colors.text }]}>Máy chủ sẽ xóa quan hệ bạn bè. Thao tác không thay đổi thành viên trong phòng đang hoạt động.</Text>}
        <AppButton label={action?.kind === 'invite' ? 'Gửi lời mời' : 'Xác nhận xóa bạn'} variant={action?.kind === 'invite' ? 'primary' : 'danger'} onPress={() => void confirm()} loading={busy} colors={colors} />
      </SheetDialog>
    </ApiFeatureFrame>
  );
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function initialFrom(value: string): string {
  return value.trim().charAt(0).toLocaleUpperCase() || '•';
}

export function errorMessage(key: string): string {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'Phiên không còn hợp lệ. Hãy khôi phục phiên rồi thử lại.',
    NOT_PARTNER: 'Hai tài khoản chưa có quan hệ bạn bè phù hợp.',
    NOT_RECIPIENT: 'Tài khoản hiện tại không phải người nhận lời mời.',
    INVITE_EXPIRED: 'Lời mời đã hết hạn. Hãy tải lại hộp thư.',
    NETWORK_ERROR: 'Không kết nối được máy chủ. Dữ liệu cũ không được dùng thay response mới.',
    TIMEOUT: 'Máy chủ phản hồi quá thời gian. Tải lại để kiểm tra trạng thái trước khi thử lại.',
    UNKNOWN_ERROR: 'Máy chủ chưa trả dữ liệu dùng được. Hãy thử tải lại.',
  };
  return messages[key] ?? `Máy chủ từ chối yêu cầu (${key}).`;
}

const styles = StyleSheet.create({
  content: { gap: 24 },
  titleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleRowLarge: { flexDirection: 'column', alignItems: 'stretch' },
  titleCopy: { flex: 1, minWidth: 0, gap: 2 },
  addFriendButton: { minHeight: 48, minWidth: 118, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addFriendLabel: { fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  pageTitle: { fontFamily: 'InterBold', fontSize: 30, lineHeight: 40 },
  subtitle: { fontFamily: 'InterRegular', fontSize: 14, lineHeight: 20 },
  search: { minHeight: 52, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  searchInput: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, minHeight: 48 },
  section: { gap: 12 },
  sectionTop: { minHeight: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: 'InterSemiBold', fontSize: 18, lineHeight: 26 },
  count: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 20 },
  invitationCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  invitationIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  invitationActions: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, minHeight: 48 },
  friendRow: { minHeight: 76, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendRowLarge: { flexDirection: 'column', alignItems: 'stretch' },
  friendIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  friendActionsLarge: { alignSelf: 'stretch' },
  avatar: { width: 48, height: 48, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'InterSemiBold', fontSize: 17, lineHeight: 24 },
  friendCopy: { flex: 1, minWidth: 0, gap: 2 },
  friendName: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  inviteToMeal: { minWidth: 80, minHeight: 48 },
  inviteToMealLarge: { flex: 1 },
  moreButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  moreGlyph: { fontFamily: 'InterSemiBold', fontSize: 24, lineHeight: 28 },
  shareCard: { minHeight: 84, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  shareCardLarge: { flexDirection: 'column', alignItems: 'stretch' },
  plusCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontFamily: 'InterRegular', fontSize: 32, lineHeight: 36 },
});
