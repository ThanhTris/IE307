import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Friend, SocialIdentity } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, FormField, SheetDialog, StatusNotice } from '../../../shared/ui';
import type { SocialRepository } from '../services/socialRepository';
import { ApiFeatureFrame } from '../../shared/components/ApiFeatureFrame';

type Props = { repository: SocialRepository; onNavigate: (path: string) => void; onHome: () => void };
type PendingAction = { kind: 'invite' } | { kind: 'unfriend'; friend: Friend } | null;

export function LiveFriendsScreen({ repository, onNavigate, onHome }: Props) {
  const { colors } = useShellTheme();
  const [identity, setIdentity] = useState<SocialIdentity | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [action, setAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [who, list] = await Promise.all([repository.getIdentity(), repository.listFriends()]);
      if (!who.ok) { setIdentity(null); setFriends([]); setError(who.error.messageKey); }
      else if (!list.ok) { setIdentity(who.data); setFriends([]); setError(list.error.messageKey); }
      else { setIdentity(who.data); setFriends(list.data); }
    } catch {
      setIdentity(null);
      setFriends([]);
      setError('NETWORK_ERROR');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const confirm = async () => {
    if (!action || lock.current) return;
    lock.current = true;
    setBusy(true);
    const pending = action;
    setAction(null);
    setMessage('');
    try {
      if (pending.kind === 'invite') {
        const result = await repository.invite({ friendCode: friendCode.trim().toUpperCase() });
        if (!result.ok) {
          setMessage(`Chưa hoàn tất · ${errorMessage(result.error.messageKey)}`);
          return;
        }
        setMessage(`Máy chủ đã nhận lời mời (${result.data.status}). Người nhận cần tự chấp nhận.`);
      } else {
        const result = await repository.removeFriend(pending.friend.friendUserId);
        if (!result.ok) {
          setMessage(`Chưa hoàn tất · ${errorMessage(result.error.messageKey)}`);
          return;
        }
        setMessage('Đã gửi yêu cầu xóa quan hệ bạn bè lên máy chủ.');
      }
      setFriendCode('');
      await load(true);
    } catch {
      setMessage('Không kết nối được máy chủ. Danh sách chưa được cập nhật; hãy tải lại trước khi thử tiếp.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <ApiFeatureFrame active="friends" title="Bạn bè" onNavigate={onNavigate} onHome={onHome}>
      {loading ? <StatusNotice title="Đang tải bạn bè…" message="Đang đọc danh tính và danh sách từ máy chủ." tone="info" colors={colors} /> : null}
      {!loading && error ? <StatusNotice title="Không tải được bạn bè" message={errorMessage(error)} tone="error" actionLabel="Tải lại" onAction={() => { void load(true); }} colors={colors} /> : null}
      {!loading && !error ? <>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Mã bạn bè của bạn</Text>
          <Text selectable style={[styles.code, { color: colors.primary }]}>{identity?.friendCode ?? 'Chưa có mã'}</Text>
          <Text style={[styles.helper, { color: colors.muted }]}>Chỉ chia sẻ mã này với người bạn muốn kết nối.</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Mời bạn</Text>
          <FormField label="Mã bạn bè" value={friendCode} onChangeText={value => setFriendCode(value.toUpperCase().slice(0, 12))} autoCapitalize="characters" autoCorrect={false} placeholder="Nhập mã bạn bè" colors={colors} />
          <AppButton label="Gửi lời mời" onPress={() => setAction({ kind: 'invite' })} disabled={friendCode.trim().length < 4 || busy} colors={colors} />
        </View>
        <View style={styles.section}>
          <View style={styles.sectionTop}>
            <Text style={[styles.heading, { color: colors.text }]}>Bạn bè · {friends.length}</Text>
            <AppButton label="Tải lại" variant="quiet" onPress={() => { void load(true); }} disabled={refreshing || busy} loading={refreshing} colors={colors} />
          </View>
          {friends.length === 0 ? <StatusNotice title="Chưa có bạn bè" message="Lời mời đến và lời mời vào phòng được xử lý trong Hộp thư." tone="info" colors={colors} /> : friends.map(friend => (
            <View key={friend.id} style={[styles.friend, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.friendInfo}>
                <Text style={[styles.name, { color: colors.text }]}>{friend.displayName}</Text>
                <Text style={[styles.helper, { color: colors.muted }]}>{friend.friendCode}</Text>
              </View>
              <AppButton label={`Xóa ${friend.displayName}`} variant="danger" onPress={() => setAction({ kind: 'unfriend', friend })} disabled={busy} colors={colors} />
            </View>
          ))}
        </View>
      </> : null}
      {message ? <StatusNotice title="Kết quả máy chủ" message={message} tone={message.startsWith('Chưa') ? 'error' : 'success'} colors={colors} /> : null}
      <SheetDialog visible={action !== null} title={action?.kind === 'invite' ? 'Gửi lời mời kết bạn?' : `Xóa ${action?.friend.displayName ?? 'bạn'}?`} onClose={() => { if (!busy) setAction(null); }} colors={colors}>
        <Text style={[styles.helper, { color: colors.text }]}>{action?.kind === 'invite' ? 'Lời mời sẽ được gửi tới máy chủ; người nhận cần tự chấp nhận.' : 'Máy chủ sẽ xóa quan hệ bạn bè. Thao tác không thay đổi trạng thái sẵn sàng trong phòng.'}</Text>
        <AppButton label={action?.kind === 'invite' ? 'Xác nhận gửi lời mời' : 'Xác nhận xóa bạn'} variant={action?.kind === 'invite' ? 'primary' : 'danger'} onPress={() => void confirm()} loading={busy} colors={colors} />
      </SheetDialog>
    </ApiFeatureFrame>
  );
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
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  code: { fontSize: 23, lineHeight: 29, fontWeight: '800', letterSpacing: 1 },
  helper: { fontSize: 13, lineHeight: 19 },
  section: { gap: 10 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  friend: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  friendInfo: { flex: 1, gap: 4 },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
});
