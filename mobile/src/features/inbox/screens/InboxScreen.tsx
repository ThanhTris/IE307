import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { MockApiClient, type InboxItem } from '../../../data/api';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, useMockDemoApi, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void; mockClient?: MockApiClient };
type InboxAction = { item: InboxItem; kind: 'accept' | 'reject' } | null;

export function InboxScreen({ onNavigate, onHome, mockClient }: Props) {
  const { api, mode, setMode, revision, reload } = useMockDemoApi(mockClient);
  const colors = useDemoColors();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [pushDenied, setPushDenied] = useState(true);
  const [action, setAction] = useState<InboxAction>(null);
  const [handled, setHandled] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const loadKey = `${mode}:${revision}`;
  const loading = loadedKey !== loadKey;
  const currentError = loadedKey === loadKey ? error : '';

  useEffect(() => {
    let active = true;
    void api.listPartnerInbox().then(result => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (result.ok) { setItems(result.data); setError(''); }
      else { setItems([]); setError(result.error.messageKey); }
    });
    return () => { active = false; };
  }, [api, loadKey]);

  const processAction = async () => {
    if (!action || busy) return;
    const pending = action;
    setAction(null);
    const invitationId = getInvitationId(pending.item);
    const unavailableReason = getInvitationUnavailableReason(pending.item);
    if (!invitationId || unavailableReason) {
      setMessage(!invitationId ? 'Không thể xử lý: thiếu mã lời mời.' : unavailableReason ?? 'Không thể xử lý lời mời.');
      return;
    }
    setBusy(true);
    const requestId = `gm14-inbox-${pending.kind}-${++sequence.current}`;
    const result = pending.item.type === 'friend_invite'
      ? pending.kind === 'accept'
        ? await api.acceptPartner(invitationId, requestId)
        : await api.rejectPartner(invitationId, requestId)
      : pending.kind === 'accept'
        ? await api.acceptRoomInvite({ invitationId, displayName: 'Bạn mock', requestId })
        : await api.rejectRoomInvite(invitationId, requestId);
    setBusy(false);
    if (!result.ok) {
      setMessage(`Chưa xử lý được · ${result.error.messageKey}`);
      return;
    }
    setHandled(current => [...current, pending.item.id]);
    setMessage(pending.kind === 'accept' ? 'Đã chấp nhận lời mời trong mock.' : 'Đã từ chối lời mời trong mock.');
  };

  const visibleItems = items.filter(item => !handled.includes(item.id));
  return (
    <DemoFrame title="Hộp thư" subtitle="GM-14 · inbox hoạt động cả khi push bị từ chối" active="inbox" onNavigate={onNavigate} onHome={onHome} mode={mode} onModeChange={setMode}>
      <View style={[styles.permissionCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.permissionText}>
          <Text style={[styles.title, { color: colors.text }]}>Thông báo trên thiết bị</Text>
          <Text style={[styles.body, { color: colors.muted }]}>Mock không xin quyền, đăng ký thiết bị hoặc gửi push.</Text>
        </View>
        <Switch accessibilityLabel="Mô phỏng quyền thông báo bị từ chối" value={pushDenied} onValueChange={setPushDenied} />
        {pushDenied ? <Text style={[styles.denied, { color: colors.warning }]}>Quyền bị từ chối · bạn vẫn đọc được inbox bên dưới.</Text> : <Text style={[styles.denied, { color: colors.green }]}>Trạng thái quyền mock: đã cho phép.</Text>}
      </View>
      {loading && <StatusNotice title="Đang tải thông báo…" message="Đọc qua ApiClient mock." tone="info" colors={colors} />}
      {!loading && currentError && <StatusNotice title="Không tải được hộp thư" message={`${currentError}. Không dùng fallback dữ liệu giả.`} tone="error" actionLabel="Thử lại" onAction={reload} colors={colors} />}
      {!loading && !currentError && visibleItems.length === 0 && <StatusNotice title="Hộp thư trống" message="Không có thông báo mock để hiển thị." tone="info" colors={colors} />}
      {!loading && !currentError && visibleItems.map(item => {
        const invitation = item.type === 'friend_invite' || item.type === 'room_invite';
        const invitationId = getInvitationId(item);
        const unavailableReason = invitation ? getInvitationUnavailableReason(item) : undefined;
        return (
          <View key={item.id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.itemTop}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.readState, { color: item.read ? colors.muted : colors.primary }]}>{item.read ? 'Đã đọc' : 'Mới'}</Text>
            </View>
            <Text style={[styles.body, { color: colors.text }]}>{item.body}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>{item.type === 'room_result' ? 'Kết quả phòng' : item.type === 'room_invite' ? 'Lời mời vào phòng' : 'Lời mời kết bạn'} · {new Date(item.createdAt).toLocaleString()}</Text>
            {invitation && !invitationId ? <Text style={[styles.meta, { color: colors.warning }]}>Thiếu mã lời mời; không thể xử lý mục này.</Text> : null}
            {unavailableReason ? <Text style={[styles.meta, { color: colors.warning }]}>{unavailableReason}</Text> : null}
            {invitation && <View style={styles.actions}>
              <AppButton label={`Chấp nhận ${item.title}`} onPress={() => setAction({ item, kind: 'accept' })} disabled={busy || !invitationId || Boolean(unavailableReason)} colors={colors} style={styles.actionButton} />
              <AppButton label={`Từ chối ${item.title}`} variant="secondary" onPress={() => setAction({ item, kind: 'reject' })} disabled={busy || !invitationId || Boolean(unavailableReason)} colors={colors} style={styles.actionButton} />
            </View>}
          </View>
        );
      })}
      {message ? <StatusNotice title="Kết quả mock" message={message} tone={message.includes('Chưa') ? 'error' : 'success'} colors={colors} /> : null}
      <SheetDialog visible={action !== null} title={action?.kind === 'accept' ? 'Chấp nhận lời mời?' : 'Từ chối lời mời?'} onClose={() => setAction(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>{action?.item.type === 'room_invite' ? 'Chấp nhận lời mời mock; màn này không đặt ready thay bạn.' : 'Thao tác cần xác nhận và chỉ cập nhật adapter mock.'}</Text>
        <AppButton label={action?.kind === 'accept' ? 'Xác nhận chấp nhận' : 'Xác nhận từ chối'} variant={action?.kind === 'accept' ? 'primary' : 'danger'} onPress={() => void processAction()} loading={busy} colors={colors} />
      </SheetDialog>
    </DemoFrame>
  );
}

function getInvitationId(item: InboxItem): string | undefined {
  const id = item.metadata?.invitationId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

function getInvitationUnavailableReason(item: InboxItem): string | undefined {
  if (item.metadata?.status === 'expired') return 'Lời mời đã hết hạn; thao tác bị khóa.';
  const expiresAt = item.metadata?.expiresAt;
  if (typeof expiresAt !== 'string' || !Number.isFinite(Date.parse(expiresAt))) return 'Thiếu thời hạn hợp lệ; thao tác bị khóa.';
  if (Date.parse(expiresAt) <= Date.now()) return 'Lời mời đã hết hạn; thao tác bị khóa.';
  return undefined;
}

const styles = StyleSheet.create({
  permissionCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  permissionText: { flex: 1, minWidth: 210, gap: 4 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  denied: { width: '100%', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  item: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  itemTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  readState: { fontSize: 12, lineHeight: 18, fontWeight: '800' },
  meta: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
});
