import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient, RoomSnapshot } from '../../../data/api';
import { createDurableRequestId } from '../services/roomRepository';
import { errorCopy } from '../services/roomEntry';

export type LobbyRepository = Pick<ApiClient, 'getRoomSnapshot' | 'listFriends' | 'startRound' | 'updateContext' | 'leaveRoom' | 'cancelRoom' | 'inviteToRoom'> & {
  previewFoodPool?: ApiClient['previewFoodPool'];
};

export type ConfirmAction = 'leave' | 'cancel' | null;

export interface UseLobbyParams {
  repository: LobbyRepository;
  roomId?: string;
  currentUserId?: string;
  createRequestId?: (action: string) => string;
  onStartRound?: (snapshot: RoomSnapshot) => void;
  onHome: () => void;
}

export function useLobby({
  repository,
  roomId,
  currentUserId,
  createRequestId,
  onStartRound,
  onHome,
}: UseLobbyParams) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [realRevision, setRealRevision] = useState(0);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const openedVotingRef = useRef<string | null>(null);
  const pendingIntentRef = useRef<{
    action: string;
    requestId: string;
    version: number;
    targetId?: string;
    uncertain: boolean;
  } | null>(null);

  const activeRoomId = roomId ?? '';
  const loadKey = `${activeRoomId}:${realRevision}`;
  const loading = loadedKey !== loadKey;
  const loadState: 'loading' | 'error' | 'ready' = loading ? 'loading' : loadError ? 'error' : 'ready';

  const api = repository;

  const checkEligibility = useCallback(async (snap: RoomSnapshot) => {
    if (snap.state !== 'LOBBY' || !snap.context) return;
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
  }, [api]);

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

  const refreshSnapshot = async (targetId: string): Promise<RoomSnapshot | null> => {
    if (!targetId) return null;
    const result = await api.getRoomSnapshot(targetId);
    if (result.ok) {
      setSnapshot(result.data);
      void checkEligibility(result.data);
      return result.data;
    } else {
      setNotice(`Không đọc lại được snapshot · ${result.error.messageKey}`);
      return null;
    }
  };

  useEffect(() => {
    if (!activeRoomId) return;
    let active = true;
    let polling = false;
    const interval = setInterval(() => {
      if (busyRef.current || polling) return;
      polling = true;
      void api.getRoomSnapshot(activeRoomId).then(result => {
        if (!active || !result.ok) return;
        const next = result.data;
        setSnapshot(previous => previous?.roomId === next.roomId && previous.version > next.version ? previous : next);
        void checkEligibility(next);
      }).catch(() => {
        // A later poll or manual reload can retry this background read.
      }).finally(() => { polling = false; });
    }, 4000);
    return () => { active = false; clearInterval(interval); };
  }, [activeRoomId, currentUserId, api, checkEligibility]);

  const getRequestId = (action: string, version: number, targetId?: string) => {
    const pending = pendingIntentRef.current;
    if (pending && pending.action === action && pending.version === version && pending.targetId === targetId && pending.uncertain) {
      return pending.requestId;
    }
    const nextId = createRequestId ? createRequestId(action) : createDurableRequestId(`lobby_${action}`);
    pendingIntentRef.current = { action, requestId: nextId, version, targetId, uncertain: false };
    return nextId;
  };

  const viewer = currentUserId ? snapshot?.members.find(member => member.userId === currentUserId) : undefined;

  const isHost = Boolean(viewer && snapshot?.hostUserId === viewer.userId);
  useEffect(() => {
    if (busy || loadState !== 'ready' || !onStartRound || !viewer || snapshot?.roomId !== activeRoomId) return;
    if (snapshot.state !== 'ROUND_1' && snapshot.state !== 'WAITING_1' &&
        snapshot.state !== 'ROUND_2' && snapshot.state !== 'WAITING_2') return;
    const scope = JSON.stringify([activeRoomId, viewer.userId]);
    if (openedVotingRef.current === scope) return;
    openedVotingRef.current = scope;
    onStartRound(snapshot);
  }, [activeRoomId, busy, loadState, onStartRound, snapshot, viewer]);

  const displaySnapshot = snapshot;
  const members = displaySnapshot?.members.map(member => ({
    id: member.userId,
    label: member.userId === displaySnapshot.hostUserId ? `${member.displayName} · Host` : member.displayName,
    initial: member.displayName.slice(0, 1),
  })) ?? [];

  const reload = () => {
    setRealRevision(v => v + 1);
  };

  const runWrite = async (action: 'start' | 'context' | 'leave' | 'cancel' | 'invite', partnerId?: string) => {
    if (!snapshot || busyRef.current) return;
    if ((!currentUserId || !viewer)) return;
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    const requestId = getRequestId(action, snapshot.version, partnerId);
    try {
      let result;
      if (action === 'start') {
        result = await api.startRound({ roomId: snapshot.roomId, expectedVersion: snapshot.version, requestId });
      } else if (action === 'context') {
        if (snapshot.context) { result = await api.updateContext({ roomId: snapshot.roomId, expectedVersion: snapshot.version, context: { ...snapshot.context, budget: snapshot.context.budget === 70000 ? 80000 : 70000 }, requestId }); } else { result = { ok: false, requestId, error: { messageKey: 'INVALID_ROOM_STATE' } }; }
      } else if (action === 'leave') {
        result = await api.leaveRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, requestId });
      } else if (action === 'cancel') {
        result = await api.cancelRoom({ roomId: snapshot.roomId, expectedVersion: snapshot.version, confirmCancel: true, requestId });
      } else {
        if (!partnerId) return;
        result = await api.inviteToRoom({ roomId: snapshot.roomId, partnerId: partnerId ?? 'usr_tuan_002', expectedVersion: snapshot.version, requestId });
      }
      if (!result.ok) {
        const failure = result.error.messageKey === 'NOT_ENOUGH_MEMBERS'
          ? errorCopy.NOT_ENOUGH_MEMBERS
          : result.error.messageKey;
        setNotice(`Chưa thực hiện được · ${failure}`);
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
        setNotice('Thiết lập phòng đã được cập nhật.');
      } else if (action === 'start') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Phòng chuyển sang vòng 1.');
      } else if (action === 'cancel') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Phòng đã hủy.');
        onHome();
      } else if (action === 'leave') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Bạn đã rời phòng.');
        onHome();
      } else {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Lời mời đã tạo.');
      }
    } catch {
      if (pendingIntentRef.current) {
        pendingIntentRef.current.uncertain = true;
      }
      setNotice('Không hoàn tất được thao tác. Có thể thử lại khi đã tải được trạng thái mới.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return {
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
    reload,
    refreshSnapshot,
    runWrite,
  };
}
