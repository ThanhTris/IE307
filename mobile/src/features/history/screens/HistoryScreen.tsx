import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, AppIcon, LoadingState, SheetDialog, StatusNotice, ApiFeatureFrame } from '../../../shared/ui';
import { errorMessage } from '../../friends/screens/FriendsScreen';
import type { CanonicalHistoryItem, HistoryRow } from '../services/historyTypes';
import { historyIdOf, historyTitle, type HistoryRepository } from '../services/historyRepository';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';
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
  const selectedHistory = items.find((item): item is CanonicalHistoryItem => 'historyId' in item && item.historyId === selectedHistoryId);
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

  const confirm = async () => {
    if (!action || lock.current) return;
    lock.current = true;
    setBusy(true);
    const pending = action;
    setAction(null);
    setMessage(null);
    try {
      const result = await repository.delete(historyIdOf(pending.item));
      if (!result.ok) { setMessage({ text: errorMessage(result.error.messageKey), tone: 'error' }); return; }
      repository.invalidate();
      setFetchedAt('');
      setSelectedHistoryId(null);
      setMessage({ text: 'Máy chủ đã nhận yêu cầu xóa. Đang tải lại lịch sử theo quyền hiện tại.', tone: 'success' });
      await load(true);
    } catch {
      setMessage({ text: 'Chưa rõ máy chủ đã nhận thao tác hay chưa. Tải lại lịch sử để kiểm tra trạng thái.', tone: 'error' });
      await load(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <ApiFeatureFrame active="history" title="Lịch sử" onNavigate={onNavigate} onHome={onHome}>
      <View style={styles.content}>
        <View>
          <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.text }]}>{selectedHistory ? 'Chi tiết bữa ăn' : 'Lịch sử'}</Text>
        </View>

        {selectedHistory ? <SavedHistoryDetail item={selectedHistory} largeText={largeText} colors={colors}
          onBack={() => setSelectedHistoryId(null)} onCreateNew={() => onNavigate('/room/create')}
          onDelete={() => setAction({ kind: 'delete', item: selectedHistory })} busy={busy} /> : null}

        {!selectedHistory ? <View accessibilityRole="tablist" style={[styles.filters, largeText && styles.filtersLarge, { backgroundColor: colors.warm }]}>
          <FilterButton title="Tất cả" value="all" selected={filter} onSelect={setFilter} largeText={largeText} colors={colors} />
          <FilterButton title="Đã chốt" value="decided" selected={filter} onSelect={setFilter} largeText={largeText} colors={colors} />
          <FilterButton title="Chưa chốt" value="no-consensus" selected={filter} onSelect={setFilter} largeText={largeText} colors={colors} />
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
            <Text style={[styles.emptyBody, { color: colors.muted }]}>{filter === 'all' ? 'Bữa đã chốt sẽ hiện ở đây khi bật lưu lịch sử.' : 'Thử chọn bộ lọc khác.'}</Text>
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
            return <View key={historyIdOf(item)} style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.cardMain}>
                <View style={[styles.dishIcon, { backgroundColor: colors.warm }]}>{decided ? <AppIcon name="bowl" size={24} color={colors.text} /> : <AppIcon name="noodles" size={24} color={colors.text} />}</View>
                <View style={styles.cardCopy}>
                  <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.text }]}>{decided ? winner ?? historyTitle(item) : 'Chưa chốt món'}</Text>
                  <Text style={[styles.caption, { color: colors.muted }]}>{historyCardMetadata(item, date)}</Text>
                </View>
              </View>
              {scored && scored.topDishes.length > 1 ? <View style={styles.rankList}>
                {podiumOrder(scored.topDishes).map((entry, index) => <Text key={entry.dish.roundDishId} style={[styles.rankText, { color: colors.text }]}>{index + 1}. {entry.dish.name} · {entry.score} điểm</Text>)}
              </View> : null}
              <View style={[styles.cardFooter, largeText && styles.cardFooterLarge, { borderTopColor: colors.line }]}>
                <Text style={[styles.score, { color: colors.text }]}>{score !== undefined ? `${score} điểm` : isLegacy ? 'Kết quả cũ' : !decided ? 'Cả nhóm chưa chọn được món' : 'Đã chốt'}</Text>
                {decided ? <Text style={[styles.winnerLabel, { color: colors.green }]}>Món được chọn</Text> : null}
              </View>
              <View style={[styles.rowActions, largeText && styles.rowActionsLarge]}>
                {canonical ? <AppButton label="Xem chi tiết đã lưu" variant="quiet" onPress={() => setSelectedHistoryId(item.historyId)} disabled={busy} colors={colors} style={styles.rowButton} /> : null}
                <AppButton label="Xóa" variant="secondary" onPress={() => setAction({ kind: 'delete', item })} disabled={busy} colors={colors} style={styles.deleteButton} />
              </View>
            </View>;
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

function SavedHistoryDetail({ item, largeText, colors, onBack, onCreateNew, onDelete, busy }: {
  item: CanonicalHistoryItem;
  largeText: boolean;
  colors: ReturnType<typeof useShellTheme>['colors'];
  onBack: () => void;
  onCreateNew: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const result = item.result;
  const decided = result.status === 'DECIDED';
  const scored = 'topDishes' in result ? result : undefined;
  const winner = decided ? result.winner?.name : undefined;
  const winnerScore = scored?.topDishes.find(entry => entry.isWinner)?.score;
  const finalizedAt = result.finalizedAt;
  const desiredAt = item.desiredAt;
  const participants = item.participants;

  return <View style={styles.detailContent}>
    <AppButton label="Quay lại lịch sử" variant="quiet" onPress={onBack} disabled={busy} colors={colors} style={styles.detailBack} />
    <Text style={[styles.detailTitle, largeText && styles.detailTitleLarge, { color: colors.text }]}>{winner ?? 'Chưa có món được chọn'}</Text>
    <Text style={[styles.caption, { color: colors.muted }]}>{item.scope === 'personal' ? 'Lịch sử cá nhân' : 'Lịch sử nhóm'} · {formatHistoryDate(item.createdAt)}</Text>

    <View style={[styles.detailWinner, { backgroundColor: colors.warm }]}>
      <View style={[styles.statusPill, { backgroundColor: colors.surface }]}>
        <Text style={[styles.statusText, { color: colors.text }]}>{decided ? 'Đã chốt' : 'Chưa đồng thuận'}</Text>
      </View>
      <View style={styles.detailWinnerBody}>
        <View style={styles.detailWinnerCopy}>
          <Text style={[styles.detailDish, largeText && styles.detailDishLarge, { color: colors.text }]}>{winner ?? (result.reasonCode === 'ALL_REMOVED' ? 'Nhóm đã loại hết các món' : 'Không có món đủ đồng thuận')}</Text>
          {winnerScore !== undefined ? <Text style={[styles.detailScore, { color: colors.text }]}>{winnerScore} điểm</Text> : null}
        </View>
        <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}><AppIcon name="bowl" size={24} color={colors.text} /></View>
      </View>
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
      </View>)}</View> : <Text style={[styles.caption, { color: colors.text }]}>{item.memberCount ? `${item.memberCount} thành viên` : 'Thông tin thành viên không được lưu trong bản này.'}</Text>}
      <Text style={[styles.caption, { color: colors.muted }]}>{desiredAt ? `Bữa ăn dự kiến · ${formatHistoryDate(desiredAt)}` : 'Không có thời gian bữa ăn dự kiến'}</Text>
      <Text style={[styles.caption, { color: colors.muted }]}>{`Kết quả chốt · ${formatHistoryDate(finalizedAt)}`}</Text>
      <Text style={[styles.caption, { color: colors.muted }]}>{`Lưu đến · ${formatHistoryDate(item.expiresAt)}`}</Text>
    </View>

    <AppButton label="Tạo phòng mới" onPress={onCreateNew} disabled={busy} colors={colors} />
    <AppButton label="Xóa mục lịch sử" variant="secondary" onPress={onDelete} disabled={busy} colors={colors} />
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
  content: { gap: 18 },
  pageTitle: { fontFamily: 'InterBold', fontSize: 30, lineHeight: 40 },
  detailContent: { gap: 14 },
  detailBack: { alignSelf: 'flex-start', minHeight: 44 },
  detailTitle: { fontFamily: 'InterBold', fontSize: 28, lineHeight: 36 },
  detailTitleLarge: { fontSize: 32, lineHeight: 40 },
  detailWinner: { minHeight: 180, borderRadius: 18, padding: 20, gap: 14 },
  statusPill: { alignSelf: 'flex-start', minHeight: 28, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  statusText: { fontFamily: 'InterSemiBold', fontSize: 12, lineHeight: 18 },
  detailWinnerBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  detailWinnerCopy: { flex: 1, minWidth: 0, gap: 12 },
  detailDish: { fontFamily: 'InterBold', fontSize: 22, lineHeight: 30 },
  detailDishLarge: { fontSize: 26, lineHeight: 34 },
  detailScore: { fontFamily: 'InterBold', fontSize: 16, lineHeight: 24 },
  detailIcon: { width: 78, height: 78, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detailSectionTitle: { fontFamily: 'InterBold', fontSize: 18, lineHeight: 26, marginTop: 4 },
  detailRanking: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14 },
  detailRankRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontFamily: 'InterBold', fontSize: 18, lineHeight: 24 },
  detailRankDish: { flex: 1, minWidth: 0, fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  detailRankScore: { fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  participantCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
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
  historyCard: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 10 },
  cardMain: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 16 },
  dishIcon: { width: 68, height: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: { fontFamily: 'InterSemiBold', fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  rankList: { paddingTop: 2, gap: 4 },
  rankText: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  cardFooter: { minHeight: 38, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardFooterLarge: { flexDirection: 'column', alignItems: 'stretch' },
  score: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 20, flex: 1 },
  winnerLabel: { fontFamily: 'InterSemiBold', fontSize: 12, lineHeight: 18 },
  rowActions: { flexDirection: 'row', gap: 8 },
  rowActionsLarge: { flexDirection: 'column' },
  rowButton: { flex: 1, minHeight: 48 },
  deleteButton: { minWidth: 80, minHeight: 48 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'InterBold', fontSize: 20, lineHeight: 28, textAlign: 'center' },
  emptyBody: { fontFamily: 'InterRegular', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  offlineBanner: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  offlineBannerLarge: { flexDirection: 'column', alignItems: 'stretch' },
  offlineCopy: { flex: 1, minWidth: 0, gap: 2 },
});
