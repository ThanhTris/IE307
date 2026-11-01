import type { PoolDish } from './discovery';

export type BallotVoteValue = 'WANT' | 'OK' | 'NO' | 'KEEP' | 'REMOVE';

export interface BallotVoteItem {
  roundDishId: string;
  vote: BallotVoteValue;
}

export interface SubmitBallotRequest {
  roomId: string;
  round: 1 | 2;
  poolVersion: number;
  intentId: string;
  expectedVersion: number;
  votes: BallotVoteItem[];
  requestId?: string;
}

export interface SubmissionReceipt {
  round: 1 | 2;
  intentId: string;
  requestId: string;
  submittedAt: string;
  voteCount: number;
  votesSummary?: { roundDishId: string; vote: BallotVoteValue }[];
}

export interface SubmitBallotResponse {
  accepted: boolean;
  round: 1 | 2;
  allMembersSubmitted: boolean;
  roomVersion: number;
  requestId?: string;
  receipt?: SubmissionReceipt;
}

export type DecisionReasonCode =
  | 'UNANIMOUS_WANT'
  | 'ACCEPTABLE_FINAL'
  | 'EMPTY_INTERSECTION'
  | 'ALL_REMOVED';

export type DecisionMatchTier = 'PERFECT' | 'CONSENSUS' | 'COMPROMISE' | 'NO_CONSENSUS';

export interface RoomResult {
  resultId: string;
  roomId: string;
  round: 1 | 2;
  winnerRoundDishId: string | null;
  winnerDish: PoolDish | null;
  reasonCode: DecisionReasonCode;
  matchTier: DecisionMatchTier;
  finalizedAt: string;
  policyVersion: 'decision-v2';
}
