import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HistoryItem } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { ApiFeatureFrame } from '../../shared/components/ApiFeatureFrame';
import { errorMessage } from '../../friends/screens/LiveFriendsScreen';
import type { HistoryRepository } from '../services/historyRepository';

type Props = { repository: HistoryRepository; onNavigate: (path: string) => void; onHome: () => void };
type PendingAction = { kind: 'consent'; scope: 'personal' | 'group'; enabled: boolean } | { kind: 'delete'; item: HistoryItem } | null;

export function LiveHistoryScreen({ repository, onNavigate, onHome }: Props) {
  const { colors } = useShellTheme();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState(repository.cached()?.fetchedAt ?? '');
  const [action, setAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await repository.fetch();
      if (!result.ok) {
        setItems([]);
        setError(result.error.messageKey);
      } else {
        setItems(result.data.items);
        setFetchedAt(result.data.fetchedAt);
      }
    } catch {
      setItems([]);
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
      const result = pending.kind === 'consent'
        ? await repository.updateConsent({ scope: pending.scope, consent: pending.enabled })
        : await repository.delete(pending.item.id);
      if (!result.ok) {
        setMessage(errorMessage(result.error.messageKey));
        return;
      }
      repository.invalidate();
      setFetchedAt('');
      setMessage(pending.kind === 'consent'
        ? `Máy chủ đã nhận lựa chọn ${pending.enabled ? 'cho phép' : 'rút'} consent ${pending.scope}.`
        : 'Máy chủ đã nhận yêu cầu xóa. Đang tải lại lịch sử theo quyền hiện tại.');
      await load(true);
    } catch {
      setMessage('Chưa rõ máy chủ đã nhận thao tác hay chưa. Tải lại lịch sử để kiểm tra trạng thái.');
      await load(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <ApiFeatureFrame active="history" title="Lịch sử" onNavigate={onNavigate} onHome={onHome}>
      <View style={[styles.consentCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Quyền lưu lịch sử</Text>
        <Text style={[styles.helper, { color: colors.muted }]}>Trạng thái hiện tại do máy chủ quản lý. Chọn rõ hành động; dữ liệu nhóm chỉ xuất hiện nếu máy chủ xác nhận đủ quyền.</Text>
        <ConsentChoice title="Lịch sử cá nhân" scope="personal" disabled={busy} onChoose={setAction} colors={colors} />
        <ConsentChoice title="Tóm tắt nhóm" scope="group" disabled={busy} onChoose={setAction} colors={colors} />
      </View>
      {fetchedAt ? <Text style={[styles.meta, { color: colors.muted }]}>Lần tải thành công gần nhất: {new Date(fetchedAt).toLocaleString()} · thời gian thiết bị.</Text> : null}
      {loading ? <StatusNotice title="Đang tải lịch sử…" message="Đang tải riêng lịch sử cá nhân và nhóm từ máy chủ." tone="info" colors={colors} /> : null}
      {!loading && error ? <StatusNotice title="Không tải được lịch sử" message={errorMessage(error)} tone="error" actionLabel="Tải lại" onAction={() => { void load(true); }} colors={colors} /> : null}
      {!loading && !error ? <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text style={[styles.heading, { color: colors.text }]}>Bữa ăn đã lưu · {items.length}</Text>
          <AppButton label="Tải lại" variant="quiet" onPress={() => { void load(true); }} disabled={refreshing || busy} loading={refreshing} colors={colors} />
        </View>
        {items.length === 0 ? <StatusNotice title="Chưa có lịch sử được chia sẻ" message="Máy chủ không trả về mục nào có thể xem theo consent và quyền hiện tại." tone="info" colors={colors} /> : items.map(item => (
          <View key={item.id} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.name, { color: colors.text }]}>{item.winnerName ?? 'Bữa ăn đã chốt'}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>{new Date(item.mealDate).toLocaleString()}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>{item.scope === 'group' ? 'Tóm tắt nhóm' : 'Cá nhân'} · {item.memberCount} thành viên · mã {item.roomCode}</Text>
            <AppButton label="Xóa mục lịch sử" variant="danger" onPress={() => setAction({ kind: 'delete', item })} disabled={busy} colors={colors} />
          </View>
        ))}
      </View> : null}
      {message ? <StatusNotice title="Kết quả máy chủ" message={message} tone={message.startsWith('Chưa') ? 'warning' : 'success'} colors={colors} /> : null}
      <SheetDialog visible={action !== null} title={actionTitle(action)} onClose={() => { if (!busy) setAction(null); }} colors={colors}>
        <Text style={[styles.helper, { color: colors.text }]}>{actionMessage(action)}</Text>
        <AppButton label={actionLabel(action)} variant={action?.kind === 'delete' || (action?.kind === 'consent' && !action.enabled) ? 'danger' : 'primary'} onPress={() => void confirm()} loading={busy} colors={colors} />
      </SheetDialog>
    </ApiFeatureFrame>
  );
}

function ConsentChoice({ title, scope, disabled, onChoose, colors }: {
  title: string;
  scope: 'personal' | 'group';
  disabled: boolean;
  onChoose: (action: PendingAction) => void;
  colors: ReturnType<typeof useShellTheme>['colors'];
}) {
  return <View style={styles.consentRow}>
    <Text style={[styles.consentTitle, { color: colors.text }]}>{title}</Text>
    <View style={styles.choiceButtons}>
      <AppButton label="Cho phép" onPress={() => onChoose({ kind: 'consent', scope, enabled: true })} disabled={disabled} colors={colors} style={styles.choiceButton} />
      <AppButton label="Rút consent" variant="secondary" onPress={() => onChoose({ kind: 'consent', scope, enabled: false })} disabled={disabled} colors={colors} style={styles.choiceButton} />
    </View>
  </View>;
}

function actionTitle(action: PendingAction): string {
  if (action?.kind === 'delete') return 'Xóa mục lịch sử?';
  if (action?.kind === 'consent') return `${action.enabled ? 'Cho phép' : 'Rút'} consent ${action.scope}?`;
  return 'Xác nhận';
}

function actionLabel(action: PendingAction): string {
  if (action?.kind === 'delete') return 'Xác nhận xóa';
  if (action?.kind === 'consent') return action.enabled ? 'Xác nhận cho phép' : 'Xác nhận rút consent';
  return 'Xác nhận';
}

function actionMessage(action: PendingAction): string {
  if (action?.kind === 'delete') return `Gửi yêu cầu xóa mục “${action.item.winnerName ?? 'Bữa ăn đã chốt'}”. Máy chủ sẽ áp dụng quyền sở hữu và quyền nhóm.`;
  if (action?.kind === 'consent') return `Gửi lựa chọn ${action.enabled ? 'cho phép' : 'rút'} consent ${action.scope} đến máy chủ. Máy chủ sẽ cập nhật quyền hiển thị.`;
  return '';
}

const styles = StyleSheet.create({
  consentCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  helper: { fontSize: 13, lineHeight: 19 },
  meta: { fontSize: 12, lineHeight: 18 },
  section: { gap: 10 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  consentRow: { gap: 8 },
  consentTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  choiceButtons: { flexDirection: 'row', gap: 8 },
  choiceButton: { flex: 1 },
  historyCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
});
