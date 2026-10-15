import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import type { HistoryItem } from '../../../data/api/contracts';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, useMockDemoApi, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void };
type PendingDelete = HistoryItem | null;

export function HistoryScreen({ onNavigate, onHome }: Props) {
  const { api, mode, setMode, revision, reload } = useMockDemoApi();
  const colors = useDemoColors();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState({ personal: true, group: true });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const sequence = useRef(0);
  const loadKey = `${mode}:${revision}`;
  const loading = loadedKey !== loadKey;
  const currentError = loadedKey === loadKey ? error : '';

  useEffect(() => {
    let active = true;
    void Promise.all([api.getHistory('personal'), api.getHistory('group')]).then(([personal, group]) => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (!personal.ok) { setError(personal.error.messageKey); setItems([]); }
      else if (!group.ok) { setError(group.error.messageKey); setItems([]); }
      else {
        setError('');
        setItems([...personal.data, ...group.data]);
        setFetchedAt(new Date().toISOString());
      }
    });
    return () => { active = false; };
  }, [api, loadKey]);

  const setScopeConsent = async (scope: 'personal' | 'group', nextValue: boolean) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const result = await api.updateHistoryConsent({ scope, consent: nextValue, requestId: `gm14-consent-${scope}-${++sequence.current}` });
    setBusy(false);
    if (!result.ok) {
      setMessage(`Chưa cập nhật được consent · ${result.error.messageKey}`);
      return;
    }
    setConsent(current => ({ ...current, [scope]: nextValue }));
    setMessage(nextValue ? `Đã bật consent ${scope} trong mock.` : `Đã tắt consent ${scope}; summary tương ứng được ẩn khỏi màn này.`);
  };

  const deleteSelected = async () => {
    if (!pendingDelete || busy) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    const result = await api.deleteHistory(target.id, `gm14-delete-${++sequence.current}`);
    setBusy(false);
    if (!result.ok) {
      setMessage(`Chưa xóa được · ${result.error.messageKey}`);
      return;
    }
    setItems(current => current.filter(item => item.id !== target.id));
    setMessage('Đã xóa summary trong adapter mock.');
  };

  const visibleItems = items.filter(item => consent[item.scope]).sort((a, b) => b.mealDate.localeCompare(a.mealDate));
  return (
    <DemoFrame title="Lịch sử ăn" subtitle="GM-14 · consent, xóa summary và thời điểm lấy dữ liệu" active="history" onNavigate={onNavigate} onHome={onHome} mode={mode} onModeChange={setMode}>
      <View style={[styles.consentCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Quyền lưu lịch sử</Text>
        <ConsentRow title="Lịch sử cá nhân" value={consent.personal} disabled={busy} onChange={value => void setScopeConsent('personal', value)} colors={colors} />
        <ConsentRow title="Tóm tắt nhóm" value={consent.group} disabled={busy} onChange={value => void setScopeConsent('group', value)} colors={colors} />
        <Text style={[styles.helper, { color: colors.muted }]}>Rút consent chỉ thay trạng thái mock tại màn này; API/server thật chưa được gọi.</Text>
      </View>
      {fetchedAt && <Text style={[styles.meta, { color: colors.muted }]}>Lấy từ fixture lúc {new Date(fetchedAt).toLocaleString()} · chưa lưu cache bền vững.</Text>}
      {loading && <StatusNotice title="Đang tải lịch sử mock…" message="Đọc hai scope qua ApiClient." tone="info" colors={colors} />}
      {!loading && currentError && <StatusNotice title="Không tải được lịch sử" message={`${currentError}. Không tự dùng cache khác thay response.`} tone="error" actionLabel="Thử lại" onAction={reload} colors={colors} />}
      {!loading && !currentError && visibleItems.length === 0 && <StatusNotice title="Chưa có lịch sử được chia sẻ" message="Có thể danh sách đang trống hoặc consent của scope đang tắt." tone="info" colors={colors} />}
      {!loading && !currentError && visibleItems.map(item => (
        <View key={item.id} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.historyTop}>
            <View style={styles.historyText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.winnerName ?? 'Bữa ăn đã chốt'}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>{new Date(item.mealDate).toLocaleString()}</Text>
              <Text style={[styles.meta, { color: colors.muted }]}>{item.scope === 'group' ? 'Tóm tắt nhóm' : 'Cá nhân'} · {item.memberCount} thành viên · mã {item.roomCode}</Text>
            </View>
          </View>
          <AppButton label="Xóa mục lịch sử" variant="danger" onPress={() => setPendingDelete(item)} disabled={busy} colors={colors} />
        </View>
      ))}
      <View style={[styles.p1Card, { backgroundColor: colors.soft, borderColor: colors.line }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Liên kết tài khoản · P1</Text>
        <Text style={[styles.helper, { color: colors.muted }]}>Chưa triển khai. Lịch sử này không đồng bộ hoặc khôi phục qua tài khoản.</Text>
      </View>
      {message ? <StatusNotice title="Cập nhật mock" message={message} tone={message.includes('Chưa') ? 'error' : 'success'} colors={colors} /> : null}
      <SheetDialog visible={pendingDelete !== null} title="Xóa mục lịch sử?" onClose={() => setPendingDelete(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>Xóa riêng summary “{pendingDelete?.winnerName ?? 'Bữa ăn đã chốt'}” trong fixture? Không chứa phiếu thô hoặc vị trí GPS.</Text>
        <AppButton label="Xác nhận xóa" variant="danger" onPress={() => void deleteSelected()} loading={busy} colors={colors} />
      </SheetDialog>
    </DemoFrame>
  );
}

function ConsentRow({ title, value, disabled, onChange, colors }: { title: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void; colors: ReturnType<typeof useDemoColors> }) {
  return <View style={styles.consentRow}><Text style={[styles.bodyStrong, { color: colors.text }]}>{title}</Text><Switch accessibilityLabel={title} value={value} disabled={disabled} onValueChange={onChange} /></View>;
}

const styles = StyleSheet.create({
  consentCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  consentRow: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  helper: { fontSize: 12, lineHeight: 18 },
  meta: { fontSize: 12, lineHeight: 18 },
  historyCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  historyTop: { flexDirection: 'row', gap: 12 },
  historyText: { flex: 1, gap: 4 },
  p1Card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
});
