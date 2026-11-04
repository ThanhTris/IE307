import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { HistoryItem } from '../../../data/api/contracts';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, useMockDemoApi, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void };
type PendingDelete = HistoryItem | null;
type NetworkPreview = 'online' | 'offline-cache' | 'offline-empty';

export function HistoryScreen({ onNavigate, onHome }: Props) {
  const { api, mode, setMode, revision, reload } = useMockDemoApi();
  const colors = useDemoColors();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState({ personal: true, group: true });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [networkPreview, setNetworkPreview] = useState<NetworkPreview>('online');
  const [cachedSnapshot, setCachedSnapshot] = useState<{ items: HistoryItem[]; fetchedAt: string } | null>(null);
  const sequence = useRef(0);
  const loadKey = `${mode}:${revision}`;
  const loading = networkPreview === 'online' && loadedKey !== loadKey;
  const currentError = networkPreview === 'offline-empty' || (networkPreview === 'offline-cache' && !cachedSnapshot)
    ? 'OFFLINE_NO_CACHE'
    : networkPreview === 'online' && loadedKey === loadKey ? error : '';

  useEffect(() => {
    if (networkPreview !== 'online') return;
    let active = true;
    void Promise.all([api.getHistory('personal'), api.getHistory('group')]).then(([personal, group]) => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (!personal.ok) { setError(personal.error.messageKey); }
      else if (!group.ok) { setError(group.error.messageKey); }
      else {
        setError('');
        const nextItems = [...personal.data, ...group.data];
        const nextFetchedAt = new Date().toISOString();
        setItems(nextItems);
        setFetchedAt(nextFetchedAt);
        setCachedSnapshot({ items: nextItems, fetchedAt: nextFetchedAt });
      }
    });
    return () => { active = false; };
  }, [api, loadKey, networkPreview]);

  const setScopeConsent = async (scope: 'personal' | 'group', nextValue: boolean) => {
    if (busy || networkPreview !== 'online') return;
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
    if (!pendingDelete || busy || networkPreview !== 'online') return;
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
    setCachedSnapshot(current => current ? { ...current, items: current.items.filter(item => item.id !== target.id) } : null);
    setMessage('Đã xóa summary trong adapter mock.');
  };

  const sourceItems = networkPreview === 'offline-cache' ? (cachedSnapshot?.items ?? []) : items;
  const visibleItems = sourceItems.filter(item => consent[item.scope]).sort((a, b) => b.mealDate.localeCompare(a.mealDate));
  const shownFetchedAt = networkPreview === 'offline-cache' ? cachedSnapshot?.fetchedAt : networkPreview === 'online' ? fetchedAt : null;
  return (
    <DemoFrame title="Lịch sử ăn" subtitle="GM-14 · consent, xóa summary và thời điểm lấy dữ liệu" active="history" onNavigate={onNavigate} onHome={onHome} mode={mode} onModeChange={setMode}>
      <View style={styles.networkSection}>
        <Text style={[styles.helperStrong, { color: colors.text }]}>Trạng thái kết nối · fixture</Text>
        <View style={styles.networkOptions}>
          {([
            ['online', 'Đang kết nối'],
            ['offline-cache', 'Ngoại tuyến · có cache'],
            ['offline-empty', 'Ngoại tuyến · chưa có cache'],
          ] as const).map(([value, label]) => {
            const selected = networkPreview === value;
            return <Pressable key={value} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => {
              setNetworkPreview(value);
              if (value !== 'online') setPendingDelete(null);
              if (value === 'online') reload();
            }} style={[styles.networkOption, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.line }]}>
              <Text style={[styles.networkOptionText, { color: selected ? colors.onPrimary : colors.text }]}>{label}</Text>
            </Pressable>;
          })}
        </View>
        <Text style={[styles.helper, { color: colors.muted }]}>Cache chỉ mô phỏng trong bộ nhớ của màn này; không tạo hoặc xóa lịch sử cục bộ.</Text>
      </View>
      <View style={[styles.consentCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Quyền lưu lịch sử</Text>
        <ConsentRow title="Lịch sử cá nhân" value={consent.personal} disabled={busy || networkPreview !== 'online'} onChange={value => void setScopeConsent('personal', value)} colors={colors} />
        <ConsentRow title="Tóm tắt nhóm" value={consent.group} disabled={busy || networkPreview !== 'online'} onChange={value => void setScopeConsent('group', value)} colors={colors} />
        <Text style={[styles.helper, { color: colors.muted }]}>Rút consent chỉ thay trạng thái mock tại màn này; API/server thật chưa được gọi.</Text>
      </View>
      {shownFetchedAt && <Text style={[styles.meta, { color: colors.muted }]}>{networkPreview === 'offline-cache' ? 'Bản lưu gần nhất' : 'Lấy từ fixture'} lúc {new Date(shownFetchedAt).toLocaleString()} · chưa lưu cache bền vững.</Text>}
      {networkPreview === 'offline-cache' && cachedSnapshot && <StatusNotice title="Ngoại tuyến · đang xem bản lưu cũ" message="Dữ liệu chỉ đọc được từ fixture đã tải trong phiên này. Thao tác thay đổi lịch sử đang khóa." tone="warning" colors={colors} />}
      {loading && <StatusNotice title="Đang tải lịch sử mock…" message="Đọc hai scope qua ApiClient." tone="info" colors={colors} />}
      {!loading && currentError && <StatusNotice title={networkPreview !== 'online' ? 'Không có bản lưu ngoại tuyến' : 'Không tải được lịch sử'} message={networkPreview !== 'online' ? 'Chưa có dữ liệu cache trong fixture này. Kết nối lại để thử tải lịch sử.' : `${currentError}. Dữ liệu cũ được giữ nguyên trong bộ nhớ.`} tone="error" actionLabel="Kết nối lại và thử tải" onAction={() => { setNetworkPreview('online'); reload(); }} colors={colors} />}
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
          <View style={styles.historyActions}>
            <AppButton label="Xem chi tiết" variant="secondary" onPress={() => setSelectedItem(item)} colors={colors} style={styles.historyAction} />
            <AppButton label="Xóa mục lịch sử" variant="danger" onPress={() => setPendingDelete(item)} disabled={busy || networkPreview !== 'online'} colors={colors} style={styles.historyAction} />
          </View>
        </View>
      ))}
      <View style={[styles.p1Card, { backgroundColor: colors.soft, borderColor: colors.line }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Liên kết tài khoản · P1</Text>
        <Text style={[styles.helper, { color: colors.muted }]}>Chưa triển khai. Lịch sử này không đồng bộ hoặc khôi phục qua tài khoản.</Text>
      </View>
      {message ? <StatusNotice title="Cập nhật mock" message={message} tone={message.includes('Chưa') ? 'error' : 'success'} colors={colors} /> : null}
      <SheetDialog visible={pendingDelete !== null} title="Xóa mục lịch sử?" onClose={() => setPendingDelete(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>Xóa riêng summary “{pendingDelete?.winnerName ?? 'Bữa ăn đã chốt'}” trong fixture? Không chứa phiếu thô hoặc vị trí GPS.</Text>
        <AppButton label="Xác nhận xóa" variant="danger" onPress={() => void deleteSelected()} disabled={networkPreview !== 'online'} loading={busy} colors={colors} />
      </SheetDialog>
      <SheetDialog visible={selectedItem !== null} title="Chi tiết lịch sử" onClose={() => setSelectedItem(null)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>{selectedItem?.winnerName ?? 'Không có thông tin món thắng trong mục lịch sử này.'}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>Phòng {selectedItem?.roomCode} · {selectedItem?.memberCount} thành viên · {selectedItem?.scope === 'group' ? 'Tóm tắt nhóm' : 'Lịch sử cá nhân'}</Text>
      </SheetDialog>
    </DemoFrame>
  );
}

function ConsentRow({ title, value, disabled, onChange, colors }: { title: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void; colors: ReturnType<typeof useDemoColors> }) {
  return <View style={styles.consentRow}><Text style={[styles.bodyStrong, { color: colors.text }]}>{title}</Text><Switch accessibilityLabel={title} value={value} disabled={disabled} onValueChange={onChange} /></View>;
}

const styles = StyleSheet.create({
  networkSection: { gap: 8 },
  networkOptions: { gap: 8 },
  networkOption: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  networkOptionText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  consentCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  consentRow: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  helper: { fontSize: 12, lineHeight: 18 },
  helperStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 18 },
  historyCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  historyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyAction: { flexGrow: 1, flexBasis: 140 },
  historyTop: { flexDirection: 'row', gap: 12 },
  historyText: { flex: 1, gap: 4 },
  p1Card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
});
