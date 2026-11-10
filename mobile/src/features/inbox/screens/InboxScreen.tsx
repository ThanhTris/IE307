import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { InboxItem } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, CollectionState, SheetDialog, StatusNotice } from '../../../shared/ui';
import { ApiFeatureFrame } from '../../shared/components/ApiFeatureFrame';
import { errorMessage } from '../../friends/screens/FriendsScreen';
import { createDurableRequestId } from '../../rooms/services/roomRepository';
import type { InboxRepository } from '../services/inboxRepository';
import { findInboxEventById, roomDestinationPath } from '../services/notificationInboxResolver';
import CheckIcon from '../../../../assets/brand/icons/notification-check.svg';
import MinusIcon from '../../../../assets/brand/icons/notification-minus.svg';
import UnreadIcon from '../../../../assets/brand/icons/notification-unread.svg';

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
type PendingAction = { item: InboxItem; kind: 'accept' | 'reject' } | null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function InboxScreen({ repository, displayName, onNavigate, onHome, onPushSettings, isSessionCurrent, openEventId, notificationStatus }: Props) {
  const { colors } = useShellTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.5;
  const [items, setItems] = useState<InboxItem[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [fetchedAt, setFetchedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
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
  const previousItems = items.filter(item => item.read);
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
        setFetchedAt('');
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
        setFetchedAt(result.data.fetchedAt);
      }
    } catch {
      setItems([]);
      setCursor(undefined);
      setFetchedAt('');
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
      setMessage('Đã đánh dấu các thông báo hiện có là đã đọc.');
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
          setMessage('Đã mở lời mời từ máy chủ. Chấp nhận hoặc từ chối bên dưới để xác nhận.');
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

  const confirm = async () => {
    if (!action || lock.current) return;
    const pending = action;
    const invitationId = readInvitationId(pending.item);
    if (!invitationId) {
      setMessage('Mục này thiếu metadata.invitationId. Không gửi eventId thay thế.');
      setAction(null);
      return;
    }
    lock.current = true;
    setBusy(true);
    setAction(null);
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
        setMessage('Đã xác nhận lời mời. Đang tải trạng thái phòng mới nhất; bạn chưa được đặt sẵn sàng.');
        onNavigate(roomDestinationPath(resolved.data));
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
      setMessage(pending.kind === 'accept' ? 'Đã chấp nhận lời mời trên máy chủ.' : 'Đã từ chối lời mời trên máy chủ.');
      await load();
    } catch {
      setMessage('Chưa rõ máy chủ đã nhận thao tác hay chưa. Hộp thư đã được tải lại để kiểm tra trạng thái.');
      await load();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const openRoomResult = async (item: InboxItem) => {
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

  return (
    <ApiFeatureFrame active="inbox" title="Thông báo" onNavigate={onNavigate} onHome={onHome}>
      {onPushSettings ? <AppButton label="Cài đặt thông báo trên thiết bị" variant="secondary" onPress={onPushSettings} colors={colors} /> : null}
      {loading ? <CollectionState state="loading" title="Đang tải thông báo…" colors={colors} /> : null}
      {!loading && error ? <CollectionState state="error" title="Chưa tải được thông báo" message={errorMessage(error)} actionLabel="Thử lại" onAction={() => { void load(); }} colors={colors} /> : null}
      {!openEventId && !loading && !error && items.length === 0 ? <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.warm }]}><Image source={require('../../../../assets/brand/icons/bell.png')} accessible={false} resizeMode="contain" style={[styles.emptyGlyph, { tintColor: colors.text }]} /></View>
        <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.text }]}>Chưa có thông báo</Text>
      </View> : null}
      {!loading && !error && items.length > 0 ? <View style={[styles.readAllRow, largeText && styles.readAllRowLarge]}>
        <Text style={[styles.readAllCount, { color: colors.muted }]}>{newItems.length ? `${newItems.length} thông báo chưa đọc trên trang` : 'Không có thông báo chưa đọc trên trang'}</Text>
        <AppButton label="Đọc tất cả" variant="quiet" onPress={() => { void markAllRead(); }} disabled={busy || loadingMore} loading={busy} colors={colors} style={styles.readAllButton} />
      </View> : null}
      {!loading && !error && newItems.length > 0 ? <View style={styles.section}>
        <View style={styles.sectionTop}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Mới</Text><Text style={[styles.readAll, { color: colors.primary }]}>{newItems.length}</Text></View>
        {newItems.map(item => renderInboxItem(item, false))}
      </View> : null}
      {!loading && !error && previousItems.length > 0 ? <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>Trước đó</Text>
        {previousItems.map(item => renderInboxItem(item, true))}
      </View> : null}
      {fetchedAt && items.length > 0 ? <Text style={[styles.meta, { color: colors.muted }]}>Cập nhật lúc {new Date(fetchedAt).toLocaleString()}</Text> : null}
      {!loading && !error && cursor ? <AppButton label="Tải thông báo cũ hơn" variant="secondary" onPress={() => { void load(true); }} disabled={loadingMore || busy} loading={loadingMore} colors={colors} /> : null}
      {displayedMessage ? <StatusNotice title="Thông báo từ máy chủ" message={displayedMessage} tone={displayedMessage.includes('Chưa') || displayedMessage.includes('thiếu') || displayedMessage.includes('Không thể') || displayedMessage.includes('hết hạn') || displayedMessage.includes('không hợp lệ') ? 'warning' : 'success'} colors={colors} /> : null}
      {openEventId && notificationRetry ? <AppButton label="Thử lại tải thông báo" variant="secondary" onPress={() => setNotificationRetryRevision(value => value + 1)} disabled={notificationLoading || busy} loading={notificationLoading} colors={colors} /> : null}
      <SheetDialog visible={action !== null} title={action?.kind === 'accept' ? 'Chấp nhận lời mời?' : 'Từ chối lời mời?'} onClose={() => { if (!busy) setAction(null); }} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>{action?.item.type === 'room_invite' ? 'Máy chủ sẽ thêm bạn vào phòng nếu lời mời còn hiệu lực. Việc này không gửi phiếu và không đặt sẵn sàng.' : 'Thao tác sẽ được gửi lên máy chủ cho lời mời này.'}</Text>
        <AppButton label={action?.kind === 'accept' ? 'Xác nhận chấp nhận' : 'Xác nhận từ chối'} variant={action?.kind === 'accept' ? 'primary' : 'danger'} onPress={() => void confirm()} loading={busy} colors={colors} />
      </SheetDialog>
    </ApiFeatureFrame>
  );

  function renderInboxItem(item: InboxItem, read: boolean) {
    const invitation = item.type === 'friend_invite' || item.type === 'room_invite';
    const invitationId = invitation ? readInvitationId(item) : undefined;
    const resultReference = item.type === 'room_result' ? readRoomResultReference(item) : undefined;
    const content = <>
      <View style={styles.itemTop}>
        <View style={[styles.itemIcon, { borderColor: colors.line, backgroundColor: read ? colors.surface : colors.background }]}>
          {item.type === 'room_result'
            ? item.metadata?.status === 'DECIDED' ? <CheckIcon /> : <MinusIcon />
            : <Text style={[styles.avatarInitial, { color: colors.text }]}>{initialFrom(item.title)}</Text>}
          {!read ? <View style={styles.unreadMark}><UnreadIcon /></View> : null}
        </View>
        <View style={styles.itemCopy}>
          <View style={[styles.itemTitleRow, largeText && styles.itemTitleRowLarge]}>
            <Text numberOfLines={largeText ? undefined : 1} style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text numberOfLines={1} style={[styles.meta, { color: colors.text }]}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text numberOfLines={largeText ? undefined : 2} style={[styles.body, { color: colors.text }]}>{item.body}</Text>
        </View>
      </View>
      {invitation && !invitationId ? <Text style={[styles.meta, { color: colors.warning }]}>Thiếu mã lời mời từ máy chủ; không thể xử lý mục này.</Text> : null}
      {invitation && <View style={[styles.actions, largeText && styles.actionsLarge]}>
        <AppButton label="Từ chối" variant="secondary" onPress={() => setAction({ item, kind: 'reject' })} disabled={busy || !invitationId} colors={colors} style={styles.actionButton} />
        <AppButton label="Chấp nhận" onPress={() => setAction({ item, kind: 'accept' })} disabled={busy || !invitationId} colors={colors} style={styles.actionButton} />
      </View>}
      {item.type === 'room_result' && !resultReference ? <Text style={[styles.meta, { color: colors.warning }]}>Thiếu tham chiếu kết quả từ máy chủ.</Text> : null}
    </>;
    const itemStyle = [styles.item, { backgroundColor: read ? colors.background : colors.warm, borderBottomColor: colors.line }];
    if (item.type === 'room_result') {
      return <Pressable key={item.eventId} accessibilityRole="button" accessibilityLabel={`Mở kết quả: ${item.title}`} onPress={() => { void openRoomResult(item); }} disabled={busy || !resultReference} style={itemStyle}>{content}</Pressable>;
    }
    return <View key={item.eventId} style={itemStyle}>{content}</View>;
  }
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
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

const styles = StyleSheet.create({
  emptyWrap: { flexGrow: 1, minHeight: 580, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyGlyph: { width: 28, height: 28 },
  emptyTitle: { fontFamily: 'InterBold', fontSize: 20, lineHeight: 28 },
  section: { gap: 8 },
  sectionTop: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'InterSemiBold', fontSize: 18, lineHeight: 25 },
  readAll: { fontFamily: 'InterSemiBold', fontSize: 12, lineHeight: 18 },
  readAllRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  readAllRowLarge: { alignItems: 'stretch', flexDirection: 'column' },
  readAllCount: { flex: 1, fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  readAllButton: { minWidth: 112, minHeight: 44 },
  item: { paddingHorizontal: 8, paddingVertical: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, minHeight: 36 },
  itemIcon: { position: 'relative', width: 32, height: 32, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18 },
  unreadMark: { position: 'absolute', width: 8, height: 8, right: -1, bottom: -1 },
  itemCopy: { flex: 1, minWidth: 0, gap: 2 },
  itemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  itemTitleRowLarge: { flexDirection: 'column' },
  title: { flex: 1, minWidth: 0, fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18 },
  body: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 17 },
  meta: { fontFamily: 'InterMedium', fontSize: 11, lineHeight: 16, flexShrink: 0 },
  actions: { flexDirection: 'row', gap: 8, paddingLeft: 40 },
  actionsLarge: { flexDirection: 'column', paddingLeft: 40 },
  actionButton: { flex: 1, minHeight: 48 },
});
