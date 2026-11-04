import { useCallback, useEffect, useRef, useState } from 'react';
import { MockApiClient, type ApiClient, type RoomMember, type RoomSnapshot } from '../../../data/api';
import { useMockDemoApi } from '../../shared/components/MockDemo';
import { createDurableRequestId } from '../services/roomRepository';

export type LobbyRepository = Pick<ApiClient, 'getRoomSnapshot' | 'startRound' | 'updateContext' | 'leaveRoom' | 'cancelRoom' | 'inviteToRoom'> & {
  previewFoodPool?: ApiClient['previewFoodPool'];
};

export type ConfirmAction = 'leave' | 'cancel' | null;
type DemoMemberCount = 1 | 2 | 3 | 20;

export interface UseLiveLobbyParams {
  mockClient?: MockApiClient;
  repository?: LobbyRepository;
  roomId?: string;
  currentUserId?: string;
  createRequestId?: (action: string) => string;
  onStartRound?: (snapshot: RoomSnapshot) => void;
  onHome: () => void;
}

export function useLiveLobby({
  mockClient,
  repository,
  roomId,
  currentUserId,
  createRequestId,
  onStartRound,
  onHome,
}: UseLiveLobbyParams) {
  const isReal = Boolean(repository);
  const mockApi = useMockDemoApi(mockClient);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState<'host' | 'member'>('host');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [realRevision, setRealRevision] = useState(0);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [demoMemberCount, setDemoMemberCount] = useState<DemoMemberCount>(2);
  const busyRef = useRef(false);
  const pendingIntentRef = useRef<{
    action: string;
    requestId: string;
    version: number;
    uncertain: boolean;
  } | null>(null);

  const activeRoomId = roomId ?? (isReal ? '' : 'room_mock_001');
  const loadKey = isReal ? `real:${activeRoomId}:${realRevision}` : `${mockApi.mode}:${mockApi.revision}`;
  const loading = loadedKey !== loadKey;
  const loadState: 'loading' | 'error' | 'ready' = loading ? 'loading' : loadError ? 'error' : 'ready';

  const api = repository ?? mockApi.api;

  const checkEligibility = useCallback(async (snap: RoomSnapshot) => {
    if (!isReal || snap.state !== 'LOBBY') return;
    if (typeof (api as any).previewFoodPool === 'function') {
      try {
        const preview = await (api as any).previewFoodPool({
          anchorId: snap.context.anchorId,
          radiusM: snap.context.radiusM,
          desiredAt: snap.context.desiredAt,
          serviceMode: snap.context.serviceMode,
          mealSlot: snap.context.mealSlot,
          timeHint: snap.context.timeHint,
          budget: snap.context.budget,
        });
        if (!preview.ok) {
          setEligibilityError(preview.error.messageKey);
        } else if (preview.data.totalCandidateCount === 0 || preview.data.pool.length === 0) {
          setEligibilityError('NO_ELIGIBLE_FOOD');
        } else {
          setEligibilityError(null);
        }
      } catch {
        // Fall back to server enforcement on startRound
      }
    }
  }, [isReal, api]);

  useEffect(() => {
    let active = true;
    if (!activeRoomId) {
      void Promise.resolve().then(() => {
        if (!active) return;
        setLoadedKey(loadKey);
        setSnapshot(null);
        setLoadError('ROOM_NOT_FOUND');
      });
      return;
    }
    void api.getRoomSnapshot(activeRoomId).then(result => {
      if (!active) return;
      setLoadedKey(loadKey);
      if (result.ok) {
        setSnapshot(result.data);
        setLoadError('');
        void checkEligibility(result.data);
      } else {
        setSnapshot(null);
        setLoadError(result.error.messageKey);
      }
    });
    return () => { active = false; };
  }, [api, activeRoomId, loadKey, checkEligibility]);

  const refreshSnapshot = async (targetId: string) => {
    if (!targetId) return;
    const result = await api.getRoomSnapshot(targetId);
    if (result.ok) {
      setSnapshot(result.data);
      void checkEligibility(result.data);
    } else {
      setNotice(`Không đọc lại được snapshot · ${result.error.messageKey}`);
    }
  };

  useEffect(() => {
    if (!isReal || !activeRoomId) return;
    const interval = setInterval(() => {
      if (!busyRef.current) {
        void api.getRoomSnapshot(activeRoomId).then(result => {
          if (result.ok) {
            setSnapshot(result.data);
            void checkEligibility(result.data);
          }
        });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isReal, activeRoomId, api, checkEligibility]);

  const getRequestId = (action: string, version: number) => {
    const pending = pendingIntentRef.current;
    if (pending && pending.action === action && pending.version === version && pending.uncertain) {
      return pending.requestId;
    }
    const nextId = createRequestId ? createRequestId(action) : createDurableRequestId(`lobby_${action}`);
    pendingIntentRef.current = { action, requestId: nextId, version, uncertain: false };
    return nextId;
  };

  const viewer = isReal
    ? (currentUserId ? snapshot?.members.find(member => member.userId === currentUserId) : undefined)
    : snapshot?.members.find(member => member.userId === (
        role === 'host' ? snapshot.hostUserId : snapshot.members.find(candidate => candidate.userId !== snapshot.hostUserId)?.userId
      ));

  const isHost = Boolean(viewer && snapshot?.hostUserId === viewer.userId);
  const displaySnapshot = snapshot && !isReal ? withDemoMemberCount(snapshot, demoMemberCount) : snapshot;
  const members = displaySnapshot?.members.map(member => ({
    id: member.userId,
    label: member.userId === displaySnapshot.hostUserId ? `${member.displayName} · Host` : member.displayName,
    initial: member.displayName.slice(0, 1),
  })) ?? [];

  const chooseRole = () => {
    if (!snapshot || busyRef.current || isReal) return;
    const nextRole = role === 'host' ? 'member' : 'host';
    const nextMember = nextRole === 'host'
      ? snapshot.members.find(member => member.userId === snapshot.hostUserId)
      : snapshot.members.find(member => member.userId !== snapshot.hostUserId);
    if (!nextMember) {
      setNotice('Trong fixture không còn thành viên phù hợp với vai trò này.');
      return;
    }
    if ('setCurrentUser' in api && typeof (api as any).setCurrentUser === 'function') {
      (api as any).setCurrentUser({ id: nextMember.userId, displayName: nextMember.displayName, isGuest: true, createdAt: nextMember.joinedAt });
    }
    setRole(nextRole);
    setNotice(`Đang dùng danh tính mock ${nextMember.displayName}; adapter và trạng thái phòng được giữ nguyên.`);
  };

  const setDemoRosterSize = (memberCount: DemoMemberCount) => {
    if (isReal || busyRef.current || !snapshot || snapshot.state !== 'LOBBY') return;
    const host = snapshot.members.find(member => member.userId === snapshot.hostUserId);
    if (!host) return;
    mockApi.api.setCurrentUser({ id: host.userId, displayName: host.displayName, isGuest: true, createdAt: host.joinedAt });
    setRole('host');
    setDemoMemberCount(memberCount);
  };

  const reload = () => {
    if (isReal) setRealRevision(v => v + 1);
    else mockApi.reload();
  };

  const runWrite = async (action: 'start' | 'context' | 'leave' | 'cancel' | 'invite') => {
    if (!snapshot || busyRef.current) return;
    if (isReal && (!currentUserId || !viewer)) return;
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    const requestId = getRequestId(action, snapshot.version);
    try {
      let result;
      if (action === 'start') {
        result = await api.startRound({ roomId: snapshot.roomId, expectedVersion: snapshot.version, requestId });
      } else if (action === 'context') {
        result = await api.updateContext({ roomId: snapshot.roomId, expectedVersion: snapshot.version, context: { ...snapshot.context, budget: snapshot.context.budget === 70000 ? 80000 : 70000 }, requestId });
      } else if (action === 'leave') {
        result = await api.leaveRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, requestId });
      } else if (action === 'cancel') {
        result = await api.cancelRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, confirmCancel: true, requestId });
      } else {
        result = await api.inviteToRoom({ roomId: snapshot.roomId, partnerId: 'usr_tuan_002', expectedVersion: snapshot.version, requestId });
      }
      if (!result.ok) {
        setNotice(`Chưa thực hiện được · ${result.error.messageKey}`);
        if (result.error.messageKey === 'TIMEOUT' || result.error.messageKey === 'NETWORK_ERROR') {
          if (pendingIntentRef.current) {
            pendingIntentRef.current.uncertain = true;
          }
        } else {
          pendingIntentRef.current = null;
        }
        if (result.error.messageKey === 'VERSION_CONFLICT' || result.error.messageKey === 'CONTEXT_CHANGED') {
          await refreshSnapshot(snapshot.roomId);
        }
        if (result.error.messageKey === 'NO_ELIGIBLE_FOOD' || result.error.messageKey === 'OUT_OF_COVERAGE') {
          setEligibilityError(result.error.messageKey);
        }
        return;
      }
      pendingIntentRef.current = null;
      if (action === 'context') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(isReal ? 'Thiết lập phòng đã được cập nhật.' : 'Bối cảnh fixture đã được cập nhật.');
      } else if (action === 'start') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(isReal ? 'Phòng chuyển sang vòng 1.' : 'Fixture chuyển sang vòng 1. Chưa có lượt gọi nghiệp vụ thật.');
        if (onStartRound && snapshot) onStartRound(snapshot);
      } else if (action === 'cancel') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(isReal ? 'Phòng đã hủy.' : 'Phòng mock đã hủy.');
        if (isReal) onHome();
      } else if (action === 'leave') {
        await refreshSnapshot(snapshot.roomId);
        setNotice(isReal ? 'Bạn đã rời phòng.' : 'Bạn đã rời fixture này.');
        if (isReal) onHome();
      } else {
        setNotice(isReal ? 'Lời mời đã tạo.' : 'Lời mời mock đã tạo; người nhận chưa tham gia phòng.');
      }
    } catch {
      if (pendingIntentRef.current) {
        pendingIntentRef.current.uncertain = true;
      }
      setNotice(isReal
        ? 'Không hoàn tất được thao tác. Có thể thử lại khi đã tải được trạng thái mới.'
        : 'Không hoàn tất được thao tác fixture. Có thể thử lại khi đã tải được trạng thái mới.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return {
    isReal,
    mockApi,
    snapshot,
    displaySnapshot,
    loadError,
    loadState,
    confirm,
    setConfirm,
    notice,
    busy,
    busyRef,
    eligibilityError,
    viewer,
    isHost,
    members,
    demoMemberCount,
    chooseRole,
    setDemoRosterSize,
    reload,
    refreshSnapshot,
    runWrite,
  };
}

function withDemoMemberCount(snapshot: RoomSnapshot, count: DemoMemberCount): RoomSnapshot {
  const host = snapshot.members.find(member => member.userId === snapshot.hostUserId);
  if (!host) return snapshot;
  const members: RoomMember[] = [host];
  for (let index = 1; index < count; index += 1) {
    const knownMember = index === 1 ? snapshot.members.find(member => member.userId !== snapshot.hostUserId) : undefined;
    members.push(knownMember ?? {
      userId: `gm11-preview-member-${String(index + 1).padStart(2, '0')}`,
      displayName: `Thành viên ${String(index + 1).padStart(2, '0')}`,
      isHost: false,
      ready: false,
      joinedAt: `2026-10-11T11:${String(4 + index).padStart(2, '0')}:00Z`,
    });
  }
  return { ...snapshot, members };
}
