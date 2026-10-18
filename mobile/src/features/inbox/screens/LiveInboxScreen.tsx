import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { InboxItem } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { ApiFeatureFrame } from '../../shared/components/ApiFeatureFrame';
import { errorMessage } from '../../friends/screens/LiveFriendsScreen';
import type { InboxRepository } from '../services/inboxRepository';

type Props = { repository: InboxRepository; displayName: string; onNavigate: (path: string) => void; onHome: () => void };
type PendingAction = { item: InboxItem; kind: 'accept' | 'reject' } | null;

export function LiveInboxScreen({ repository, displayName, onNavigate, onHome }: Props) {
  const { colors } = useShellTheme();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [fetchedAt, setFetchedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const cursorRef = useRef(cursor);
  const itemsRef = useRef(items);
  const loadingMoreRef = useRef(loadingMore);
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
        setItems(current => more ? [...current, ...result.data.items] : result.data.items);
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
  }, [repository]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

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
        const room = result.data;
        setMessage('Đã xác nhận lời mời. Đang mở phòng; bạn chưa được đặt sẵn sàng.');
        onNavigate(`/room-preview?roomId=${encodeURIComponent(room.roomId)}&code=${encodeURIComponent(room.code)}&role=member&version=${room.version}`);
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

  return (
    <ApiFeatureFrame active="inbox" title="Hộp thư" onNavigate={onNavigate} onHome={onHome}>
      <View style={[styles.permission, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.title, { color: colors.text }]}>Thông báo trên thiết bị</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Quyền thông báo chỉ điều khiển push. Hộp thư này luôn đọc dữ liệu đã xác thực từ máy chủ.</Text>
      </View>
      {fetchedAt ? <Text style={[styles.meta, { color: colors.muted }]}>Đọc từ máy chủ lúc {new Date(fetchedAt).toLocaleString()}</Text> : null}
      {loading ? <StatusNotice title="Đang tải hộp thư…" message="Đang xác thực và tải thông báo mới." tone="info" colors={colors} /> : null}
      {!loading && error ? <StatusNotice title="Không tải được hộp thư" message={errorMessage(error)} tone="error" actionLabel="Tải lại" onAction={() => { void load(); }} colors={colors} /> : null}
      {!loading && !error && items.length === 0 ? <StatusNotice title="Hộp thư trống" message="Máy chủ hiện không trả về thông báo còn hiệu lực." tone="info" colors={colors} /> : null}
      {!loading && !error ? items.map(item => {
        const invitation = item.type === 'friend_invite' || item.type === 'room_invite';
        const invitationId = invitation ? readInvitationId(item) : undefined;
        return (
          <View key={item.eventId} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.itemTop}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: item.read ? colors.muted : colors.primary }]}>{item.read ? 'Đã đọc' : 'Mới'}</Text>
            </View>
            <Text style={[styles.body, { color: colors.text }]}>{item.body}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>{item.type === 'room_result' ? 'Kết quả phòng' : item.type === 'room_invite' ? 'Lời mời vào phòng' : 'Lời mời kết bạn'} · {new Date(item.createdAt).toLocaleString()}</Text>
            {invitation && !invitationId ? <Text style={[styles.meta, { color: colors.warning }]}>Thiếu mã lời mời từ máy chủ; không thể xử lý mục này.</Text> : null}
            {invitation && <View style={styles.actions}>
              <AppButton label={`Chấp nhận ${item.title}`} onPress={() => setAction({ item, kind: 'accept' })} disabled={busy || !invitationId} colors={colors} style={styles.actionButton} />
              <AppButton label={`Từ chối ${item.title}`} variant="secondary" onPress={() => setAction({ item, kind: 'reject' })} disabled={busy || !invitationId} colors={colors} style={styles.actionButton} />
            </View>}
            {item.type === 'room_result' ? <AppButton label="Mở lịch sử" variant="quiet" onPress={() => onNavigate('/gm28/history')} colors={colors} /> : null}
          </View>
        );
      }) : null}
      {!loading && !error && cursor ? <AppButton label="Tải thông báo cũ hơn" variant="secondary" onPress={() => { void load(true); }} disabled={loadingMore || busy} loading={loadingMore} colors={colors} /> : null}
      {message ? <StatusNotice title="Kết quả máy chủ" message={message} tone={message.includes('Chưa') || message.includes('thiếu') ? 'warning' : 'success'} colors={colors} /> : null}
      <SheetDialog visible={action !== null} title={action?.kind === 'accept' ? 'Chấp nhận lời mời?' : 'Từ chối lời mời?'} onClose={() => { if (!busy) setAction(null); }} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>{action?.item.type === 'room_invite' ? 'Máy chủ sẽ thêm bạn vào phòng nếu lời mời còn hiệu lực. Việc này không gửi phiếu và không đặt sẵn sàng.' : 'Thao tác sẽ được gửi lên máy chủ cho lời mời này.'}</Text>
        <AppButton label={action?.kind === 'accept' ? 'Xác nhận chấp nhận' : 'Xác nhận từ chối'} variant={action?.kind === 'accept' ? 'primary' : 'danger'} onPress={() => void confirm()} loading={busy} colors={colors} />
      </SheetDialog>
    </ApiFeatureFrame>
  );
}

function readInvitationId(item: InboxItem): string | undefined {
  const value = item.metadata?.invitationId;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

const styles = StyleSheet.create({
  permission: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  item: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
});
