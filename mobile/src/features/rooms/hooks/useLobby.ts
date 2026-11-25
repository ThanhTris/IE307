import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ApiClient, ErrorCode, RoomSnapshot } from '../../../data/api';
import { describeError } from '../../../shared/errors/describeError';
import { destinationFor, type FailureExit } from '../../../shared/errors/failure';
import type { ReportContext } from '../../../shared/errors/errorReport';
import { createDurableRequestId } from '../services/roomRepository';
import { errorCopy } from '../services/roomEntry';
import { useRoomUpdates } from './useRoomUpdates';

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
  /** The room cannot be used by this person any more; the route takes them elsewhere and says why. */
  onExit?: (exit: FailureExit) => void;
}

/** Codes after which retrying in the lobby cannot work (see `destinationFor`). */
const leavesLobby = (code: ErrorCode) => {
  const destination = destinationFor(code, 'room');
  return destination === 'home' || destination === 'signIn';
};

export function useLobby({
  repository,
  roomId,
  currentUserId,
  createRequestId,
  onStartRound,
  onHome,
  onExit,
}: UseLobbyParams) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [loadError, setLoadError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [notice, setNotice] = useState('');
  // Green for a done create/edit/delete, red for a server problem.
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('error');
  const [busy, setBusy] = useState(false);
  /** A failed action worth reporting; the screen offers "Báo lỗi" next to it. */
  const [actionFailure, setActionFailure] = useState<ReportContext>();
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
  const loadKey = `${currentUserId ?? ''}:${activeRoomId}:${realRevision}`;
  const scopeRef = useRef(loadKey);
  const backgroundLoadRevision = useRef(0);
  useLayoutEffect(() => { scopeRef.current = loadKey; }, [loadKey]);
  const loading = loadedKey !== loadKey;
  const loadState: 'loading' | 'error' | 'ready' = loading ? 'loading' : loadError ? 'error' : 'ready';

  const api = repository;

  /** True while the person is leaving or cancelling on purpose, so the closing room is not treated as a failure. */
  const selfExitRef = useRef(false);
  const exitedRef = useRef<string | null>(null);
  const exitLatest = useRef(onExit);
  useLayoutEffect(() => { exitLatest.current = onExit; });
  /** Leaves once per room. Returns false when the screen handles the failure itself (no `onExit`). */
  const leaveBecause = useCallback((exit: FailureExit): boolean => {
    if (!exitLatest.current || selfExitRef.current) return false;
    if (exitedRef.current !== activeRoomId) {
      exitedRef.current = activeRoomId;
      exitLatest.current(exit);
    }
    return true;
  }, [activeRoomId]);

  const checkEligibility = useCallback(async (snap: RoomSnapshot, isCurrent: () => boolean = () => true) => {
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
        if (!isCurrent()) return;
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
    const revision = backgroundLoadRevision.current;
    // The initial read can seed the lobby until background sync resolves this load.
    const isCurrent = () => active && scopeRef.current === loadKey
      && backgroundLoadRevision.current === revision;

    const initialRead = activeRoomId
      ? api.getRoomSnapshot(activeRoomId)
      : Promise.resolve({ ok: false, error: { messageKey: 'ROOM_NOT_FOUND' } } as const);
    void initialRead.then(result => {
      if (!isCurrent()) return;
      setLoadedKey(loadKey);
      if (result.ok) {
        setSnapshot(previous => previous?.roomId === result.data.roomId && previous.version > result.data.version ? previous : result.data);
        setLoadError('');
        void checkEligibility(result.data, isCurrent);
      } else {
        setSnapshot(null);
        setLoadError(result.error.messageKey);
        if (leavesLobby(result.error.messageKey)) leaveBecause({ code: result.error.messageKey });
      }
    }).catch(() => {
      if (!isCurrent()) return;
      setLoadedKey(loadKey);
      setLoadError('NETWORK_ERROR');
    });
    return () => { active = false; };
  }, [api, activeRoomId, loadKey, checkEligibility, leaveBecause]);

  const refreshSnapshot = async (targetId: string): Promise<RoomSnapshot | null> => {
    if (!targetId) return null;
    const scope = scopeRef.current;
    const result = await api.getRoomSnapshot(targetId);
    if (scopeRef.current !== scope) return null;
    if (result.ok) {
      setSnapshot(previous => previous?.roomId === result.data.roomId && previous.version > result.data.version ? previous : result.data);
      void checkEligibility(result.data, () => scopeRef.current === scope);
      return result.data;
    } else {
      if (leavesLobby(result.error.messageKey) && (selfExitRef.current || leaveBecause({ code: result.error.messageKey }))) return null;
      setNotice(`Chưa cập nhật được phòng · ${describeError(result.error).message}`); setNoticeTone('error');
      return null;
    }
  };

  const applyBackgroundLoadError = (messageKey: string) => {
    ++backgroundLoadRevision.current;
    setSnapshot(null);
    setLoadError(messageKey);
    setLoadedKey(loadKey);
  };

  useRoomUpdates({
    roomId: activeRoomId, userId: currentUserId, enabled: !!activeRoomId, readEpoch: loadKey,
    isCurrent: () => true,
    read: async shouldApply => {
      if (busyRef.current) return null;
      const result = await api.getRoomSnapshot(activeRoomId);
      if (!shouldApply()) return null;
      if (!result.ok) {
        if (leavesLobby(result.error.messageKey) && !selfExitRef.current) {
          applyBackgroundLoadError(result.error.messageKey);
          leaveBecause({ code: result.error.messageKey });
        }
        return null;
      }
      const next = result.data;
      ++backgroundLoadRevision.current;
      setSnapshot(previous => previous?.roomId === next.roomId && previous.version > next.version ? previous : next);
      setLoadedKey(loadKey);
      setLoadError('');
      void checkEligibility(next, shouldApply);
      return next;
    },
    onError: error => {
      if (selfExitRef.current) return;
      // A passing sync problem keeps what is on screen; only a room that is gone replaces it.
      if (!leavesLobby(error.messageKey) && snapshot) return;
      applyBackgroundLoadError(error.messageKey);
      if (leavesLobby(error.messageKey)) leaveBecause({ code: error.messageKey });
    },
  });

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
  const closedRoomRef = useRef<string | null>(null);
  // Move both host and waiting members once when the room enters an active voting/waiting stage or closes.
  useEffect(() => {
    if (busy || loadState !== 'ready' || !viewer || snapshot?.roomId !== activeRoomId) return;
    const scope = JSON.stringify([activeRoomId, viewer.userId]);
    if (snapshot.state === 'ROUND_1' || snapshot.state === 'WAITING_1' ||
        snapshot.state === 'ROUND_2' || snapshot.state === 'WAITING_2') {
      if (!onStartRound || openedVotingRef.current === scope) return;
      openedVotingRef.current = scope;
      onStartRound(snapshot);
    } else if (snapshot.state === 'CANCELLED' || snapshot.state === 'EXPIRED') {
      if (closedRoomRef.current === scope || selfExitRef.current) return;
      closedRoomRef.current = scope;
      const handled = leaveBecause(snapshot.state === 'EXPIRED'
        ? { code: 'ROOM_EXPIRED', title: 'Phòng đã hết hạn' }
        : { code: 'ROOM_TERMINAL', title: isHost ? 'Phòng đã bị hủy' : 'Chủ phòng đã hủy phòng' });
      if (!handled && !isHost) onHome();
    }
  }, [activeRoomId, busy, isHost, leaveBecause, loadState, onHome, onStartRound, snapshot, viewer]);

  // Removed by the host, or a link to a room this account is not in.
  useEffect(() => {
    if (loadState !== 'ready' || !currentUserId || viewer || snapshot?.roomId !== activeRoomId) return;
    leaveBecause({ code: 'NOT_MEMBER' });
  }, [activeRoomId, currentUserId, leaveBecause, loadState, snapshot, viewer]);

  const displaySnapshot = snapshot;
  const members = displaySnapshot?.members.map(member => ({
    id: member.userId,
    label: member.userId === displaySnapshot.hostUserId ? `${member.displayName} · Host` : member.displayName,
    initial: member.displayName.slice(0, 1),
  })) ?? [];

  const reload = () => {
    setRealRevision(v => v + 1);
  };

  const runWrite = async (action: 'start' | 'context' | 'leave' | 'cancel' | 'invite' | 'remove', partnerId?: string) => {
    if (!snapshot || busyRef.current) return;
    if ((!currentUserId || !viewer)) return;
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    setActionFailure(undefined);
    selfExitRef.current = action === 'leave' || action === 'cancel';
    const showFailure = (code: ErrorCode) => {
      const description = describeError({ messageKey: code });
      const message = code === 'NOT_ENOUGH_MEMBERS' || code === 'MEMBERS_NOT_READY' ? errorCopy[code]
        : destinationFor(code, 'room') === 'reload' ? 'Phòng đã được cập nhật. Hãy thử lại.' : description.message;
      const title = code === 'NOT_ENOUGH_MEMBERS' || code === 'MEMBERS_NOT_READY' ? 'Chưa thực hiện được' : description.title;
      setNotice(`${title} · ${message}`); setNoticeTone('error');
      if (description.reportable) {
        setActionFailure({ errorCode: code, screen: 'room/lobby', action, occurredAt: new Date().toISOString() });
      }
    };
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
        selfExitRef.current = false;
        const code = result.error.messageKey as ErrorCode;
        if (leavesLobby(code) && leaveBecause({ code })) return;
        showFailure(code);
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
        setNotice('Phòng chuyển sang vòng 1.'); setNoticeTone('success');
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
      selfExitRef.current = false;
      if (pendingIntentRef.current) {
        pendingIntentRef.current.uncertain = true;
      }
      showFailure('NETWORK_ERROR');
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
    actionFailure,
  };
}
