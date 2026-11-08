import type { HistoryItem } from '../../../data/api/contracts';
import type { ResultDish, ScoredResult } from '../../result/services/resultPresentation';

export interface LegacyUnscoredHistoryResult {
  capability: 'legacy-unscored-v1';
  status: 'DECIDED' | 'NO_CONSENSUS';
  winner: ResultDish | null;
  reasonCode?: string | null;
  finalizedAt: string;
}

export interface CanonicalHistoryItem {
  historyId: string;
  roomId: string;
  resultId: string;
  scope: 'personal' | 'group';
  createdAt: string;
  expiresAt: string;
  result: ScoredResult | LegacyUnscoredHistoryResult;
  desiredAt?: string | null;
  finalizedAt?: string;
  memberCount?: number;
  round1BallotCount?: number;
  participants?: { displayName: string; role: string }[];
}

export interface CanonicalHistoryPage { items: CanonicalHistoryItem[] }

export type HistoryRow = CanonicalHistoryItem | HistoryItem;
