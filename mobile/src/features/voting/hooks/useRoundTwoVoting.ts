import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  type ApiClient,
  type BallotVoteItem,
  type PoolDish,
  type RoomResult,
  type SubmissionReceipt,
} from '../../../data/api';
import {
  FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT,
  FIXTURE_ROUND_TWO_CONSENSUS_RESULT,
  simulateDeferredRequest,
  type FinalScreenScenario,
} from '../fixtures';
import { WAITING_DEADLINE_SECONDS, getRoundTwoEliminationCap, isHostEarlyFinishAllowed } from '../services/votingRules';
import { startVotingSnapshotPolling } from '../services/snapshotPolling';
import {
  createDurableRequestId,
  mapSnapshotPoolToPoolDishes,
  type VoteRepository,
} from '../services/voteRepository';
import {
  clearBallotIntent,
  clearVoteDraft,
  clearWaitingIntent,
  getBallotIntent,
  getSubmissionReceipt,
  getVoteDraft,
  getWaitingIntent,
  saveBallotIntent,
  saveSubmissionReceipt,
  saveVoteDraft,
  SnapshotReadOrder,
  type VoteContextToken,
  type VoteScope,
} from '../services/voteSessionState';

export type FinalChoice = 'KEEP' | 'REMOVE';

export interface UseRoundTwoVotingParams {
  candidates?: PoolDish[];
  roomId: string;
  identityId?: string;
  initialChoices?: Record<string, FinalChoice>;
  api?: ApiClient;
  repository?: VoteRepository;
  initialScenario?: FinalScreenScenario;
  initialResult?: RoomResult | null;
  simulateError?: boolean;
  simulateDelayMs?: number;
  enforceCap?: boolean;
  initialIsHost?: boolean;
  onFinish?: (result: RoomResult) => void;
  onGoToResult?: (result: RoomResult) => void;
  onGoToNoConsensus?: (result: RoomResult) => void;
}

interface InFlightIntentR2 {
  identityId: string;
  requestId: string;
  intentId: string;
  roomId: string;
  round: 2;
  poolVersion: number;
  expectedVersion: number;
  votes: BallotVoteItem[];
}

export function useRoundTwoVoting({
  candidates: initialCandidates,
  roomId,
  identityId = 'anonymous',
  initialChoices,
  api,
  repository,
  initialScenario = 'consensus',
  initialResult = null,
  simulateError = false,
  simulateDelayMs = 0,
  enforceCap = true,
  initialIsHost = true,
  onFinish,
  onGoToResult,
  onGoToNoConsensus,
}: UseRoundTwoVotingParams) {
  const initialScope: VoteScope = { identityId, roomId, round: 2, poolVersion: 2 };
  const [localCandidates, setLocalCandidates] = useState<PoolDish[]>(initialCandidates || []);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(() =>
    Boolean(repository && (!initialCandidates || initialCandidates.length === 0))
  );
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const [choices, setChoices] = useState<Record<string, FinalChoice>>(() =>
    initialChoices ?? (getVoteDraft(initialScope) as Record<string, FinalChoice> | null) ?? {}
  );
  const choicesRef = useRef(choices);
  const [scenario, setScenario] = useState<FinalScreenScenario>(initialScenario);
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>(() =>
    getSubmissionReceipt(initialScope) ? 'ack' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(() => getSubmissionReceipt(initialScope));
  const [result, setResult] = useState<RoomResult | null>(initialResult);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [isRetryingWaiting, setIsRetryingWaiting] = useState(false);
  const [needsWaitingTransition, setNeedsWaitingTransition] = useState(false);
  const [capNotice, setCapNotice] = useState<string>('');

  // Waiting countdown & Host early finish state
  const [waitingCountdown, setWaitingCountdown] = useState<number | null>(WAITING_DEADLINE_SECONDS);
  const [activeDeadline, setActiveDeadline] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [totalRosterCount, setTotalRosterCount] = useState(3);
  const [rosterAcknowledgedCount, setRosterAcknowledgedCount] = useState(2);
  const [serverCanHostEarlyFinish, setServerCanHostEarlyFinish] = useState(false);

  // Derived early finish permission (R8: no setState in effect)
  const canHostEarlyFinish = repository
    ? serverCanHostEarlyFinish
    : (isHost && isWaitingForMembers && isHostEarlyFinishAllowed(rosterAcknowledgedCount, totalRosterCount));

  // Server version & cap (F2)
  const [roomVersion, setRoomVersion] = useState(2);
  const [poolVersion, setPoolVersion] = useState(2);
  const [serverCap, setServerCap] = useState<number | null>(null);

  // R1: Stable callback references
  const onFinishRef = useRef(onFinish);
  const onGoToResultRef = useRef(onGoToResult);
  const onGoToNoConsensusRef = useRef(onGoToNoConsensus);

  useEffect(() => {
    onFinishRef.current = onFinish;
    onGoToResultRef.current = onGoToResult;
    onGoToNoConsensusRef.current = onGoToNoConsensus;
  }, [onFinish, onGoToResult, onGoToNoConsensus]);

  // R5: Guard against duplicate outcome navigation
  const navigatedOutcomeRef = useRef<string | null>(null);

  // R6: Clock skew calibration
  const clockSkewRef = useRef<number>(0);

  // R7: Durable in-flight ballot intent preserved across retries
  const lastAppliedScopeRef = useRef(JSON.stringify([identityId, roomId, 2, 2]));
  const contextKey = JSON.stringify([identityId, roomId]);
  const activeContextRef = useRef(contextKey);
  const contextGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const snapshotOrderRef = useRef(new SnapshotReadOrder());
  const autoWaitingAttemptsRef = useRef(new Set<string>());
  const activeScope = useCallback((poolVersionForScope = poolVersion): VoteScope => ({
    identityId,
    roomId,
    round: 2,
    poolVersion: poolVersionForScope,
  }), [identityId, roomId, poolVersion]);
  const replaceChoices = useCallback((next: Record<string, FinalChoice>) => {
    choicesRef.current = next;
    setChoices(next);
    saveVoteDraft(activeScope(), next);
  }, [activeScope]);

  const captureContext = useCallback((): VoteContextToken => ({
    key: contextKey,
    generation: contextGenerationRef.current,
  }), [contextKey]);
  const isCurrentContext = useCallback((token: VoteContextToken) => mountedRef.current
    && activeContextRef.current === token.key
    && contextGenerationRef.current === token.generation, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useLayoutEffect(() => {
    if (activeContextRef.current !== contextKey) {
      activeContextRef.current = contextKey;
      contextGenerationRef.current += 1;
    }
    snapshotOrderRef.current.activate(contextKey);
  }, [contextKey]);

  const candidates = localCandidates.length > 0 ? localCandidates : (initialCandidates || []);
  const eliminationCap = serverCap ?? getRoundTwoEliminationCap(candidates.length);
  const removedCount = Object.values(choices).filter(c => c === 'REMOVE').length;
  const keptCount = candidates.length - removedCount;
  const allRemoved = candidates.length > 0 && removedCount === candidates.length;
  const isLocked = submissionState === 'pending' || submissionState === 'ack';

  // Helper to compute remaining seconds adjusted for server clock skew (R6)
  const computeRemainingFromDeadline = useCallback((deadlineStr: string | null | undefined): number | null => {
    if (!deadlineStr) return null;
    const deadlineMs = new Date(deadlineStr).getTime();
    if (isNaN(deadlineMs)) return null;
    const estimatedServerNow = Date.now() + clockSkewRef.current;
    return Math.max(0, Math.ceil((deadlineMs - estimatedServerNow) / 1000));
  }, []);

  // Central snapshot applicator (R1, R2, R4, R5, R6)
  const applySnapshot = useCallback((snap: any) => {
    const snapshotScope: VoteScope = { identityId, roomId, round: 2, poolVersion: snap.poolVersion };
    const scopeKey = JSON.stringify([identityId, roomId, 2, snap.poolVersion]);
    const scopeChanged = lastAppliedScopeRef.current !== null && lastAppliedScopeRef.current !== scopeKey;
    lastAppliedScopeRef.current = scopeKey;
    const storedReceipt = getSubmissionReceipt(snapshotScope);
    setRoomVersion(snap.version);
    setPoolVersion(snap.poolVersion);
    if (typeof snap.submittedCount === 'number') {
      setRosterAcknowledgedCount(snap.submittedCount);
    }
    if (typeof snap.memberCount === 'number') {
      setTotalRosterCount(snap.memberCount);
    }
    setServerCanHostEarlyFinish(Boolean(snap.canEndWaiting));

    if (Array.isArray(snap.pool) && snap.pool.length > 0) {
      setLocalCandidates(mapSnapshotPoolToPoolDishes(snap.pool));
    }

    if (snap.removalCap != null) {
      setServerCap(snap.removalCap);
    }

    setIsHost(snap.hostUserId === identityId);

    // R6: Calibrate clock skew
    if (snap.serverTime) {
      const sTime = new Date(snap.serverTime).getTime();
      if (!isNaN(sTime)) {
        clockSkewRef.current = sTime - Date.now();
      }
    }

    // R6: Synchronize waiting deadline
    setActiveDeadline(snap.deadline ?? null);
    if (snap.deadline) {
      const remaining = computeRemainingFromDeadline(snap.deadline);
      if (remaining !== null) {
        setWaitingCountdown(remaining);
      }
    } else if (snap.state !== 'WAITING_2') {
      setWaitingCountdown(null);
    }

    // R4 & R5: Terminal states ALWAYS take precedence
    if (snap.state === 'DECIDED' && snap.result) {
      setIsWaitingForMembers(false);
      setNeedsWaitingTransition(false);
      clearBallotIntent(snapshotScope);
      clearVoteDraft(snapshotScope);
      const finalRes = snap.result as unknown as RoomResult;
      setResult(finalRes);
      const outcomeKey = `DECIDED_${finalRes.resultId || 'done'}`;
      if (navigatedOutcomeRef.current !== outcomeKey) {
        navigatedOutcomeRef.current = outcomeKey;
        if (onGoToResultRef.current) {
          onGoToResultRef.current(finalRes);
        } else {
          onFinishRef.current?.(finalRes);
        }
      }
      return;
    }

    if (snap.state === 'NO_CONSENSUS' && snap.result) {
      setIsWaitingForMembers(false);
      setNeedsWaitingTransition(false);
      clearBallotIntent(snapshotScope);
      clearVoteDraft(snapshotScope);
      const finalRes = snap.result as unknown as RoomResult;
      setResult(finalRes);
      const outcomeKey = `NO_CONSENSUS_${finalRes.resultId || 'done'}`;
      if (navigatedOutcomeRef.current !== outcomeKey) {
        navigatedOutcomeRef.current = outcomeKey;
        if (onGoToNoConsensusRef.current) {
          onGoToNoConsensusRef.current(finalRes);
        } else {
          onFinishRef.current?.(finalRes);
        }
      }
      return;
    }

    // R2: Caller ACK separation for Round 2
    const hasCompleteBallot = Array.isArray(snap.ownBallot)
      && snap.ownBallot.length > 0
      && Array.isArray(snap.pool)
      && snap.ownBallot.length === snap.pool.length
      && snap.ownBallot.every((b: any) => typeof b?.roundDishId === 'string' && typeof b?.choice === 'string');
    const callerSubmitted = Boolean(snap.ownWaiting || hasCompleteBallot);

    if (callerSubmitted) {
      setSubmissionState('ack');
      if (snap.ownWaiting) {
        setWaitingError(null);
        clearWaitingIntent(snapshotScope);
      }
      if (storedReceipt) setReceipt(storedReceipt);
      setIsWaitingForMembers(snap.state === 'WAITING_2');
      setNeedsWaitingTransition((snap.state === 'ROUND_2' || snap.state === 'WAITING_2') && !snap.ownWaiting && hasCompleteBallot);
      if (hasCompleteBallot) {
        clearBallotIntent(snapshotScope);
        clearVoteDraft(snapshotScope);
      }
      if (Array.isArray(snap.ownBallot) && snap.ownBallot.length > 0) {
        const restoredChoices: Record<string, FinalChoice> = {};
        for (const b of snap.ownBallot as any[]) {
          if (b.roundDishId && b.choice) {
            restoredChoices[b.roundDishId] = b.choice === 'REMOVE' ? 'REMOVE' : 'KEEP';
          }
        }
        choicesRef.current = restoredChoices;
        setChoices(restoredChoices);
      }
    } else {
      // Caller has NOT submitted R2 yet! Keep idle & unlocked
      const pendingIntent = getBallotIntent(snapshotScope) as InFlightIntentR2 | null;
      if (pendingIntent) {
        setNeedsWaitingTransition(false);
        const restoredChoices = Object.fromEntries(pendingIntent.votes.map(item => [item.roundDishId, item.vote === 'REMOVE' ? 'REMOVE' : 'KEEP'])) as Record<string, FinalChoice>;
        choicesRef.current = restoredChoices;
        setChoices(restoredChoices);
        setSubmissionState('error');
        setErrorMessage('Chưa xác nhận được lần gửi trước. Có thể thử gửi lại đúng yêu cầu đã tạo.');
      } else if (scopeChanged) {
        const scopedDraft = getVoteDraft(snapshotScope);
        const nextChoices = (scopedDraft as Record<string, FinalChoice> | null) ?? {};
        choicesRef.current = nextChoices;
        setChoices(nextChoices);
        setSubmissionState(storedReceipt ? 'ack' : 'idle');
        setReceipt(storedReceipt);
        setErrorMessage('');
        setNeedsWaitingTransition(Boolean(storedReceipt) && (snap.state === 'ROUND_2' || snap.state === 'WAITING_2') && !snap.ownWaiting);
      } else {
        if (storedReceipt) {
          setReceipt(storedReceipt);
          setSubmissionState('ack');
          setNeedsWaitingTransition((snap.state === 'ROUND_2' || snap.state === 'WAITING_2') && !snap.ownWaiting);
        } else {
          setNeedsWaitingTransition(false);
        }
      }
      setIsWaitingForMembers(false);
    }
  }, [computeRemainingFromDeadline, identityId, roomId]);

  // Snapshot fetching method (R1: only depends on repository and roomId)
  const fetchSnapshot = useCallback(async (shouldApply?: () => boolean) => {
    if (!repository) return null;
    const requestedContext = captureContext();
    const ticket = snapshotOrderRef.current.begin(requestedContext.key);
    const res = await repository.getSnapshot(roomId);
    if (!isCurrentContext(requestedContext) || shouldApply?.() === false) return null;
    if (res.ok) {
      if (!snapshotOrderRef.current.accepts(ticket, res.data)) return null;
      applySnapshot(res.data);
      setIsLoadingSnapshot(false);
      setSnapshotError(null);
      return res.data;
    } else {
      if (snapshotOrderRef.current.isLatest(ticket)) {
        setIsLoadingSnapshot(false);
        setSnapshotError(res.error.messageKey);
      }
      return null;
    }
  }, [repository, roomId, applySnapshot, captureContext, isCurrentContext]);

  // Initial mount load (stable, runs once)
  useEffect(() => {
    if (!repository || (initialCandidates && initialCandidates.length > 0)) {
      return;
    }
    void fetchSnapshot();
  }, [repository, roomId, initialCandidates, fetchSnapshot]);

  // Countdown timer in waiting state (F3, R6).
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    if (submissionState === 'ack' && isWaitingForMembers) {
      timer = setInterval(() => {
        setWaitingCountdown(prev => {
          if (activeDeadline) {
            const recomputed = computeRemainingFromDeadline(activeDeadline);
            if (recomputed !== null) {
              if (recomputed <= 0) {
                return 0;
              }
              return recomputed;
            }
          }
          if (prev === null) return null;
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [submissionState, isWaitingForMembers, repository, activeDeadline, computeRemainingFromDeadline]);

  // Results can be finalized by the server before this caller submits.
  useEffect(() => {
    if (!repository || submissionState === 'pending') return;
    return startVotingSnapshotPolling(fetchSnapshot, () => Boolean(navigatedOutcomeRef.current));
  }, [repository, fetchSnapshot, submissionState]);

  const attemptEnterWaiting = useCallback(async (allowConflictRetry = true) => {
    if (!repository) return;
    const requestedContext = captureContext();
    const scope = activeScope();
    setIsRetryingWaiting(true);
    setWaitingError(null);

    const send = async (expectedVersion: number, mayRetryConflict: boolean): Promise<void> => {
      const intent = getWaitingIntent(scope, expectedVersion, () => createDurableRequestId('wait_r2'));
      try {
        const waitRes = await repository.enterWaiting({
          roomId: intent.roomId,
          round: 2,
          poolVersion: intent.poolVersion,
          expectedVersion: intent.expectedVersion,
          requestId: intent.requestId,
        });
        if (!isCurrentContext(requestedContext)) return;
        if (waitRes.ok) {
          clearWaitingIntent(scope);
          setNeedsWaitingTransition(false);
          setIsWaitingForMembers(true);
          setResult(null);
          if (waitRes.data.deadline) {
            setActiveDeadline(waitRes.data.deadline);
            const remaining = computeRemainingFromDeadline(waitRes.data.deadline);
            if (remaining !== null) setWaitingCountdown(remaining);
          }
          void fetchSnapshot();
          return;
        }
        if (waitRes.error.messageKey === 'VERSION_CONFLICT' && mayRetryConflict) {
          const fresh = await fetchSnapshot();
          if (!isCurrentContext(requestedContext)) return;
          const hasAcceptedBallot = Boolean(fresh
            && (fresh.state === 'ROUND_2' || fresh.state === 'WAITING_2')
            && fresh.poolVersion === scope.poolVersion
            && !fresh.ownWaiting
            && Array.isArray(fresh.ownBallot)
            && fresh.ownBallot.length === fresh.pool.length
            && fresh.ownBallot.length > 0);
          if (fresh && hasAcceptedBallot) {
            clearWaitingIntent(scope);
            await send(fresh.version, false);
            return;
          }
          if (!fresh) setWaitingError('Không thể xác nhận trạng thái phòng. Tải lại rồi thử vào hàng chờ.');
          else if ((fresh.state === 'ROUND_2' || fresh.state === 'WAITING_2') && fresh.poolVersion === scope.poolVersion && !fresh.ownWaiting) {
            setWaitingError('Snapshot chưa xác nhận đủ phiếu đã ACK. Hãy tải lại trạng thái rồi thử tiếp; không cần gửi lại phiếu.');
          }
          return;
        }
        setWaitingError(`Không thể vào hàng chờ Vòng 2: ${waitRes.error.messageKey}`);
      } catch {
        if (isCurrentContext(requestedContext)) {
          setWaitingError('Lỗi kết nối khi vào hàng chờ Vòng 2. Vui lòng thử lại.');
        }
      }
    };

    try {
      await send(roomVersion, allowConflictRetry);
    } finally {
      if (isCurrentContext(requestedContext)) setIsRetryingWaiting(false);
    }
  }, [repository, activeScope, roomVersion, fetchSnapshot, computeRemainingFromDeadline, captureContext, isCurrentContext]);

  useEffect(() => {
    if (!repository || !needsWaitingTransition) return;
    const attemptKey = `${contextKey}:${poolVersion}:R2`;
    if (autoWaitingAttemptsRef.current.has(attemptKey)) return;
    autoWaitingAttemptsRef.current.add(attemptKey);
    void attemptEnterWaiting();
  }, [repository, needsWaitingTransition, contextKey, poolVersion, attemptEnterWaiting]);

  const handleToggleChoice = (dishId: string, choice: FinalChoice) => {
    if (isLocked) return;

    if (choice === 'REMOVE' && enforceCap) {
      const currentDishChoice = choicesRef.current[dishId];
      const currentRemovedCount = Object.values(choicesRef.current).filter(value => value === 'REMOVE').length;
      if (currentDishChoice !== 'REMOVE' && currentRemovedCount >= eliminationCap) {
        setCapNotice(
          `Bạn chỉ được loại tối đa ${eliminationCap} món ở Vòng 2 (Quy tắc Cap 30% theo ADR-019). Vui lòng đổi món đã loại thành "Giữ" trước khi loại thêm.`
        );
        return;
      }
    }

    setCapNotice('');
    const next = { ...choicesRef.current, [dishId]: choice };
    replaceChoices(next);
  };

  const handleSetAllKeep = () => {
    if (isLocked) return;
    const allKeep: Record<string, FinalChoice> = {};
    for (const dish of candidates) {
      allKeep[dish.roundDishId] = 'KEEP';
    }
    replaceChoices(allKeep);
    setCapNotice('');
  };

  const handleHostEarlyFinish = async () => {
    if (!canHostEarlyFinish) return;
    const requestedContext = captureContext();

    if (repository) {
      const res = await repository.finalize({
        roomId,
        expectedVersion: roomVersion,
        rosterAcknowledgedCount,
        totalRosterCount,
        isHost,
      });
      if (!isCurrentContext(requestedContext)) return;
      if (res.ok) {
        setIsWaitingForMembers(false);
        void fetchSnapshot();
        return;
      } else {
        setErrorMessage(`Không thể kết thúc chờ: ${res.error.messageKey}`);
        return;
      }
    }

    // Mock mode fallback
    setIsWaitingForMembers(false);
    const mockRes = scenario === 'all_removed' ? FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT : FIXTURE_ROUND_TWO_CONSENSUS_RESULT;
    setResult(mockRes);
    if (mockRes.matchTier === 'NO_CONSENSUS' || mockRes.reasonCode === 'ALL_REMOVED') {
      if (onGoToNoConsensusRef.current) {
        onGoToNoConsensusRef.current(mockRes);
      } else {
        onFinishRef.current?.(mockRes);
      }
    } else {
      if (onGoToResultRef.current) {
        onGoToResultRef.current(mockRes);
      } else {
        onFinishRef.current?.(mockRes);
      }
    }
  };

  // Retry waiting if enterWaiting failed after ballot ACK (F4)
  const handleRetryWaiting = async () => {
    if (submissionState !== 'ack') return;
    await attemptEnterWaiting();
  };

  const handleSubmit = async (overrideScenario?: FinalScreenScenario) => {
    if (isLocked && typeof overrideScenario !== 'string') return;
    const requestedContext = captureContext();
    const scope = activeScope();

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setConfirmModalVisible(false);
    setSubmitting(true);
    setSubmissionState('pending');
    setErrorMessage('');
    setCapNotice('');
    setWaitingError(null);

    const ballotVotes: BallotVoteItem[] = candidates.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: choices[dish.roundDishId] === 'REMOVE' ? 'REMOVE' : 'KEEP',
    }));

    // R7: Reuse in-flight intent or construct a new durable one
    let intent = getBallotIntent(scope) as InFlightIntentR2 | null;
    if (!intent) {
      const reqId = createDurableRequestId('vote_r2');
      const intentId = `intent_${reqId}`;
      intent = {
        identityId,
        requestId: reqId,
        intentId,
        roomId,
        round: 2,
        poolVersion,
        expectedVersion: roomVersion,
        votes: ballotVotes,
      };
      saveBallotIntent(intent);
    }
    if (!intent) return;

    try {
      if (repository) {
        const res = await repository.submitBallot({
          roomId: intent.roomId,
          round: 2,
          poolVersion: intent.poolVersion,
          expectedVersion: intent.expectedVersion,
          votes: intent.votes,
          intentId: intent.intentId,
          requestId: intent.requestId,
        });
        if (!isCurrentContext(requestedContext)) return;
        setSubmitting(false);

        if (res.ok) {
          clearBallotIntent(scope);
          clearVoteDraft(scope);
          setSubmissionState('ack');
          const acknowledgedReceipt = res.data.receipt ?? {
            round: 2,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
          };
          saveSubmissionReceipt(scope, acknowledgedReceipt);
          setReceipt(acknowledgedReceipt);

          // Check if server already transitioned on submit (F4, F5)
          if (res.data.allMembersSubmitted || res.state === 'DECIDED' || res.state === 'NO_CONSENSUS') {
            void fetchSnapshot();
            return;
          }
          setNeedsWaitingTransition(true);
        } else {
          // The identity/room/round/pool scoped intent remains available for an identical retry.
          setSubmissionState('error');
          setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
        }
      } else if (api) {
        const req = {
          roomId: intent.roomId,
          round: 2 as const,
          poolVersion: intent.poolVersion,
          intentId: intent.intentId,
          expectedVersion: intent.expectedVersion,
          votes: intent.votes,
          requestId: intent.requestId,
        };
        const res = await api.submitBallot(req);
        if (!isCurrentContext(requestedContext)) return;
        setSubmitting(false);

        if (res.ok) {
          clearBallotIntent(scope);
          clearVoteDraft(scope);
          setSubmissionState('ack');
          const acknowledgedReceipt = res.data.receipt ?? {
            round: 2,
            intentId: intent.intentId,
            requestId: res.requestId ?? intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
          };
          saveSubmissionReceipt(scope, acknowledgedReceipt);
          setReceipt(acknowledgedReceipt);

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            if (initialResult) {
              setResult(initialResult);
              if (initialResult.matchTier === 'NO_CONSENSUS' || initialResult.reasonCode === 'ALL_REMOVED') {
                if (onGoToNoConsensusRef.current) {
                  onGoToNoConsensusRef.current(initialResult);
                } else {
                  onFinishRef.current?.(initialResult);
                }
              } else {
                if (onGoToResultRef.current) {
                  onGoToResultRef.current(initialResult);
                } else {
                  onFinishRef.current?.(initialResult);
                }
              }
            } else if (allRemoved || res.state === 'NO_CONSENSUS') {
              setResult(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
              if (onGoToNoConsensusRef.current) {
                onGoToNoConsensusRef.current(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
              } else {
                onFinishRef.current?.(FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT);
              }
            } else {
              setResult(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
              if (onGoToResultRef.current) {
                onGoToResultRef.current(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
              } else {
                onFinishRef.current?.(FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
              }
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || 'Lỗi gửi phiếu');
        }
      } else {
        // Pure mock fallback
        await simulateDeferredRequest(null, { delayMs: simulateDelayMs });
        if (!isCurrentContext(requestedContext)) return;
        setSubmitting(false);

        if (simulateError || activeScenario === 'error') {
          setSubmissionState('error');
          setErrorMessage('Mô phỏng lỗi kết nối máy chủ (Fixture Error). Vui lòng thử lại.');
        } else {
          clearBallotIntent(scope);
          clearVoteDraft(scope);
          setSubmissionState('ack');
          const acknowledgedReceipt: SubmissionReceipt = {
            round: 2,
            intentId: intent.intentId,
            requestId: intent.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: intent.votes.length,
            votesSummary: intent.votes,
          };
          saveSubmissionReceipt(scope, acknowledgedReceipt);
          setReceipt(acknowledgedReceipt);

          if (activeScenario === 'waiting') {
            setIsWaitingForMembers(true);
            setResult(null);
          } else {
            setIsWaitingForMembers(false);
            const mockOutcome = (allRemoved || activeScenario === 'all_removed')
              ? FIXTURE_ROUND_TWO_ALL_REMOVED_RESULT
              : (initialResult || FIXTURE_ROUND_TWO_CONSENSUS_RESULT);
            setResult(mockOutcome);
            if (mockOutcome.matchTier === 'NO_CONSENSUS' || mockOutcome.reasonCode === 'ALL_REMOVED') {
              if (onGoToNoConsensusRef.current) {
                onGoToNoConsensusRef.current(mockOutcome);
              } else {
                onFinishRef.current?.(mockOutcome);
              }
            } else {
              if (onGoToResultRef.current) {
                onGoToResultRef.current(mockOutcome);
              } else {
                onFinishRef.current?.(mockOutcome);
              }
            }
          }
        }
      }
    } catch {
      if (!isCurrentContext(requestedContext)) return;
      setSubmitting(false);
      setSubmissionState('error');
      setErrorMessage('Đã xảy ra lỗi không xác định khi nộp lựa chọn Vòng 2.');
    }
  };

  return {
    choices,
    scenario,
    setScenario,
    submitting,
    submissionState,
    errorMessage,
    confirmModalVisible,
    setConfirmModalVisible,
    receipt,
    result,
    isWaitingForMembers,
    waitingError,
    isRetryingWaiting,
    needsWaitingTransition,
    capNotice,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    setTotalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    eliminationCap,
    removedCount,
    keptCount,
    allRemoved,
    isLocked,
    candidates,
    isLoadingSnapshot,
    snapshotError,
    fetchSnapshot,
    handleToggleChoice,
    handleSetAllKeep,
    handleHostEarlyFinish,
    handleRetryWaiting,
    handleSubmit,
  };
}
