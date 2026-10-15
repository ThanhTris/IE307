import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { MockApiClient, MOCK_CURRENT_USER, type RoomContext, type WriteResult } from '../data/api';
import { Chip } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { setupStyles } from '../features/context/components/SetupFrame';
import { suggestedMeal, type PreferenceCatalogue, type RoomSetupRepository, type SuggestAnchor } from '../features/context/services/roomSetup';

export const setupScenarios = [
  ['default', 'Bình thường'], ['loading', 'Tải chậm'], ['empty', 'Rỗng theo buổi'], ['discovery-empty', 'Thiếu điểm công cộng'],
  ['denied', 'Từ chối vị trí'], ['outside', 'Ngoài vùng'], ['unknown', 'Chưa rõ giờ bán'], ['stale', 'Dữ liệu cũ'],
  ['network', 'Mất mạng'], ['unknown-price', 'Chưa có giá'], ['ready', 'Nhóm đã sẵn sàng'], ['member', 'Thành viên'], ['timeout', 'Mất phản hồi sau lưu'],
] as const;
export type SetupScenario = typeof setupScenarios[number][0];
export const setupCatalogue: PreferenceCatalogue = {
  cuisines: [{ id: 'cui_vietnam', label: 'Món Việt' }],
  categories: [{ id: 'cat_mon_nuoc', label: 'Món nước' }, { id: 'cat_mon_com', label: 'Cơm' }, { id: 'cat_an_vat', label: 'Ăn vặt' }],
};

export type SetupPreviewFixture = { mode: 'mock'; repository: RoomSetupRepository; roomId: string; userId: string; suggestAnchor: SuggestAnchor };

// All fixture creation and scenario overrides stay at composition, never in screens.
export async function createSetupPreview(scenario: SetupScenario = 'default'): Promise<SetupPreviewFixture> {
  const api = new MockApiClient({ delayMs: 0 });
  const discovery = await api.getDiscoveryContext();
  if (!discovery.ok || !discovery.data.anchors[0]) throw new Error('Missing upstream mock discovery');
  const anchor = discovery.data.anchors[0];
  const desiredAt = new Date(Date.parse(discovery.data.serverTime) + 15 * 60000).toISOString();
  const context: RoomContext = { anchorId: anchor.id, radiusM: 1000, desiredAt, serviceMode: 'dine_in', ...suggestedMeal(desiredAt), budget: null, avoidRecent: false };
  const created = await api.createRoom({ displayName: 'Minh', context, requestId: 'gm10-fixture-create' });
  if (!created.ok) throw new Error('Missing upstream mock room');
  const roomId = created.data.roomId;
  const peer = { ...MOCK_CURRENT_USER, id: 'usr_gm10_peer', displayName: 'Hà' };
  api.setCurrentUser(peer);
  const joined = await api.joinRoom({ code: created.data.code, displayName: peer.displayName, requestId: 'gm10-fixture-peer' });
  if (!joined.ok) throw new Error('Missing upstream mock peer');
  if (scenario === 'ready') {
    const peerSnapshot = await api.getRoomSnapshot(roomId);
    if (peerSnapshot.ok) await api.setReady({ roomId, expectedVersion: peerSnapshot.data.version, ready: true, requestId: 'gm10-fixture-ready-peer' });
  }
  api.setCurrentUser(MOCK_CURRENT_USER);
  if (scenario === 'ready') {
    const hostSnapshot = await api.getRoomSnapshot(roomId);
    if (hostSnapshot.ok) await api.setReady({ roomId, expectedVersion: hostSnapshot.data.version, ready: true, requestId: 'gm10-fixture-ready-host' });
  }
  if (scenario === 'member') api.setCurrentUser(peer);
  if (scenario === 'loading') api.setDelayMs(1200);
  if (scenario === 'discovery-empty') api.setMode('empty');
  if (scenario === 'network') api.setMode('error', 'NETWORK_ERROR');
  let lostReply = false;
  const write = async (send: () => Promise<WriteResult<void>>): Promise<WriteResult<void>> => {
    if (scenario === 'stale') return { ok: false, error: { messageKey: 'VERSION_CONFLICT' } };
    const result = await send();
    if (scenario === 'timeout' && result.ok && !lostReply) { lostReply = true; return { ok: false, error: { messageKey: 'TIMEOUT' } }; }
    return result;
  };
  const repository: RoomSetupRepository = {
    getDiscoveryContext: api.getDiscoveryContext.bind(api), getRoomSnapshot: api.getRoomSnapshot.bind(api),
    updateContext: req => write(() => api.updateContext(req)), updatePreferences: req => write(() => api.updatePreferences(req)),
    previewFoodPool: async req => {
      const code = scenario === 'outside' ? 'OUT_OF_COVERAGE' : scenario === 'unknown' ? 'AVAILABILITY_UNKNOWN' : scenario === 'stale' ? 'VERSION_CONFLICT' : undefined;
      if (code) return { ok: false, error: { messageKey: code } };
      const result = await api.previewFoodPool(req);
      if (!result.ok) return result;
      if (scenario === 'empty') return { ok: true, data: { ...result.data, pool: [], totalCandidateCount: 0 } };
      if (scenario === 'unknown-price') return { ok: true, data: { ...result.data, pool: result.data.pool.map(dish => ({ ...dish, priceMin: null, priceMax: null, price: { priceMin: null, priceMax: null, currency: null, unit: null, servingSize: null } })) } };
      return result;
    },
  };
  return { mode: 'mock', repository, roomId, userId: scenario === 'member' ? peer.id : MOCK_CURRENT_USER.id,
    suggestAnchor: async () => scenario === 'denied' ? { status: 'denied' } : scenario === 'outside' ? { status: 'outside' } : { status: 'suggested', anchorId: anchor.id } };
}

type PreviewState = { scenario: SetupScenario; setScenario: (v: SetupScenario) => void; fixture?: SetupPreviewFixture; error: boolean };
const PreviewContext = createContext<PreviewState | null>(null);
export function SetupPreviewProvider({ children }: PropsWithChildren) {
  const [scenario, setScenario] = useState<SetupScenario>('default');
  const [result, setResult] = useState<{ scenario: SetupScenario; fixture?: SetupPreviewFixture; error: boolean }>();
  useEffect(() => {
    let current = true;
    void createSetupPreview(scenario).then(v => { if (current) setResult({ scenario, fixture: v, error: false }); }).catch(() => { if (current) setResult({ scenario, error: true }); });
    return () => { current = false; };
  }, [scenario]);
  const value = useMemo(() => ({ scenario, setScenario, fixture: result?.scenario === scenario ? result.fixture : undefined, error: result?.scenario === scenario ? result.error : false }), [scenario, result]);
  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}
export function useSetupPreview() {
  const value = useContext(PreviewContext);
  if (!value) throw new Error('GM-10 preview provider missing');
  return value;
}
export function SetupPreviewControls({ disabled = false }: { disabled?: boolean }) {
  const preview = useSetupPreview();
  const { colors } = useShellTheme();
  return <View style={setupStyles.row}>{setupScenarios.map(([id, label]) => <Chip key={id} label={label} selected={preview.scenario === id} disabled={disabled} onPress={() => preview.setScenario(id)} colors={colors} />)}</View>;
}
