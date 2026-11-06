import {
  clearVoteSession,
  getBallotIntent,
  getSubmissionReceipt,
  getVoteDraft,
  getWaitingRequestId,
  resetWaitingRequestId,
  saveBallotIntent,
  saveSubmissionReceipt,
  saveVoteDraft,
  SnapshotReadOrder,
  type StoredBallotIntent,
  type VoteScope,
} from '../../src/features/voting/services/voteSessionState';
import { formatDishPrice } from '../../src/features/voting/services/priceLabel';

const scope: VoteScope = { identityId: 'user-a', roomId: 'room-a', round: 2, poolVersion: 7 };

afterEach(() => clearVoteSession('user-a'));

it('keeps an unresolved ballot separate by identity, room, round, and pool version', () => {
  const intent: StoredBallotIntent = {
    ...scope,
    requestId: 'request-a',
    intentId: 'intent-a',
    expectedVersion: 11,
    votes: [{ roundDishId: 'dish-a', vote: 'REMOVE' }],
  };
  saveBallotIntent(intent);

  expect(getBallotIntent(scope)).toEqual(intent);
  expect(getBallotIntent({ ...scope, identityId: 'user-b' })).toBeNull();
  expect(getBallotIntent({ ...scope, roomId: 'room-b' })).toBeNull();
  expect(getBallotIntent({ ...scope, round: 1 })).toBeNull();
  expect(getBallotIntent({ ...scope, poolVersion: 8 })).toBeNull();
});

it('partitions drafts and ACK receipts by scope and clears them on logout', () => {
  const receipt = {
    round: 2 as const,
    intentId: 'intent-a',
    requestId: 'request-a',
    submittedAt: '2026-11-06T00:00:00.000Z',
    voteCount: 1,
  };
  saveVoteDraft(scope, { dishA: 'REMOVE' });
  saveSubmissionReceipt(scope, receipt);

  expect(getVoteDraft(scope)).toEqual({ dishA: 'REMOVE' });
  expect(getSubmissionReceipt(scope)).toEqual(receipt);
  expect(getVoteDraft({ ...scope, roomId: 'room-b' })).toBeNull();
  expect(getSubmissionReceipt({ ...scope, round: 1 })).toBeNull();

  clearVoteSession('user-a');
  expect(getVoteDraft(scope)).toBeNull();
  expect(getSubmissionReceipt(scope)).toBeNull();
});

it('retains the waiting request id for ambiguous retries and replaces it after a confirmed conflict', () => {
  const first = getWaitingRequestId(scope, () => 'wait-1');
  expect(getWaitingRequestId(scope, () => 'wait-2')).toBe(first);
  resetWaitingRequestId(scope);
  expect(getWaitingRequestId(scope, () => 'wait-3')).toBe('wait-3');
});

it('ignores an older snapshot response after a newer version has been applied', () => {
  const reads = new SnapshotReadOrder();
  const old = reads.begin('user-a:room-a');
  const fresh = reads.begin('user-a:room-a');

  expect(reads.accepts(fresh, { version: 9, state: 'ROUND_1' })).toBe(true);
  expect(reads.accepts(old, { version: 8, state: 'ROUND_1' })).toBe(false);
});

it('uses request order for equal versions and never regresses the round or a terminal state', () => {
  const reads = new SnapshotReadOrder();
  const first = reads.begin('user-a:room-a');
  const second = reads.begin('user-a:room-a');
  expect(reads.accepts(second, { version: 12, state: 'WAITING_1' })).toBe(true);
  expect(reads.accepts(first, { version: 12, state: 'WAITING_1' })).toBe(false);

  const roundTwo = reads.begin('user-a:room-a');
  expect(reads.accepts(roundTwo, { version: 13, state: 'ROUND_2' })).toBe(true);
  const lateRoundOne = reads.begin('user-a:room-a');
  expect(reads.accepts(lateRoundOne, { version: 20, state: 'ROUND_1' })).toBe(false);

  const terminal = reads.begin('user-a:room-a');
  expect(reads.accepts(terminal, { version: 14, state: 'NO_CONSENSUS' })).toBe(true);
  const activeAfterTerminal = reads.begin('user-a:room-a');
  expect(reads.accepts(activeAfterTerminal, { version: 30, state: 'WAITING_2' })).toBe(false);
});

it('rejects a late same-version response even when it claims a forward state transition', () => {
  const reads = new SnapshotReadOrder();
  const old = reads.begin('user-a:room-a');
  const latest = reads.begin('user-a:room-a');

  expect(reads.accepts(latest, { version: 20, state: 'ROUND_1' })).toBe(true);
  expect(reads.accepts(old, { version: 20, state: 'WAITING_1' })).toBe(false);

  const current = reads.begin('user-a:room-a');
  expect(reads.accepts(current, { version: 20, state: 'WAITING_1' })).toBe(true);
});

it('never accepts a lower version even when it claims a forward state transition', () => {
  const reads = new SnapshotReadOrder();
  const initial = reads.begin('user-a:room-a');
  expect(reads.accepts(initial, { version: 9, state: 'WAITING_1' })).toBe(true);
  const staleTransition = reads.begin('user-a:room-a');
  expect(reads.accepts(staleTransition, { version: 8, state: 'ROUND_2' })).toBe(false);
  const currentTransition = reads.begin('user-a:room-a');
  expect(reads.accepts(currentTransition, { version: 10, state: 'ROUND_2' })).toBe(true);
});

it('invalidates outstanding snapshot reads when the user or room context changes', () => {
  const reads = new SnapshotReadOrder();
  const priorContextRead = reads.begin('user-a:room-a');
  reads.activate('user-a:room-b');
  reads.activate('user-a:room-a');
  expect(reads.accepts(priorContextRead, { version: 30, state: 'ROUND_2' })).toBe(false);
});

it.each([
  [{ priceMin: 10, priceMax: 10, currency: 'USD', unit: 'portion' }, '10 USD/phần'],
  [{ priceMin: 50000, priceMax: 50000, currency: 'VND', unit: 'kg' }, '50.000 ₫/kg'],
  [{ priceMin: 30, priceMax: 50, currency: 'THB', unit: 'item' }, '30–50 THB/món'],
  [{ priceMin: 90000, priceMax: 90000, currency: 'VND', unit: 'menu_item_unspecified' }, '90.000 ₫ · đơn vị chưa rõ'],
] as const)('formats known price metadata without inferring a different unit', (dish, expected) => {
  expect(formatDishPrice(dish)).toBe(expected);
});

it.each([
  { priceMin: null, priceMax: null, currency: 'VND', unit: 'kg' },
  { priceMin: 10, priceMax: 10, currency: null, unit: 'portion' },
  { priceMin: 10, priceMax: 10, currency: 'USD', unit: null },
  { priceMin: 10, priceMax: 10, currency: 'other', unit: 'item' },
] as const)('hides a price if amount, currency, or unit is unknown', dish => {
  expect(formatDishPrice(dish)).toBeUndefined();
});
