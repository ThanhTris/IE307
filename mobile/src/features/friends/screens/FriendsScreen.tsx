import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MockApiClient, type Friend, type ReadResult } from '../../../data/api';
import { AppButton, FormField, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, useMockDemoApi, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void; mockClient?: MockApiClient };
type IncomingInvite = { id: string; name: string; friendCode: string; expired: boolean };
type PendingAction = { kind: 'accept' | 'reject'; invite: IncomingInvite } | { kind: 'unfriend'; friend: Friend } | { kind: 'invite' } | null;

const incomingFixture: IncomingInvite[] = [
  { id: 'friend_invite_01', name: 'Linh', friendCode: 'LINH42', expired: false },
  { id: 'friend_invite_02', name: 'Mai', friendCode: 'MAI67', expired: false },
  { id: 'mock-friend-invite-expired', name: 'An', friendCode: 'AN2026', expired: true },
];

export function FriendsScreen({ onNavigate, onHome, mockClient }: Props) {
  const { api, mode, setMode, revision, reload } = useMockDemoApi(mockClient);
  const colors = useDemoColors();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState(incomingFixture);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [action, setAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const loadKey = `${mode}:${revision}`;
  const loading = loadedKey !== loadKey;
  const currentError = loadedKey === loadKey ? error : '';

  useEffect(() => {
    let active = true;
    void api.listFriends().then((result: ReadResult<Friend[]>) => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (result.ok) { setFriends(result.data); setError(''); }
      else { setFriends([]); setError(result.error.messageKey); }
    });
    return () => { active = false; };
  }, [api, loadKey]);

  const confirmAction = async () => {
    if (!action || busy) return;
    const pending = action;
    setAction(null);
    setBusy(true);
    setMessage('');
    const requestId = `gm14-social-${pending.kind}-${++sequence.current}`;
    let result;
    if (pending.kind === 'accept') result = await api.acceptPartner(pending.invite.id, requestId);
    else if (pending.kind === 'reject') result = await api.rejectPartner(pending.invite.id, requestId);
    else if (pending.kind === 'unfriend') result = await api.unfriend(pending.friend.friendUserId, requestId);
    else result = await api.invitePartner({ friendCode: friendCode.trim().toUpperCase(), requestId });
    setBusy(false);
    if (!result.ok) {
      setMessage(`Thao tác chưa hoàn tất · ${result.error.messageKey}`);
      return;
    }
    if (pending.kind === 'accept') {
      setIncoming(items => items.filter(item => item.id !== pending.invite.id));
      setFriends(items => [...items, { id: pending.invite.id, friendUserId: pending.invite.id, displayName: pending.invite.name, friendCode: pending.invite.friendCode, status: 'active', since: new Date().toISOString() }]);
      setMessage(`Đã chấp nhận lời mời mock của ${pending.invite.name}.`);
    } else if (pending.kind === 'reject') {
      setIncoming(items => items.filter(item => item.id !== pending.invite.id));
      setMessage('Đã từ chối lời mời mock.');
    } else if (pending.kind === 'unfriend') {
      setFriends(items => items.filter(item => item.friendUserId !== pending.friend.friendUserId));
      setMessage(`Đã xóa ${pending.friend.displayName} khỏi danh sách mock.`);
    } else {
      setFriendCode('');
      setMessage('Đã gửi lời mời mock. Người nhận chưa tự động trở thành bạn.');
    }
  };

  const colorsForText = { color: colors.text };
  return (
    <DemoFrame title="Bạn bè" subtitle="GM-14 · lời mời, danh sách và xác nhận thao tác" active="friends" onNavigate={onNavigate} onHome={onHome} mode={mode} onModeChange={setMode}>
      {loading && <StatusNotice title="Đang tải danh sách bạn" message="Đọc qua ApiClient mock." tone="info" colors={colors} />}
      {!loading && currentError && <StatusNotice title="Không tải được bạn bè" message={`${currentError}. Mock không tự đổi sang dữ liệu thành công.`} tone="error" actionLabel="Thử lại" onAction={reload} colors={colors} />}
      {!loading && !currentError && <>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, colorsForText]}>Mã mời bạn bè</Text>
          <Text style={[styles.helper, { color: colors.muted }]}>Nhập mã mock; không tạo link hoặc gửi lời mời thật.</Text>
          <FormField label="Mã bạn bè" value={friendCode} onChangeText={value => setFriendCode(value.toUpperCase().slice(0, 12))} autoCapitalize="characters" autoCorrect={false} placeholder="VD: LINH42" helperText="Lời mời cần xác nhận ở bước tiếp theo." colors={colors} />
          <AppButton label="Gửi lời mời" onPress={() => setAction({ kind: 'invite' })} disabled={friendCode.trim().length < 4 || busy} loading={busy} colors={colors} />
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, colorsForText]}>Lời mời đến · fixture</Text>
          {incoming.length === 0 ? <StatusNotice title="Không còn lời mời" message="Danh sách lời mời mock đang trống." tone="info" colors={colors} /> : incoming.map(invite => (
            <View key={invite.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.name, colorsForText]}>{invite.name}</Text>
              <Text style={[styles.helper, { color: colors.muted }]}>{invite.friendCode} · {invite.expired ? 'Đã hết hạn' : 'Đang chờ phản hồi'}</Text>
              {!invite.expired && <View style={styles.actions}>
                <AppButton label="Chấp nhận" onPress={() => setAction({ kind: 'accept', invite })} disabled={busy} colors={colors} style={styles.actionButton} />
                <AppButton label="Từ chối" variant="secondary" onPress={() => setAction({ kind: 'reject', invite })} disabled={busy} colors={colors} style={styles.actionButton} />
              </View>}
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, colorsForText]}>Bạn đã kết nối · {friends.length}</Text>
          {friends.length === 0 ? <StatusNotice title="Chưa có bạn bè" message="Thử trạng thái Trống để xem empty state." tone="info" colors={colors} /> : friends.map(friend => (
            <View key={friend.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.friendLine}>
                <View style={[styles.avatar, { backgroundColor: colors.warm }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{friend.displayName.slice(0, 1)}</Text></View>
                <View style={styles.friendInfo}><Text style={[styles.name, colorsForText]}>{friend.displayName}</Text><Text style={[styles.helper, { color: colors.muted }]}>{friend.friendCode}</Text></View>
                <AppButton label="Xóa bạn" variant="danger" onPress={() => setAction({ kind: 'unfriend', friend })} disabled={busy} colors={colors} style={styles.actionButton} />
              </View>
            </View>
          ))}
        </View>
        {message ? <StatusNotice title="Kết quả mock" message={message} tone={message.includes('chưa') ? 'warning' : 'success'} colors={colors} /> : null}
      </>}
      <SheetDialog visible={action !== null} title={confirmTitle(action)} onClose={() => setAction(null)} colors={colors}>
        <Text style={[styles.body, colorsForText]}>{confirmMessage(action)}</Text>
        <AppButton label={action?.kind === 'invite' ? 'Gửi lời mời mock' : action?.kind === 'unfriend' ? 'Xác nhận xóa bạn' : action?.kind === 'accept' ? 'Xác nhận chấp nhận' : 'Xác nhận từ chối'} variant={action?.kind === 'unfriend' || action?.kind === 'reject' ? 'danger' : 'primary'} onPress={() => void confirmAction()} loading={busy} colors={colors} />
      </SheetDialog>
    </DemoFrame>
  );
}

function confirmTitle(action: PendingAction) {
  if (action?.kind === 'invite') return 'Gửi lời mời kết bạn?';
  if (action?.kind === 'unfriend') return `Xóa ${action.friend.displayName}?`;
  if (action?.kind === 'accept') return `Chấp nhận ${action.invite.name}?`;
  if (action?.kind === 'reject') return `Từ chối ${action.invite.name}?`;
  return 'Xác nhận';
}

function confirmMessage(action: PendingAction) {
  if (action?.kind === 'invite') return 'Chỉ gọi adapter mock theo API contract; không gửi thông báo ra ngoài.';
  if (action?.kind === 'unfriend') return 'Bạn cần xác nhận trước khi xóa quan hệ bạn bè trong fixture.';
  if (action?.kind === 'accept') return 'Chấp nhận lời mời mock; không tự vào phòng hoặc đặt sẵn sàng.';
  if (action?.kind === 'reject') return 'Từ chối lời mời mock này?';
  return '';
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  helper: { fontSize: 12, lineHeight: 18 },
  body: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
  friendLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  friendInfo: { flex: 1, gap: 2 },
});
