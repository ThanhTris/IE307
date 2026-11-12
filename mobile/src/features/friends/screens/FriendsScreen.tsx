import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import type { Friend, InboxItem, SocialIdentity } from '../../../data/api/contracts';
import { useInboxBadge } from '../../../shared/lib/inboxBadge';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, FormField, SkeletonBlock, type AppIconName, LoadingState, SheetDialog, StatusNotice, ApiFeatureFrame, SwipeToDeleteRow } from '../../../shared/ui';
import type { InboxRepository } from '../../inbox/services/inboxRepository';
import type { FriendCodeOwner, SocialRepository } from '../services/socialRepository';
import { ToastNotice, useToast } from '../../../shared/ui/feedback/Toast';

type Props = {
  repository: SocialRepository;
  inboxRepository?: InboxRepository;
  onNavigate: (path: string) => void;
  onHome: () => void;
  /** Set when opened from the lobby so Back returns there. */
  onBack?: () => void;
  /** Pre-filled search, e.g. a friend code from a shared link. */
  initialSearch?: string;
};
type PendingAction = { kind: 'unfriend'; friend: Friend } | null;
const FRIEND_CODE = /^[A-HJ-NP-Z2-9]{10}$/;

export function FriendsScreen({ repository, inboxRepository, onNavigate, onHome, onBack, initialSearch = '' }: Props) {
  const { colors } = useShellTheme();
  const [identity, setIdentity] = useState<SocialIdentity | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [inboxError, setInboxError] = useState('');
  const [search, setSearch] = useState(initialSearch.trim().toUpperCase());
  const [copied, setCopied] = useState(false);
  const [action, setAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const toast = useToast();
  const { syncFriends } = useInboxBadge();
  // Who a typed friend code belongs to: undefined = looking it up, null = no such code.
  const [owner, setOwner] = useState<{ code: string; value: FriendCodeOwner | null | undefined }>();
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

  const run = async (job: () => Promise<boolean>, okMessage: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (await job()) { setMessage(okMessage); await load(true); }
    } catch {
      setMessage('Không kết nối được máy chủ. Hãy tải lại trước khi thử tiếp.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const invite = (code: string, name: string) => run(async () => {
    const result = await repository.invite({ friendCode: code });
    if (!result.ok) { setMessage(`Chưa hoàn tất · ${errorMessage(result.error.messageKey)}`); return false; }
    setSearch('');
    // Said straight away (not through the shared message state) so it always shows.
    toast?.show({ title: 'Đã gửi lời mời kết bạn', message: `${name} cần đồng ý lời mời của bạn.`, tone: 'success' });
    return true;
  }, '');
  const confirm = () => {
    if (action?.kind !== 'unfriend') return;
    const friend = action.friend;
    setAction(null);
    void run(async () => {
      const result = await repository.removeFriend(friend.friendUserId);
      if (!result.ok) { setMessage(`Chưa hoàn tất · ${errorMessage(result.error.messageKey)}`); return false; }
      return true;
    }, 'Đã xóa khỏi danh sách bạn bè.');
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
      if (kind === 'accept') syncFriends();
      inboxRepository.markHandled(item.eventId);
      await load(true);
    } catch {
      setMessage('Chưa rõ máy chủ đã nhận thao tác chưa. Tải lại danh sách để kiểm tra.');
      await load(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const copyCode = () => {
    if (!identity?.friendCode) return;
    void Clipboard.setStringAsync(identity.friendCode).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const shareLink = async () => {
    if (!identity?.friendCode) return;
    let link = '';
    try { link = Linking.createURL('/friends', { queryParams: { code: identity.friendCode } }); } catch { /* no link available */ }
    try {
      await Share.share({ message: `Kết bạn với mình trên Gì Cũng Được! Mã bạn bè: ${identity.friendCode}${link ? `\n${link}` : ''}` });
    } catch {
      setMessage('Chưa mở được chia sẻ. Bạn có thể sao chép mã ở thẻ bên dưới.');
    }
  };
  const codeQuery = search.trim().toUpperCase();
  const newFriendCode = FRIEND_CODE.test(codeQuery) && codeQuery !== identity?.friendCode && !friends.some(friend => friend.friendCode === codeQuery) ? codeQuery : '';
  const lookup = repository.lookupFriendCode;
  useEffect(() => {
    if (!newFriendCode || !lookup) return;
    let active = true;
    const timer = setTimeout(() => {
      setOwner({ code: newFriendCode, value: undefined });
      void lookup(newFriendCode).then(result => { if (active) setOwner({ code: newFriendCode, value: result.ok ? result.data : undefined }); }).catch(() => { if (active) setOwner({ code: newFriendCode, value: undefined }); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [newFriendCode, lookup]);
  const found = newFriendCode && owner?.code === newFriendCode ? owner.value : undefined;
  const lookingUp = Boolean(newFriendCode && lookup && (owner?.code !== newFriendCode || owner.value === undefined));

  const avatarTint = (name: string) => avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length]!;
  const emptyTitle = friends.length === 0 && !query ? 'Chưa có bạn bè' : 'Không tìm thấy bạn';
  const emptyHint = friends.length === 0 && !query ? 'Nhập mã bạn bè ở ô tìm kiếm để kết bạn.' : 'Thử tên khác, hoặc nhập đủ mã 10 ký tự để kết bạn.';

  return (
    <ApiFeatureFrame active="friends" title="Bạn bè" onNavigate={onNavigate} onHome={onHome} onBack={onBack}>
      <View style={styles.content}>
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <AppIcon name="search" size={20} color={colors.muted} />
          <View style={styles.searchField}><FormField hideLabel label="Tìm bạn hoặc nhập mã bạn bè" value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none" placeholder="Tìm bạn hoặc nhập mã bạn bè" colors={colors} inputStyle={styles.searchInput} /></View>
          {search ? <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" hitSlop={8} onPress={() => setSearch('')} style={[styles.clear, { backgroundColor: colors.soft }]}>
            <AppIcon name="close" size={14} color={colors.text} />
          </Pressable> : null}
        </View>

        {identity?.friendCode ? <View style={styles.myCode}>
          <Text numberOfLines={1} style={[styles.myCodeText, { color: colors.muted }]}>
            Mã của bạn: <Text selectable style={[styles.myCodeValue, { color: colors.text }]}>{identity.friendCode}</Text>
          </Text>
          <IconAction label={copied ? 'Đã sao chép mã' : 'Sao chép mã'} icon={copied ? 'check' : 'copy'} tint={copied ? colors.primary : colors.text} onPress={copyCode} colors={colors} />
          <IconAction label="Chia sẻ link kết bạn" icon="share" tint={colors.text} onPress={() => { void shareLink(); }} colors={colors} />
        </View> : null}

        {newFriendCode ? found === null ? <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.warm }]}><AppIcon name="search" size={26} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Không tìm thấy mã này</Text>
          <Text style={[styles.emptyHint, { color: colors.muted }]}>Kiểm tra lại mã bạn bè rồi thử lại.</Text>
        </View> : <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: found ? avatarTint(found.displayName) : colors.warm }]}>
            {found ? <Text style={[styles.avatarText, { color: colors.text }]}>{initialFrom(found.displayName)}</Text> : <AppIcon name="inviteUser" size={20} color={colors.primary} />}
          </View>
          <View style={styles.rowCopy}>
            {lookingUp ? <SkeletonBlock width="55%" height={16} colors={colors} /> : <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{found?.displayName ?? newFriendCode}</Text>}
            <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>{found?.self ? 'Đây là mã của bạn' : found?.alreadyFriends ? 'Đã là bạn bè' : `Mã bạn bè · ${newFriendCode}`}</Text>
          </View>
          {found?.self || found?.alreadyFriends ? null : <PillButton label="Kết bạn" onPress={() => { void invite(newFriendCode, found?.displayName ?? newFriendCode); }} disabled={busy || lookingUp} colors={colors} />}
        </View> : null}

        {loading ? <LoadingState label="Đang tải bạn bè" colors={colors} /> : null}
        {!loading && error ? <StatusNotice title="Chưa tải được bạn bè" message={errorMessage(error)} tone="error" actionLabel="Thử lại" onAction={() => { void load(true); }} colors={colors} /> : null}
        {inboxError && !loading && !error ? <StatusNotice title="Không tải được lời mời" message={errorMessage(inboxError)} tone="warning" actionLabel="Tải lại" onAction={() => { void load(true); }} colors={colors} /> : null}

        {!loading && !error && incoming.length > 0 ? <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.muted }]}>{`Lời mời kết bạn · ${incoming.length}`}</Text>
          {incoming.map(item => <View key={item.eventId} style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: avatarTint(item.title) }]}><Text style={[styles.avatarText, { color: colors.text }]}>{initialFrom(item.title)}</Text></View>
            <View style={styles.rowCopy}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{item.title}</Text>
              <Text numberOfLines={1} style={[styles.caption, { color: colors.muted }]}>{`${item.body.charAt(0).toLocaleUpperCase('vi')}${item.body.slice(1)} · ${shortAgo(item.createdAt)}`}</Text>
            </View>
            <View style={styles.inviteActions}>
              <PillButton label="Từ chối" variant="secondary" onPress={() => { void answerIncoming(item, 'reject'); }} disabled={busy} colors={colors} />
              <PillButton label="Đồng ý" onPress={() => { void answerIncoming(item, 'accept'); }} disabled={busy} colors={colors} />
            </View>
          </View>)}
        </View> : null}

        {!loading && !error ? <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.muted }]}>{query ? `Kết quả · ${visibleFriends.length}` : `Bạn bè · ${friends.length}`}</Text>
          {visibleFriends.length === 0 ? (newFriendCode ? null : <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.warm }]}><AppIcon name={friends.length === 0 && !query ? 'friends' : 'search'} size={26} color={colors.primary} /></View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
            <Text style={[styles.emptyHint, { color: colors.muted }]}>{emptyHint}</Text>
          </View>) : visibleFriends.map(friend => (
            <SwipeToDeleteRow key={friend.id} accessibilityLabel={`Xóa ${friend.displayName}`} disabled={busy} onDelete={() => setAction({ kind: 'unfriend', friend })} colors={colors}>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: avatarTint(friend.displayName) }]}><Text style={[styles.avatarText, { color: colors.text }]}>{initialFrom(friend.displayName)}</Text></View>
                <View style={styles.rowCopy}><Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{friend.displayName}</Text></View>
                <PillButton label="Rủ ăn" onPress={() => onNavigate(`/room/setup?invite=${encodeURIComponent(friend.friendUserId)}`)} disabled={busy} colors={colors} />
              </View>
            </SwipeToDeleteRow>
          ))}
        </View> : null}
        {message ? <ToastNotice title={message} /> : null}
      </View>

      <SheetDialog visible={action !== null} title={`Xóa ${action?.friend.displayName ?? 'bạn'} khỏi bạn bè?`} presentation="dialog" showHandle={false} showClose={false} onClose={() => { if (!busy) setAction(null); }} colors={colors}>
        <Text style={[styles.dialogText, { color: colors.muted }]}>Hai bạn sẽ không còn trong danh sách bạn bè của nhau. Phòng đang chơi không bị ảnh hưởng.</Text>
        <View style={styles.dialogActions}>
          <AppButton label="Hủy" variant="secondary" disabled={busy} onPress={() => setAction(null)} colors={colors} style={styles.dialogButton} singleLine />
          <AppButton label="Xác nhận xóa bạn" variant="danger" onPress={confirm} loading={busy} colors={colors} style={styles.dialogButton} singleLine />
        </View>
      </SheetDialog>
    </ApiFeatureFrame>
  );
}

const avatarColors = ['#FDE7C8', '#D9F2DD', '#DCEBFF', '#F7DCEB', '#E9E1FB', '#FFF1B8'];

function IconAction({ label, icon, tint, onPress, disabled, colors }: { label: string; icon: AppIconName; tint: string; onPress: () => void; disabled?: boolean; colors: ReturnType<typeof useShellTheme>['colors'] }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={4} onPress={onPress}
    style={({ pressed }) => [styles.iconAction, { backgroundColor: pressed ? colors.soft : 'transparent', opacity: disabled ? 0.5 : 1 }]}>
    <AppIcon name={icon} size={20} color={tint} />
  </Pressable>;
}

function PillButton({ label, accessibilityLabel, onPress, disabled, variant = 'primary', colors }: { label: string; accessibilityLabel?: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary'; colors: ReturnType<typeof useShellTheme>['colors'] }) {
  const primary = variant === 'primary';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.pill, { backgroundColor: primary ? colors.primary : colors.soft, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
    <Text numberOfLines={1} style={[styles.pillText, { color: primary ? colors.onPrimary : colors.text }]}>{label}</Text>
  </Pressable>;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function shortAgo(value: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} giờ` : `${Math.floor(hours / 24)} ngày`;
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
  content: { gap: 20 },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 8 },
  searchField: { flex: 1 },
  searchInput: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, minHeight: 44, fontSize: 15 },
  clear: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  myCode: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -8 },
  myCodeText: { flex: 1, fontFamily: 'InterRegular', fontSize: 14, lineHeight: 20 },
  myCodeValue: { fontFamily: 'InterSemiBold', letterSpacing: 1 },
  section: { gap: 4 },
  sectionTitle: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 20, marginBottom: 4 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowCopy: { flex: 1, minWidth: 0, gap: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'InterSemiBold', fontSize: 17, lineHeight: 24 },
  name: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  inviteRow: { gap: 10, paddingVertical: 8 },
  inviteTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteText: { flex: 1, minWidth: 0, fontFamily: 'InterRegular', fontSize: 14, lineHeight: 20 },
  inviteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  pill: { minHeight: 36, minWidth: 72, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18 },
  iconAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dialogText: { fontFamily: 'InterRegular', fontSize: 14, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', gap: 12 },
  dialogButton: { flex: 1 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 32 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: 'InterSemiBold', fontSize: 16, lineHeight: 22 },
  emptyHint: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
});
