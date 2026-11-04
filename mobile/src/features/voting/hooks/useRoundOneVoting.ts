import { useEffect, useRef, useState } from 'react';
import {
  type ApiClient,
  type BallotVoteItem,
  type PoolDish,
  type SubmissionReceipt,
} from '../../../data/api';
import type { VoteValue } from '../../../shared/ui';
import {
  FIXTURE_ROUND_TWO_CANDIDATES,
  WAITING_DEADLINE_SECONDS,
  isHostEarlyFinishAllowed,
  simulateDeferredRequest,
  type VoteScreenScenario,
} from '../fixtures';

export interface UseRoundOneVotingParams {
  pool: PoolDish[];
  roomId: string;
  initialVotes?: Record<string, VoteValue>;
  api?: ApiClient;
  initialScenario: VoteScreenScenario;
  simulateError: boolean;
  simulateDelayMs: number;
  initialIsHost?: boolean;
  initialViewMode?: 'flashcard' | 'list';
}

export function useRoundOneVoting({
  pool,
  roomId,
  initialVotes,
  api,
  initialScenario,
  simulateError,
  simulateDelayMs,
  initialIsHost = true,
  initialViewMode = 'list',
}: UseRoundOneVotingParams) {
  const [votes, setVotes] = useState<Record<string, VoteValue>>(initialVotes || {});
  const [scenario, setScenario] = useState<VoteScreenScenario>(initialScenario);
  const [submissionState, setSubmissionState] = useState<'idle' | 'pending' | 'ack' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [isWaitingForMembers, setIsWaitingForMembers] = useState(false);
  const [needsRoundTwo, setNeedsRoundTwo] = useState(false);
  const [roundTwoCandidates, setRoundTwoCandidates] = useState<PoolDish[]>(FIXTURE_ROUND_TWO_CANDIDATES);
  const [lastActionNotice, setLastActionNotice] = useState<string>('');

  // Flashcard specific state
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'flashcard' | 'list'>(initialViewMode);

  // Waiting countdown & Host control state
  const [waitingCountdown, setWaitingCountdown] = useState(WAITING_DEADLINE_SECONDS);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [totalRosterCount, setTotalRosterCount] = useState(3);
  const [rosterAcknowledgedCount, setRosterAcknowledgedCount] = useState(2);

  const lastTapRef = useRef<Record<string, number>>({});

  const votedCount = pool.filter(dish => Boolean(votes[dish.roundDishId])).length;
  const allVoted = pool.length > 0 && votedCount === pool.length;
  const isLocked = submissionState === 'pending' || submissionState === 'ack';
  const canUndo = activeCardIndex > 0 && !isLocked;

  // Countdown timer in waiting state
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (submissionState === 'ack' && isWaitingForMembers && waitingCountdown > 0) {
      timer = setInterval(() => {
        setWaitingCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [submissionState, isWaitingForMembers, waitingCountdown]);

  const handleSetWant = (dishId: string) => {
    if (isLocked) return;
    setVotes(prev => ({ ...prev, [dishId]: 'WANT' }));
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Double-tap: Đã đặt WANT (Muốn ăn) cho ${dish?.name || dishId} (chưa gửi)`);
  };

  const handleVote = (dishId: string, vote: VoteValue) => {
    if (isLocked) return;
    setVotes(prev => {
      if (prev[dishId] === vote) {
        const next = { ...prev };
        delete next[dishId];
        return next;
      }
      return { ...prev, [dishId]: vote };
    });
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Đã đặt "${vote}" cho ${dish?.name || dishId}`);
  };

  /**
   * Flashcard vote handler: sets the vote and automatically advances to the next card if not at end.
   */
  const handleFlashcardVote = (dishId: string, vote: VoteValue) => {
    if (isLocked) return;
    handleVote(dishId, vote);
    if (activeCardIndex < pool.length - 1) {
      setActiveCardIndex(prev => prev + 1);
    }
  };

  const handleCardPress = (dishId: string) => {
    if (isLocked) return;
    const now = Date.now();
    const last = lastTapRef.current[dishId] ?? 0;
    if (now - last < 350) {
      handleSetWant(dishId);
      lastTapRef.current[dishId] = 0;
    } else {
      lastTapRef.current[dishId] = now;
    }
  };

  const handleClearVote = (dishId: string) => {
    if (isLocked) return;
    setVotes(prev => {
      const next = { ...prev };
      delete next[dishId];
      return next;
    });
    const dish = pool.find(d => d.roundDishId === dishId);
    setLastActionNotice(`Đã hoàn tác phiếu của ${dish?.name || dishId} về UNSET`);
  };

  const handleUndoCard = () => {
    if (!canUndo) return;
    const prevIndex = activeCardIndex - 1;
    setActiveCardIndex(prevIndex);
    const prevDish = pool[prevIndex];
    if (prevDish) {
      setLastActionNotice(`Đã quay lại thẻ trước: ${prevDish.name}`);
    }
  };

  const handleNextCard = () => {
    if (activeCardIndex < pool.length - 1) {
      setActiveCardIndex(prev => prev + 1);
    }
  };

  const handlePrevCard = () => {
    if (activeCardIndex > 0) {
      setActiveCardIndex(prev => prev - 1);
    }
  };

  const canHostEarlyFinish = isHost && isWaitingForMembers && isHostEarlyFinishAllowed(rosterAcknowledgedCount, totalRosterCount);

  const handleHostEarlyFinish = () => {
    if (!canHostEarlyFinish) return;
    setIsWaitingForMembers(false);
    setNeedsRoundTwo(true);
    setRoundTwoCandidates(FIXTURE_ROUND_TWO_CANDIDATES);
    setLastActionNotice(`Host đã kết thúc chờ sớm (${rosterAcknowledgedCount}/${totalRosterCount} thành viên đã ACK). Server đã chuyển vòng!`);
  };

  const handleSubmit = async (overrideScenario?: VoteScreenScenario) => {
    if (!allVoted || (isLocked && typeof overrideScenario !== 'string')) return;

    const activeScenario = typeof overrideScenario === 'string' ? overrideScenario : scenario;
    setSubmissionState('pending');
    setErrorMessage('');
    setWaitingCountdown(WAITING_DEADLINE_SECONDS);

    const ballotVotes: BallotVoteItem[] = pool.map(dish => ({
      roundDishId: dish.roundDishId,
      vote: votes[dish.roundDishId]!,
    }));

    const req = {
      roomId,
      round: 1 as const,
      poolVersion: 1,
      intentId: `intent_${Date.now()}`,
      expectedVersion: 1,
      votes: ballotVotes,
      requestId: `req_vote_${Date.now()}`,
    };

    try {
      if (api) {
        const res = await api.submitBallot(req);
        if (res.ok) {
          setSubmissionState('ack');
          setReceipt(res.data.receipt ?? {
            round: 1,
            intentId: req.intentId,
            requestId: res.requestId ?? req.requestId,
            submittedAt: new Date().toISOString(),
            voteCount: ballotVotes.length,
          });

          if (res.data.allMembersSubmitted === false) {
            setIsWaitingForMembers(true);
            setNeedsRoundTwo(false);
          } else {
            setIsWaitingForMembers(false);
            if (res.data.round === 2 || res.state === 'ROUND_2') {
              setNeedsRoundTwo(true);
              setRoundTwoCandidates(FIXTURE_ROUND_TWO_CANDIDATES);
            } else {
              setNeedsRoundTwo(false);
            }
          }
        } else {
          setSubmissionState('error');
          setErrorMessage(res.error.message || `Lỗi từ server: ${res.error.messageKey}`);
        }
      } else {
        const shouldFail = simulateError ? true : activeScenario === 'error';
        const isWaitingScenario = activeScenario === 'waiting';
        const mockResultData = await simulateDeferredRequest(
          {
            accepted: true,
            round: 1 as const,
            allMembersSubmitted: !isWaitingScenario,
            roomVersion: 2,
            requestId: req.requestId,
            receipt: {
              round: 1 as const,
              intentId: req.intentId,
              requestId: req.requestId,
              submittedAt: new Date().toISOString(),
              voteCount: ballotVotes.length,
            },
            needsRoundTwo: activeScenario === 'round_two',
            candidates: FIXTURE_ROUND_TWO_CANDIDATES,
          },
          {
            delayMs: simulateDelayMs,
            shouldFail,
            errorMessage: 'Mô phỏng lỗi kết nối máy chủ (Fixture Error). Vui lòng thử lại.',
          }
        );

        setSubmissionState('ack');
        setReceipt(mockResultData.receipt);
        if (mockResultData.allMembersSubmitted === false) {
          setIsWaitingForMembers(true);
          setNeedsRoundTwo(false);
        } else {
          setIsWaitingForMembers(false);
          if (mockResultData.needsRoundTwo) {
            setNeedsRoundTwo(true);
            setRoundTwoCandidates(mockResultData.candidates);
          } else {
            setNeedsRoundTwo(false);
          }
        }
      }
    } catch (err) {
      setSubmissionState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi gửi phiếu');
    }
  };

  return {
    votes,
    scenario,
    setScenario,
    submissionState,
    errorMessage,
    receipt,
    isWaitingForMembers,
    needsRoundTwo,
    roundTwoCandidates,
    lastActionNotice,
    lastTapRef,
    allVoted,
    isLocked,
    activeCardIndex,
    setActiveCardIndex,
    viewMode,
    setViewMode,
    canUndo,
    waitingCountdown,
    isHost,
    setIsHost,
    totalRosterCount,
    setTotalRosterCount,
    rosterAcknowledgedCount,
    setRosterAcknowledgedCount,
    canHostEarlyFinish,
    handleHostEarlyFinish,
    handleVote,
    handleFlashcardVote,
    handleCardPress,
    handleClearVote,
    handleUndoCard,
    handleNextCard,
    handlePrevCard,
    handleSubmit,
  };
}
