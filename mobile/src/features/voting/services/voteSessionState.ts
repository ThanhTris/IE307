import type { BallotVoteItem, SubmissionReceipt } from '../../../data/api';
import { getDurableOutbox } from '../../../data/local/outbox';

export interface VoteScope {
  identityId: string;
  roomId: string;
  round: 1 | 2;
  poolVersion: number;
}

export interface VoteContextToken {
  key: string;
  generation: number;
}

export interface StoredBallotIntent extends VoteScope {
  requestId: string;
  intentId: string;
  expectedVersion: number;
  votes: BallotVoteItem[];
}

export interface StoredWaitingIntent extends VoteScope {
  requestId: string;
  expectedVersion: number;
}

const ballotIntents = new Map<string, StoredBallotIntent>();
const voteDrafts = new Map<string, Record<string, string>>();
const submissionReceipts = new Map<string, SubmissionReceipt>();
const waitingIntents = new Map<string, StoredWaitingIntent>();

function scopeKey(scope: VoteScope): string {
  return JSON.stringify([scope.identityId, scope.roomId, scope.round, scope.poolVersion]);
}

function hasScopedIdentity(scope: VoteScope): boolean {
  return scope.identityId !== 'anonymous' && scope.identityId !== 'unresolved';
}

export function getBallotIntent(scope: VoteScope): StoredBallotIntent | null {
  return ballotIntents.get(scopeKey(scope)) ?? null;
}

export function saveBallotIntent(intent: StoredBallotIntent): void {
  ballotIntents.set(scopeKey(intent), { ...intent, votes: intent.votes.map(vote => ({ ...vote })) });
}

export function clearBallotIntent(scope: VoteScope): void {
  ballotIntents.delete(scopeKey(scope));
}

export function getVoteDraft(scope: VoteScope): Record<string, string> | null {
  if (!hasScopedIdentity(scope)) return null;
  const draft = voteDrafts.get(scopeKey(scope));
  return draft ? { ...draft } : null;
}

export function saveVoteDraft(scope: VoteScope, draft: Record<string, string>): void {
  if (!hasScopedIdentity(scope)) return;
  voteDrafts.set(scopeKey(scope), { ...draft });
}

export function clearVoteDraft(scope: VoteScope): void {
  voteDrafts.delete(scopeKey(scope));
}

export function getSubmissionReceipt(scope: VoteScope): SubmissionReceipt | null {
  if (!hasScopedIdentity(scope)) return null;
  const receipt = submissionReceipts.get(scopeKey(scope));
  return receipt ? { ...receipt } : null;
}

export function saveSubmissionReceipt(scope: VoteScope, receipt: SubmissionReceipt): void {
  if (!hasScopedIdentity(scope)) return;
  submissionReceipts.set(scopeKey(scope), { ...receipt });
}

export function getWaitingIntent(scope: VoteScope, expectedVersion: number, create: () => string): StoredWaitingIntent {
  const key = scopeKey(scope);
  const existing = waitingIntents.get(key);
  if (existing) return { ...existing };
  const intent = { ...scope, expectedVersion, requestId: create() };
  waitingIntents.set(key, intent);
  return { ...intent };
}

export function clearWaitingIntent(scope: VoteScope): void {
  waitingIntents.delete(scopeKey(scope));
}

/** In-memory request state and durable private outbox/cache belong to the authenticated identity and are discarded at logout. */
export function clearVoteSession(identityId: string): void {
  for (const [key, intent] of ballotIntents) {
    if (intent.identityId === identityId) ballotIntents.delete(key);
  }
  for (const [key, intent] of waitingIntents) {
    if (intent.identityId === identityId) waitingIntents.delete(key);
  }
  for (const key of [...voteDrafts.keys()]) {
    const [storedIdentity] = JSON.parse(key) as [string];
    if (storedIdentity === identityId) voteDrafts.delete(key);
  }
  for (const key of [...submissionReceipts.keys()]) {
    const [storedIdentity] = JSON.parse(key) as [string];
    if (storedIdentity === identityId) submissionReceipts.delete(key);
  }
  if (identityId && identityId !== 'anonymous' && identityId !== 'unresolved') {
    void getDurableOutbox().clearIdentity(identityId).catch(() => undefined);
  }
}

export interface SnapshotReadTicket {
  contextKey: string;
  generation: number;
  sequence: number;
}

interface SnapshotVersionState {
  version: number;
  state: string;
  sequence: number;
}

const STATE_RANK: Record<string, number> = {
  ROUND_1: 1,
  WAITING_1: 2,
  ROUND_2: 3,
  WAITING_2: 4,
  DECIDED: 5,
  NO_CONSENSUS: 5,
  CANCELLED: 5,
  EXPIRED: 5,
};

/** Prevents late reads from regressing a room's version or round within one view context. */
export class SnapshotReadOrder {
  private contextKey: string | null = null;
  private generation = 0;
  private sequence = 0;
  private applied: SnapshotVersionState | null = null;

  activate(contextKey: string): void {
    if (contextKey === this.contextKey) return;
    this.contextKey = contextKey;
    this.generation += 1;
    this.sequence = 0;
    this.applied = null;
  }

  begin(contextKey: string): SnapshotReadTicket {
    this.activate(contextKey);
    this.sequence += 1;
    return { contextKey, generation: this.generation, sequence: this.sequence };
  }

  accepts(ticket: SnapshotReadTicket, snapshot: { version: number; state: string }): boolean {
    if (ticket.contextKey !== this.contextKey || ticket.generation !== this.generation) return false;
    const current = this.applied;
    const incomingRank = STATE_RANK[snapshot.state] ?? 0;
    const currentRank = current ? (STATE_RANK[current.state] ?? 0) : 0;
    const incomingTerminal = incomingRank === 5;
    const currentTerminal = currentRank === 5;

    if (!current) {
      this.applied = { version: snapshot.version, state: snapshot.state, sequence: ticket.sequence };
      return true;
    }
    if (snapshot.version < current.version) return false;
    if (snapshot.version === current.version && ticket.sequence <= current.sequence) return false;
    if (currentTerminal && (!incomingTerminal || snapshot.state !== current.state)) return false;
    if (incomingRank < currentRank) return false;
    this.applied = { version: snapshot.version, state: snapshot.state, sequence: ticket.sequence };
    return true;
  }

  isLatest(ticket: SnapshotReadTicket): boolean {
    return ticket.contextKey === this.contextKey
      && ticket.generation === this.generation
      && ticket.sequence >= (this.applied?.sequence ?? 0);
  }
}
