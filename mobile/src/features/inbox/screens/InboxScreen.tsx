import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { InboxItem } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, CollectionState, LoadingState, ApiFeatureFrame } from '../../../shared/ui';
import { useInboxBadge } from '../../../shared/lib/inboxBadge';
import { errorMessage } from '../../friends/screens/FriendsScreen';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import type { InboxRepository } from '../services/inboxRepository';
import { findInboxEventById, acceptedRoomPath, roomDestinationPath } from '../services/notificationInboxResolver';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

type Props = {
  repository: InboxRepository;
  displayName: string;
  onNavigate: (path: string) => void;
  onHome: () => void;
  onPushSettings?: () => void;
  isSessionCurrent?: () => boolean;
  openEventId?: string;
  notificationStatus?: string;
};
type AnswerKind = 'accept' | 'reject';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function InboxScreen({ repository, displayName, onNavigate, onHome, onPushSettings, isSessionCurrent, openEventId, notificationStatus }: Props) {
  const { colors } = useShellTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.5;
  const { setUnread, syncFriends } = useInboxBadge();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [message, setMessage] = useState('');
  const [notificationRetry, setNotificationRetry] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationRetryRevision, setNotificationRetryRevision] = useState(0);
  const lock = useRef(false);
  const cursorRef = useRef(cursor);
  const itemsRef = useRef(items);
  const targetedItemRef = useRef<InboxItem | null>(null);
  const loadingMoreRef = useRef(loadingMore);
  const markAllRequestId = useRef<string | null>(null);
  const newItems = items.filter(item => !item.read);
  // The bell follows this list as soon as something is read or answered.
  useEffect(() => { if (!loading && !error) setUnread(items.filter(item => !item.read).length); }, [items, loading, error, setUnread]);
  useEffect(() => { cursorRef.current = cursor; }, [cursor]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);

  const load = useCallback(async (more = false) => {
    const pageCursor = cursorRef.current;
    if (more && (!pageCursor || loadingMoreRef.current)) return;
    if (more) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const known = more ? new Set(itemsRef.current.map(item => item.eventId)) : new Set<string>();
      const result = await repository.list(more ? pageCursor : undefined, known);
      if (!result.ok) {
        setItems([]);
        setCursor(undefined);
        setError(result.error.messageKey);
      } else {
        setItems(current => {
          if (more) return [...current, ...result.data.items];
          const targeted = targetedItemRef.current;
          return targeted && targeted.eventId === openEventId
            ? [targeted, ...result.data.items.filter(item => item.id !== targeted.id)]
            : result.data.items;
        });
        setCursor(result.data.nextCursor);
      }
    } catch {
      setItems([]);
      setCursor(undefined);
      setError('NETWORK_ERROR');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [openEventId, repository]);

  const markAllRead = async () => {
    if (lock.current || itemsRef.current.length === 0) return;
    const requestId = markAllRequestId.current ?? createDurableRequestId('inbox_read_all');
    markAllRequestId.current = requestId;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await repository.markAllRead(requestId);
      if (!result.ok) {
        setMessage(`Không thể đánh dấu tất cả đã đọc (${errorMessage(result.error.messageKey)}). Có thể thử lại an toàn.`);
        await load();
        return;
      }
      markAllRequestId.current = null;
      setItems(current => current.map(item => ({ ...item, read: true })));
      await load();
    } catch {
      // Keep the request ID: a retry must replay the server ACK if it committed.
      setMessage('Chưa xác nhận được phản hồi. Tải lại để kiểm tra; thử lại sẽ dùng cùng yêu cầu an toàn.');
      await load();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (openEventId) return;
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load, openEventId]);

  useEffect(() => {
    if (!openEventId) return;
    if (!UUID.test(openEventId)) {
      const timer = setTimeout(() => {
        setNotificationRetry(false);
        setMessage('Liên kết thông báo không hợp lệ. Hãy mở Hộp thư để xem thông báo hiện có.');
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    let active = true;
    const isCurrent = () => active && (!isSessionCurrent || isSessionCurrent());
    if (targetedItemRef.current?.eventId !== openEventId) targetedItemRef.current = null;
    const timer = setTimeout(() => {
      if (!isCurrent()) return;
      setNotificationLoading(true);
      setNotificationRetry(false);
      setMessage('');
      void (async () => {
      try {
        const found = await findInboxEventById(repository, openEventId);
        if (!isCurrent()) return;
        if (!found.ok) {
          const retryable = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'NOT_READY'].includes(found.error.messageKey);
          setNotificationRetry(retryable);
          setMessage(retryable
            ? 'Chưa tải được thông báo từ máy chủ. Hãy thử lại cùng thông báo.'
            : 'Thông báo này đã hết hạn, bị xóa hoặc không còn thuộc tài khoản hiện tại.');
          return;
        }
        setError('');
        if (!found.data) {
          setMessage('Thông báo này đã hết hạn, bị xóa hoặc không còn thuộc tài khoản hiện tại.');
          return;
        }

        const item = found.data;
        if (item.type === 'friend_invite' || item.type === 'room_invite') {
          targetedItemRef.current = item;
          setItems([item]);
          return;
        }

        const reference = readRoomResultReference(item);
        if (!reference) {
          setMessage('Thông báo này không còn tham chiếu kết quả hợp lệ.');
          return;
        }
        const resolved = await repository.resolveRoomResult(reference.roomId, reference.resultId, reference.contractVersion);
        if (!isCurrent()) return;
        if (!resolved.ok) {
          const retryable = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'NOT_READY'].includes(resolved.error.messageKey);
          setNotificationRetry(retryable);
          setMessage(retryable
            ? 'Chưa tải được kết quả từ máy chủ. Hãy thử lại cùng thông báo.'
            : 'Kết quả đã hết hạn hoặc không còn được phép xem bằng tài khoản hiện tại.');
          return;
        }
        onNavigate(roomDestinationPath(resolved.data));
      } catch {
        if (isCurrent()) {
          setNotificationRetry(true);
          setMessage('Chưa kết nối được để tải thông báo. Hãy thử lại cùng thông báo.');
        }
      } finally {
        if (active) {
          setNotificationLoading(false);
          setLoading(false);
        }
      }
      })();
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [openEventId, repository, isSessionCurrent, onNavigate, notificationRetryRevision]);

  const notificationMessage = notificationStatus === 'unavailable'
      ? 'Thông báo này đã hết hạn, bị xóa hoặc không còn thuộc tài khoản hiện tại.'
      : !openEventId && notificationStatus === 'retry'
        ? 'Chưa tải được thông báo từ máy chủ. Hãy thử tải lại Hộp thư.'
      : openEventId && !UUID.test(openEventId)
        ? 'Liên kết thông báo không hợp lệ. Hãy mở Hộp thư để xem thông báo hiện có.'
        : '';
  const displayedMessage = notificationMessage || message;

  const answer = async (item: InboxItem, kind: AnswerKind) => {
    if (lock.current) return;
    const pending = { item, kind };
    const invitationId = readInvitationId(pending.item);
    if (!invitationId) {
      setMessage('Mục này thiếu metadata.invitationId. Không gửi eventId thay thế.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (pending.item.type === 'room_invite' && pending.kind === 'accept') {
        const result = await repository.acceptRoom(invitationId, displayName);
        if (!result.ok) {
          setMessage(errorMessage(result.error.messageKey));
          await load();
          return;
        }
        repository.markHandled(pending.item.eventId);
        if (targetedItemRef.current?.eventId === pending.item.eventId) targetedItemRef.current = null;
        setItems(current => current.filter(item => item.eventId !== pending.item.eventId));
        const room = result.data;
        const resolved = await repository.resolveAcceptedRoom(room.roomId);
        if (!resolved.ok) {
          setMessage(`Lời mời đã được chấp nhận nhưng chưa tải được trạng thái phòng (${resolved.error.messageKey}). Tải lại hộp thư hoặc mở phòng sau; không gửi lại lời chấp nhận.`);
          await load();
          return;
        }
        onNavigate(acceptedRoomPath(resolved.data));
        return;
      }
      const result = pending.item.type === 'friend_invite'
        ? pending.kind === 'accept'
          ? await repository.acceptFriend(invitationId)
          : await repository.rejectFriend(invitationId)
        : await repository.rejectRoom(invitationId);
      if (!result.ok) {
        setMessage(errorMessage(result.error.messageKey));
        await load();
        return;
      }
      repository.markHandled(pending.item.eventId);
      if (targetedItemRef.current?.eventId === pending.item.eventId) targetedItemRef.current = null;
      setItems(current => current.filter(item => item.eventId !== pending.item.eventId));
      if (pending.item.type === 'friend_invite' && pending.kind === 'accept') syncFriends();
      await load();
    } catch {
      setMessage('Chưa rõ máy chủ đã nhận thao tác hay chưa. Hộp thư đã được tải lại để kiểm tra trạng thái.');
      await load();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  /** Opening or tapping a notification marks it as read, here and on the server. */
  const markOneRead = (item: InboxItem) => {
    if (item.read) return;
    setItems(current => current.map(entry => (entry.eventId === item.eventId ? { ...entry, read: true } : entry)));
    void repository.markRead(item.eventId).catch(() => undefined);
  };

  const openRoomResult = async (item: InboxItem) => {
    markOneRead(item);
    const reference = readRoomResultReference(item);
    if (!reference) {
      setMessage('Thông báo thiếu mã phòng hoặc kết quả từ máy chủ. Không thể mở kết quả bằng nội dung thông báo.');
      return;
    }
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await repository.resolveRoomResult(reference.roomId, reference.resultId, reference.contractVersion);
      if (!result.ok) {
        setMessage(`Không thể mở kết quả đã lưu (${errorMessage(result.error.messageKey)}). Tải lại trạng thái phòng rồi thử lại.`);
        return;
      }
      onNavigate(roomDestinationPath(result.data));
    } catch {
      setMessage('Không kết nối được để xác minh kết quả với máy chủ. Hãy thử lại khi có mạng.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const visible = tab === 'unread' ? newItems : items;
  const groups = groupByDay(visible);
  return (
    <ApiFeatureFrame active="inbox" title="Thông báo" onNavigate={onNavigate} onHome={onHome}
      headerAction={items.length > 0 && !loading && !error ? { label: 'Đánh dấu tất cả đã đọc', icon: 'readAll', onPress: () => { void markAllRead(); }, disabled: busy || loadingMore || newItems.length === 0 } : undefined}>
      {loading ? <LoadingState label="Đang tải thông báo" colors={colors} /> : null}
      {!loading && error ? <CollectionState state="error" title="Chưa tải được thông báo" message={errorMessage(error)} actionLabel="Thử lại" onAction={() => { void load(); }} colors={colors} /> : null}
      {!openEventId && !loading && !error && items.length === 0 ? <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.warm }]}><AppIcon name="bell" size={32} color={colors.text} /></View>
        <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.text }]}>Chưa có thông báo</Text>
      </View> : null}
      {!loading && !error && items.length > 0 ? <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.soft }]}>
        {([['all', 'Tất cả'], ['unread', newItems.length ? `Chưa đọc · ${newItems.length}` : 'Chưa đọc']] as const).map(([id, label]) => (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)}
            style={[styles.tab, tab === id && { backgroundColor: colors.surface }]}>
            <Text style={[styles.tabText, { color: tab === id ? colors.text : colors.muted }]}>{label}</Text>
          </Pressable>
        ))}
      </View> : null}
      {!loading && !error && items.length > 0 && visible.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>Không có thông báo chưa đọc</Text> : null}
      {!loading && !error ? groups.map(group => <View key={group.key} style={styles.section}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.muted }]}>{group.label}</Text>
        {group.items.map((item, index) => renderInboxItem(item, index === group.items.length - 1))}
      </View>) : null}
      {!loading && !error && cursor ? <AppButton label="Tải thông báo cũ hơn" variant="secondary" onPress={() => { void load(true); }} disabled={loadingMore || busy} loading={loadingMore} colors={colors} /> : null}
      {displayedMessage ? <ToastNotice title="Chưa thực hiện được" message={displayedMessage} tone="error" /> : null}
      {openEventId && notificationRetry ? <AppButton label="Thử lại tải thông báo" variant="secondary" onPress={() => setNotificationRetryRevision(value => value + 1)} disabled={notificationLoading || busy} loading={notificationLoading} colors={colors} /> : null}
    </ApiFeatureFrame>
  );

  function renderInboxItem(item: InboxItem, last: boolean) {
    const invitation = item.type === 'friend_invite' || item.type === 'room_invite';
    const invitationId = invitation ? readInvitationId(item) : undefined;
    const resultReference = item.type === 'room_result' ? readRoomResultReference(item) : undefined;
    const sender = item.title;
    const content = <View style={[styles.item, !last && { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.itemIcon, { backgroundColor: item.type === 'room_result' ? colors.soft : colors.warm }]}>
        {item.type === 'room_result'
          ? <AppIcon name={item.metadata?.status === 'DECIDED' ? 'check' : 'minus'} size={20} color={colors.text} />
          : <Text style={[styles.avatarInitial, { color: colors.text }]}>{initialFrom(sender)}</Text>}
      </View>
      <View style={styles.itemCopy}>
        {invitation
          ? <>
            <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{sender}</Text>
            <Text numberOfLines={1} style={[styles.sub, { color: colors.muted }]}>{`${capitalize(item.body)} · ${timeAgo(item.createdAt)}`}</Text>
          </>
          : <>
            <Text numberOfLines={largeText ? undefined : 2} style={[item.read ? styles.body : styles.bodyUnread, { color: colors.text }]}>{item.title}</Text>
            <Text numberOfLines={largeText ? undefined : 2} style={[styles.sub, { color: colors.muted }]}>{`${item.body} · ${timeAgo(item.createdAt)}`}</Text>
          </>}
        {invitation && !invitationId ? <Text style={[styles.sub, { color: colors.warning }]}>Thiếu mã lời mời từ máy chủ; không thể xử lý mục này.</Text> : null}
        {item.type === 'room_result' && !resultReference ? <Text style={[styles.sub, { color: colors.warning }]}>Thiếu tham chiếu kết quả từ máy chủ.</Text> : null}
      </View>
      {invitation ? <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Từ chối" accessibilityState={{ disabled: busy || !invitationId }} disabled={busy || !invitationId} onPress={() => { void answer(item, 'reject'); }}
          style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? colors.soft : colors.surface, borderColor: colors.line, opacity: busy ? 0.5 : 1 }]}>
          <Text style={[styles.pillText, { color: colors.text }]}>Từ chối</Text>
        </Pressable>
        {/* Figma 286:2245: room invites say "Vào phòng", friend invites say "Đồng ý". */}
        <Pressable accessibilityRole="button" accessibilityLabel={item.type === 'room_invite' ? 'Vào phòng' : 'Đồng ý'} accessibilityState={{ disabled: busy || !invitationId }} disabled={busy || !invitationId} onPress={() => { void answer(item, 'accept'); }}
          style={({ pressed }) => [styles.pill, { backgroundColor: colors.primary, borderColor: colors.primary, opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}>
          <Text style={[styles.pillText, { color: colors.onPrimary }]}>{item.type === 'room_invite' ? 'Vào phòng' : 'Đồng ý'}</Text>
        </Pressable>
      </View> : null}
      {!item.read && !invitation ? <View accessibilityLabel="Chưa đọc" style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
    </View>;
    if (item.type === 'room_result') {
      return <Pressable key={item.eventId} accessibilityRole="button" accessibilityLabel={`Mở kết quả: ${item.title}`} onPress={() => { void openRoomResult(item); }} disabled={busy || !resultReference}>{content}</Pressable>;
    }
    // Invitations: tapping the row only marks it read; the buttons answer it.
    return <Pressable key={item.eventId} accessibilityRole="summary" onPress={() => markOneRead(item)}>{content}</Pressable>;
  }
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);

function dayKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** "Hôm nay", "Hôm qua", then the date, newest first. */
function groupByDay(items: InboxItem[]): { key: string; label: string; items: InboxItem[] }[] {
  const today = dayKey(new Date().toISOString()), yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  const map = new Map<string, InboxItem[]>();
  for (const item of [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    const key = dayKey(item.createdAt);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()].map(([key, list]) => {
    const date = new Date(list[0]!.createdAt);
    const label = key === today ? 'Hôm nay' : key === yesterday ? 'Hôm qua'
      : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    return { key, label, items: list };
  });
}

function readInvitationId(item: InboxItem): string | undefined {
  const value = item.metadata?.invitationId;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRoomResultReference(item: InboxItem): { roomId: string; resultId: string; contractVersion?: string } | undefined {
  const roomId = item.metadata?.roomId;
  const resultId = item.metadata?.resultId;
  if (typeof roomId !== 'string' || !UUID.test(roomId) || typeof resultId !== 'string' || !UUID.test(resultId)) return undefined;
  // The exact legacy projection intentionally has no version discriminator. The
  // inbox adapter has already rejected extra or unsupported metadata fields.
  return { roomId, resultId, ...(typeof item.metadata?.contractVersion === 'string' ? { contractVersion: item.metadata.contractVersion } : {}) };
}

function initialFrom(value: string): string {
  return value.trim().charAt(0).toLocaleUpperCase() || '•';
}

function timeAgo(value: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

const styles = StyleSheet.create({
  emptyWrap: { flexGrow: 1, minHeight: 580, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyGlyph: { width: 28, height: 28 },
  emptyTitle: { fontFamily: 'InterBold', fontSize: 20, lineHeight: 28 },
  tabs: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  tab: { flex: 1, minHeight: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  empty: { fontFamily: 'InterRegular', fontSize: 14, textAlign: 'center', paddingVertical: 32 },
  section: { gap: 0 },
  sectionTitle: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 20, marginVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 21 },
  body: { fontFamily: 'InterRegular', fontSize: 15, lineHeight: 21 },
  bodyUnread: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 21 },
  sub: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  pill: { minHeight: 34, minWidth: 64, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18 },
  avatarInitial: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18 },
});
