import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, LoadingState, SheetDialog, StatusNotice, ApiFeatureFrame } from '../../../shared/ui';
import { errorMessage } from '../../friends/screens/FriendsScreen';
import type { CanonicalHistoryItem, HistoryRow } from '../services/historyTypes';
import { historyIdOf, historyTitle, type HistoryRepository } from '../services/historyRepository';
import { ToastNotice, useToast } from '../../../shared/ui/feedback/Toast';
import { ResultDishArtwork } from '../../../shared/ui/result/ResultDishArtwork';
import { HistoryCard } from '../components/HistoryCard';
import { podiumOrder } from '../../result/services/resultPresentation';

const HISTORY_LOAD_TIMEOUT_MS = 15_000;

/** Never leave the screen spinning: a hung read resolves as a timeout the screen already handles. */
function withTimeout<T extends { ok: boolean }>(task: Promise<T>, ms: number): Promise<T | { ok: false; error: { messageKey: 'TIMEOUT' } }> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve({ ok: false, error: { messageKey: 'TIMEOUT' } }), ms);
    task.then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve({ ok: false, error: { messageKey: 'TIMEOUT' } }); });
  });
}

type Props = { repository: HistoryRepository; onNavigate: (path: string) => void; onHome: () => void };
type HistoryFilter = 'all' | 'decided' | 'no-consensus';
type PendingAction = { kind: 'delete'; item: HistoryRow } | null;

export function HistoryScreen({ repository, onNavigate, onHome }: Props) {
  const { colors } = useShellTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.5;
  const [items, setItems] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(repository.cached()?.fetchedAt ?? '');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [action, setAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const lock = useRef(false);
  const toast = useToast();
  // The account's "keep my meal history" choice; undefined until read (or when it cannot be read).
  const [consent, setConsent] = useState<boolean | undefined>();
  const [consentBusy, setConsentBusy] = useState(false);
  const selectedHistory = items.find((item): item is CanonicalHistoryItem => 'historyId' in item && item.historyId === selectedHistoryId);
  // Android back closes the detail first (the header arrow does the same).
  useEffect(() => {
    if (!selectedHistoryId) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { setSelectedHistoryId(null); return true; });
    return () => listener.remove();
  }, [selectedHistoryId]);
  const visibleItems = items.filter(item => {
    if (filter === 'all') return true;
    const decided = 'historyId' in item
      ? item.result.status === 'DECIDED'
      : Boolean(item.winnerName);
    return filter === 'decided' ? decided : 'historyId' in item && item.result.status === 'NO_CONSENSUS';
  });

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await withTimeout(repository.fetch(), HISTORY_LOAD_TIMEOUT_MS);
      if (!result.ok) {
        const cached = result.error.messageKey === 'NETWORK_ERROR' || result.error.messageKey === 'TIMEOUT'
          ? repository.cached() ?? await repository.cachedDurable().catch(() => undefined)
          : undefined;
        if (cached) {
          setItems(cached.items.filter(item => item.scope === 'personal'));
          setFetchedAt(cached.fetchedAt);
          setStale(true);
          setError(result.error.messageKey);
        } else {
          setItems([]);
          setFetchedAt('');
          setStale(false);
          setError(result.error.messageKey);
        }
      } else {
        setItems(result.data.items);
        setFetchedAt(result.data.fetchedAt);
        setStale(false);
      }
    } catch {
      const cached = repository.cached() ?? await repository.cachedDurable().catch(() => undefined);
      if (cached) {
        setItems(cached.items.filter(item => item.scope === 'personal'));
        setFetchedAt(cached.fetchedAt);
        setStale(true);
        setError('NETWORK_ERROR');
      } else {
        setItems([]);
        setFetchedAt('');
        setStale(false);
        setError('NETWORK_ERROR');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let active = true;
    void Promise.resolve(repository.readConsent()).then(result => { if (active && result?.ok) setConsent(result.data.personal); }).catch(() => undefined);
    return () => { active = false; };
  }, [repository]);

  const toggleConsent = async (next: boolean) => {
    if (consentBusy) return;
    setConsentBusy(true);
    try {
      const result = await repository.updateConsent({ scope: 'personal', consent: next });
      if (!result.ok) { toast?.show({ title: 'Chưa cập nhật được', message: errorMessage(result.error.messageKey), tone: 'error' }); return; }
      setConsent(next);
      await load(true);
      toast?.show({ title: next ? 'Đã bật lưu lịch sử' : 'Đã tắt lưu lịch sử', message: next ? 'Các bữa chốt từ giờ sẽ được lưu 30 ngày.' : 'Các bữa chốt từ giờ sẽ không được lưu.', tone: 'success' });
    } catch {
      toast?.show({ title: 'Chưa cập nhật được', message: 'Không kết nối được máy chủ.', tone: 'error' });
    } finally {
      setConsentBusy(false);
    }
  };

  const confirm = async () => {
    if (!action) return;
    const pending = action.item;
    setAction(null);
    await removeItem(pending);
  };

  /** Deletes one entry (swipe, or the confirmed button on the detail). */
  const removeItem = async (item: HistoryRow): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const result = await repository.delete(historyIdOf(item));
      if (!result.ok) { setMessage({ text: errorMessage(result.error.messageKey), tone: 'error' }); return false; }
      repository.invalidate();
      setFetchedAt('');
      setSelectedHistoryId(null);
      toast?.show({ title: 'Đã xóa mục lịch sử', tone: 'success' });
      await load(true);
      return true;
    } catch {
      setMessage({ text: 'Chưa rõ máy chủ đã nhận thao tác hay chưa. Tải lại lịch sử để kiểm tra trạng thái.', tone: 'error' });
      await load(true);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <ApiFeatureFrame active="history" title={selectedHistory ? 'Chi tiết bữa ăn' : 'Lịch sử'} onNavigate={onNavigate} onHome={onHome}
      onBack={selectedHistory ? () => setSelectedHistoryId(null) : undefined}>
      <View style={styles.content}>
        {!selectedHistory ? <View>
          <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.text }]}>Lịch sử</Text>
        </View> : null}

        {selectedHistory ? <SavedHistoryDetail item={selectedHistory} largeText={largeText} colors={colors}
          onCreateNew={() => onNavigate('/room/create')}
          onDelete={() => setAction({ kind: 'delete', item: selectedHistory })} busy={busy} /> : null}

        {!selectedHistory ? <View accessibilityRole="tablist" style={[styles.filters, largeText && styles.filtersLarge, { backgroundColor: colors.warm }]}>
          <FilterButton title="Tất cả" value="all" selected={filter} onSelect={setFilter} largeText={largeText} colors={colors} />
          <FilterButton title="Đã chốt" value="decided" selected={filter} onSelect={setFilter} largeText={largeText} colors={colors} />
          <FilterButton title="Chưa chốt" value="no-consensus" selected={filter} onSelect={setFilter} largeText={largeText} colors={colors} />
        </View> : null}

        {!selectedHistory && consent !== undefined ? <View style={[styles.consentCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={styles.consentCopy}>
            <Text style={[styles.consentTitle, { color: colors.text }]}>Lưu lịch sử bữa ăn</Text>
            <Text style={[styles.caption, { color: colors.muted }]}>{consent ? 'Bữa đã chốt được lưu 30 ngày. Chỉ bạn xem được.' : 'Đang tắt: các bữa mới sẽ không hiện ở đây.'}</Text>
          </View>
          <Switch accessibilityLabel="Lưu lịch sử bữa ăn" value={consent} disabled={consentBusy} onValueChange={value => { void toggleConsent(value); }} trackColor={{ false: colors.line, true: colors.primary }} />
        </View> : null}

        {stale && fetchedAt ? <>
          <ToastNotice title="Đang ngoại tuyến" message={`Dữ liệu lưu lúc ${new Date(fetchedAt).toLocaleString()} · có thể đã cũ`} tone="warning" />
          <AppButton label="Thử lại" variant="quiet" onPress={() => { void load(true); }} disabled={refreshing || busy} loading={refreshing} colors={colors} />
        </> : null}
        {loading ? <LoadingState label="Đang tải lịch sử" colors={colors} /> : null}
        {!loading && error && !stale ? <StatusNotice title="Chưa tải được lịch sử" message={errorMessage(error)} tone="error" actionLabel="Thử lại" onAction={() => { void load(true); }} colors={colors} /> : null}

        {!selectedHistory && !loading && (!error || stale) ? <View style={styles.section}>
          <View style={styles.sectionTop}>
            {refreshing && !stale ? <Text style={[styles.caption, { color: colors.muted }]}>Đang cập nhật…</Text> : null}
          </View>
          {visibleItems.length === 0 ? <View style={styles.emptyState}>
            {/* Figma 263:2012 "Lịch sử · Chưa có bữa đã lưu" */}
            <View style={[styles.emptyIcon, { backgroundColor: colors.warm }]}>{filter === 'all' ? <AppIcon name="bowl" size={36} color={colors.text} /> : <AppIcon name="minus" size={20} color={colors.text} />}</View>
            <Text accessibilityRole="header" style={[styles.emptyTitle, { color: colors.text }]}>{filter === 'all' ? 'Chưa có bữa ăn đã lưu' : 'Không có mục phù hợp'}</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>{filter === 'all' ? (consent === false ? 'Bật Lưu lịch sử ở trên để lưu các bữa sau.' : 'Bữa đã chốt sẽ hiện ở đây khi bật lưu lịch sử.') : 'Thử chọn bộ lọc khác.'}</Text>
            {filter === 'all'
              ? <AppButton label="Tạo phòng" onPress={() => onNavigate('/room/create')} colors={colors} />
              : <AppButton label="Xem tất cả" variant="secondary" onPress={() => setFilter('all')} colors={colors} />}
          </View> : groupHistory(visibleItems).map(group => <View key={group.key} style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>{group.label}</Text>
            {group.items.map(item => {
            const canonical = 'historyId' in item;
            const decided = canonical ? item.result.status === 'DECIDED' : Boolean(item.winnerName);
            const date = canonical ? item.createdAt : item.mealDate;
            const scored = canonical && item.result.status === 'DECIDED' && 'topDishes' in item.result ? item.result : undefined;
            const score = scored?.topDishes.find(entry => entry.isWinner)?.score;
            const winner = canonical && item.result.status === 'DECIDED' ? item.result.winner?.name : !canonical ? item.winnerName : undefined;
            const isLegacy = canonical && item.result.status === 'DECIDED' && !scored;
            return <HistoryCard key={historyIdOf(item)} title={decided ? winner ?? historyTitle(item) : 'Chưa chốt món'} meta={historyCardMetadata(item, date)} decided={decided}
              ranks={scored && scored.topDishes.length > 1 ? podiumOrder(scored.topDishes).map((entry, index) => `${index + 1}. ${entry.dish.name} · ${entry.score} điểm`) : []}
              footer={score !== undefined ? `${score} điểm` : isLegacy ? 'Kết quả cũ' : !decided ? 'Cả nhóm chưa chọn được món' : 'Đã chốt'} winnerLabel={decided ? 'Món được chọn' : undefined}
              largeText={largeText} disabled={busy} onOpen={canonical ? () => setSelectedHistoryId(item.historyId) : undefined} onDelete={() => removeItem(item)} colors={colors} />;
          })}</View>)}
        </View> : null}

        {message ? <ToastNotice title={message.tone === 'success' ? 'Đã xóa' : 'Chưa xóa được'} message={message.text} tone={message.tone} /> : null}
      </View>

      <SheetDialog visible={action !== null} title="Xóa mục lịch sử?" onClose={() => { if (!busy) setAction(null); }} colors={colors}>
        {action ? <Text style={[styles.caption, { color: colors.text }]}>{`Gửi yêu cầu xóa mục “${historyTitle(action.item)}”. Máy chủ sẽ áp dụng quyền sở hữu và quyền nhóm.`}</Text> : null}
        {action ? <AppButton label="Xác nhận xóa" variant="danger" onPress={() => void confirm()} loading={busy} colors={colors} /> : null}
      </SheetDialog>
    </ApiFeatureFrame>
  );
}

function FilterButton({ title, value, selected, onSelect, largeText, colors }: {
  title: string; value: HistoryFilter; selected: HistoryFilter;
  largeText: boolean;
  onSelect: (value: HistoryFilter) => void; colors: ReturnType<typeof useShellTheme>['colors'];
}) {
  const active = selected === value;
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onSelect(value)} style={[styles.filterButton, largeText && styles.filterButtonLarge, active && { backgroundColor: colors.surface }]}>
    <Text style={[styles.filterText, { color: active ? colors.text : colors.muted }]}>{title}</Text>
  </Pressable>;
}

function SavedHistoryDetail({ item, largeText, colors, onCreateNew, onDelete, busy }: {
  item: CanonicalHistoryItem;
  largeText: boolean;
  colors: ReturnType<typeof useShellTheme>['colors'];
  onCreateNew: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const result = item.result;
  const decided = result.status === 'DECIDED';
  const scored = 'topDishes' in result ? result : undefined;
  const winner = decided ? result.winner?.name : undefined;
  const winnerArtwork = scored?.topDishes.find(entry => entry.isWinner)?.dish.artwork?.uri;
  const finalizedAt = result.finalizedAt;
  const desiredAt = item.desiredAt;
  const participants = item.participants;

  return <View style={styles.detailContent}>
    <Text style={[styles.detailTitle, largeText && styles.detailTitleLarge, { color: colors.text }]}>{winner ?? 'Chưa có món được chọn'}</Text>
    <View style={[styles.detailWinner, { backgroundColor: colors.warm }]}>
      <ResultDishArtwork uri={winnerArtwork} label={winner ?? 'Chưa có món được chọn'} winner={decided} size={168} colors={colors} />
      {!scored && decided ? <Text style={[styles.caption, { color: colors.muted }]}>Phiên bản kết quả cũ không lưu điểm hoặc bảng xếp hạng.</Text> : null}
    </View>

    <Text accessibilityRole="header" style={[styles.detailSectionTitle, { color: colors.text }]}>Xếp hạng của nhóm</Text>
    {scored && scored.topDishes.length > 0 ? <View style={[styles.detailRanking, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {podiumOrder(scored.topDishes).map((entry, index) => <View key={entry.dish.roundDishId} style={[styles.detailRankRow, index < scored.topDishes.length - 1 && { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.green : colors.warm }]}>
          <Text style={[styles.rankBadgeText, { color: index === 0 ? colors.surface : colors.text }]}>{index + 1}</Text>
        </View>
        <Text style={[styles.detailRankDish, { color: colors.text }]}>{entry.dish.name}{entry.isWinner ? ' · Món được chọn' : ''}</Text>
        <Text style={[styles.detailRankScore, { color: colors.green }]}>{entry.score} điểm</Text>
      </View>)}
    </View> : <Text style={[styles.caption, { color: colors.muted }]}>{decided ? 'Không có bảng xếp hạng trong dữ liệu đã lưu.' : 'Phiên này không có món được xếp hạng.'}</Text>}

    <Text accessibilityRole="header" style={[styles.detailSectionTitle, { color: colors.text }]}>Cùng ăn</Text>
    <View style={[styles.participantCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {participants?.length ? <View style={styles.participantList}>{participants.map((person, index) => <View key={`${person.role}-${index}-${person.displayName}`} style={[styles.participantPill, { backgroundColor: colors.warm }]}>
        <Text style={[styles.participantInitial, { color: colors.text }]}>{person.displayName.trim().charAt(0).toLocaleUpperCase()}</Text>
        <Text style={[styles.participantName, { color: colors.text }]}>{person.displayName}</Text>
      </View>)}</View> : null}
      <InfoRow icon="friends" label="Thành viên" value={item.memberCount ? `${item.memberCount} người` : 'Không lưu'} colors={colors} />
      <InfoRow icon="calendar" label="Bữa ăn dự kiến" value={desiredAt ? formatHistoryDate(desiredAt) : 'Không đặt giờ'} colors={colors} />
      <InfoRow icon="check" label="Kết quả chốt" value={formatHistoryDate(finalizedAt)} colors={colors} />
      <InfoRow icon="hourglass" label="Lưu đến" value={formatHistoryDate(item.expiresAt)} colors={colors} last />
    </View>

    <AppButton label="Tạo phòng mới" onPress={onCreateNew} disabled={busy} colors={colors} />
    <Pressable accessibilityRole="button" accessibilityLabel="Xóa mục lịch sử" disabled={busy} onPress={onDelete} style={styles.detailDelete}>
      <AppIcon name="trash" size={16} color={colors.danger} /><Text style={[styles.detailDeleteText, { color: colors.danger }]}>Xóa mục lịch sử</Text>
    </Pressable>
  </View>;
}

function InfoRow({ icon, label, value, colors, last }: { icon: Parameters<typeof AppIcon>[0]['name']; label: string; value: string; colors: ReturnType<typeof useShellTheme>['colors']; last?: boolean }) {
  return <View style={[styles.infoRow, !last && { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
    <View style={[styles.infoIcon, { backgroundColor: colors.warm }]}><AppIcon name={icon} size={16} color={colors.primary} /></View>
    <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
    <Text numberOfLines={2} style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
  </View>;
}

function formatHistoryDate(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Không rõ';
}

function rowDate(item: HistoryRow): string {
  return 'historyId' in item ? item.createdAt : item.mealDate;
}

/** "Hôm nay", "Hôm qua", then the date, newest first. */
function groupHistory(items: HistoryRow[]): { key: string; label: string; items: HistoryRow[] }[] {
  const dayStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const today = dayStart(new Date());
  const time = (item: HistoryRow) => { const value = Date.parse(rowDate(item)); return Number.isFinite(value) ? value : 0; };
  const groups = new Map<string, { key: string; label: string; items: HistoryRow[] }>();
  for (const item of [...items].sort((a, b) => time(b) - time(a))) {
    const stamp = time(item);
    const date = new Date(stamp);
    const key = stamp ? String(dayStart(date)) : 'unknown';
    const age = stamp ? Math.round((today - dayStart(date)) / 86_400_000) : -1;
    const label = !stamp ? 'Không rõ ngày' : age === 0 ? 'Hôm nay' : age === 1 ? 'Hôm qua'
      : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function historyCardMetadata(item: HistoryRow, date: string): string {
  const timestamp = Date.parse(date);
  const mealDate = Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
  const today = new Date();
  let when = 'Không rõ';
  if (mealDate) {
    const dayStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const ageDays = Math.floor((dayStart(today) - dayStart(mealDate)) / 86_400_000);
    when = ageDays === 0 ? 'Hôm nay' : ageDays === 1 ? 'Hôm qua'
      : mealDate.getFullYear() === today.getFullYear()
        ? `${mealDate.getDate()}/${mealDate.getMonth() + 1}`
        : mealDate.toLocaleDateString('vi-VN');
  }
  const names = 'historyId' in item
    ? item.participants?.map(participant => participant.displayName.trim()).filter(Boolean).slice(0, 3) ?? []
    : [];
  const people = names.length ? names.join(', ') : item.memberCount ? `${item.memberCount} thành viên` : '';
  return people ? `${when} · ${people}` : when;
}

const styles = StyleSheet.create({
  consentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 12 },
  consentCopy: { flex: 1, minWidth: 0, gap: 2 },
  consentTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  content: { gap: 18 },
  pageTitle: { fontFamily: 'InterBold', fontSize: 30, lineHeight: 40 },
  detailContent: { gap: 14 },
  detailTitle: { fontFamily: 'InterBold', fontSize: 28, lineHeight: 36 },
  detailTitleLarge: { fontSize: 32, lineHeight: 40 },
  detailWinner: { borderRadius: 18, paddingVertical: 20, paddingHorizontal: 16, gap: 12, alignItems: 'center' },
  detailSectionTitle: { fontFamily: 'InterBold', fontSize: 18, lineHeight: 26, marginTop: 4 },
  detailRanking: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14 },
  detailRankRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontFamily: 'InterBold', fontSize: 18, lineHeight: 24 },
  detailRankDish: { flex: 1, minWidth: 0, fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  detailRankScore: { fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  participantCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  infoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10 },
  infoIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 18 },
  infoValue: { flex: 1, textAlign: 'right', fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18 },
  detailDelete: { alignSelf: 'center', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  detailDeleteText: { fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  participantList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantPill: { minHeight: 36, borderRadius: 18, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  participantInitial: { fontFamily: 'InterBold', fontSize: 11, lineHeight: 16 },
  participantName: { fontFamily: 'InterMedium', fontSize: 12, lineHeight: 18 },
  filters: { minHeight: 46, borderRadius: 14, padding: 4, flexDirection: 'row', alignItems: 'center' },
  filtersLarge: { flexDirection: 'column', alignItems: 'stretch' },
  filterButton: { flex: 1, minHeight: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  filterButtonLarge: { flex: 0, alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { fontFamily: 'InterMedium', fontSize: 13, lineHeight: 20 },
  section: { gap: 12 },
  sectionTop: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'InterSemiBold', fontSize: 18, lineHeight: 26 },
  caption: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'InterBold', fontSize: 20, lineHeight: 28, textAlign: 'center' },
  emptyBody: { fontFamily: 'InterRegular', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  offlineBanner: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  offlineBannerLarge: { flexDirection: 'column', alignItems: 'stretch' },
  offlineCopy: { flex: 1, minWidth: 0, gap: 2 },
});
