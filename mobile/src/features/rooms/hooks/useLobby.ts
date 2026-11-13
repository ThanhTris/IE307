import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiClient, RoomSnapshot } from '../../../data/api';
import { createDurableRequestId } from '../services/roomRepository';
import { errorCopy } from '../services/roomEntry';

export type LobbyRepository = Pick<ApiClient, 'getRoomSnapshot' | 'listFriends' | 'startRound' | 'updateContext' | 'leaveRoom' | 'cancelRoom' | 'inviteToRoom'> & Partial<Pick<ApiClient, 'removeRoomMember'>> & {
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
  // Green for a done create/edit/delete, red for a server problem.
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('error');
  const [busy, setBusy] = useState(false);
  const [realRevision, setRealRevision] = useState(0);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const busyRef = useRef(false);
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
      setNotice(`Không đọc lại được snapshot · ${result.error.messageKey}`); setNoticeTone('error');
      return null;
    }
  };

  useEffect(() => {
    if (!activeRoomId) return;
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
  }, [activeRoomId, api, checkEligibility]);

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
  const displaySnapshot = snapshot;
  const members = displaySnapshot?.members.map(member => ({
    id: member.userId,
    label: member.userId === displaySnapshot.hostUserId ? `${member.displayName} · Host` : member.displayName,
    initial: member.displayName.slice(0, 1),
  })) ?? [];

  // Members never press "start": when the host starts the round (or cancels), the lobby they are watching moves them on.
  const movedOn = useRef(false);
  const roomState = snapshot?.state;
  useEffect(() => {
    if (!snapshot || !viewer || movedOn.current) return;
    if (['ROUND_1', 'WAITING_1', 'ROUND_2', 'WAITING_2'].includes(snapshot.state) && onStartRound) {
      movedOn.current = true;
      onStartRound(snapshot);
    } else if (['CANCELLED', 'EXPIRED'].includes(snapshot.state) && !isHost) {
      movedOn.current = true;
      onHome();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState, viewer?.userId]);

  const reload = () => {
    setRealRevision(v => v + 1);
  };

  const runWrite = async (action: 'start' | 'context' | 'leave' | 'cancel' | 'invite' | 'remove', partnerId?: string) => {
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
      } else if (action === 'remove') {
        if (!partnerId || !api.removeRoomMember) return;
        result = await api.removeRoomMember({ roomId: snapshot.roomId, memberUserId: partnerId, expectedVersion: snapshot.version, requestId });
      } else {
        if (!partnerId) return;
        result = await api.inviteToRoom({ roomId: snapshot.roomId, partnerId: partnerId ?? 'usr_tuan_002', expectedVersion: snapshot.version, requestId });
      }
      if (!result.ok) {
        const failure = result.error.messageKey === 'NOT_ENOUGH_MEMBERS'
          ? errorCopy.NOT_ENOUGH_MEMBERS
          : result.error.messageKey;
        setNotice(`Chưa thực hiện được · ${failure}`); setNoticeTone('error');
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
        setNotice('Thiết lập phòng đã được cập nhật.'); setNoticeTone('success');
      } else if (action === 'start') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('');
        movedOn.current = true;
        if (onStartRound && snapshot) onStartRound(snapshot);
      } else if (action === 'cancel') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Phòng đã hủy.'); setNoticeTone('success');
        onHome();
      } else if (action === 'leave') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Bạn đã rời phòng.'); setNoticeTone('success');
        onHome();
      } else if (action === 'remove') {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Đã xóa thành viên khỏi phòng.'); setNoticeTone('success');
      } else {
        await refreshSnapshot(snapshot.roomId);
        setNotice('Lời mời đã tạo.'); setNoticeTone('success');
      }
    } catch {
      if (pendingIntentRef.current) {
        pendingIntentRef.current.uncertain = true;
      }
      setNotice('Không hoàn tất được thao tác. Có thể thử lại khi đã tải được trạng thái mới.'); setNoticeTone('error');
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
    noticeTone,
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
