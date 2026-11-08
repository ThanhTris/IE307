import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { VoteScreen } from '../../src/features/voting/screens/VoteScreen';
import { FinalRoundScreen } from '../../src/features/voting/screens/FinalRoundScreen';
import { useRoundOneVoting } from '../../src/features/voting/hooks/useRoundOneVoting';
import { useRoundTwoVoting } from '../../src/features/voting/hooks/useRoundTwoVoting';
import { createLiveVoteRepository, mapSnapshotPoolToPoolDishes } from '../../src/features/voting/services/voteRepository';
import { isCanonicalRoomSnapshot } from '../../src/data/api/responseGuards';
import type { RoomSnapshot } from '../../src/data/api';
import { clearVoteSession } from '../../src/features/voting/services/voteSessionState';

const contract = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const policy = 'dish-decision-v4/ADR-019-30PCT-MIN1';
const roomId = '30000000-0000-4000-8000-000000000001';
function snapshot(overrides: Record<string, unknown> = {}) {
  const s = {
    contractVersion: contract, policyVersion: policy, catalogueVersion: 'review-synthetic-v1', catalogueSha: 'a'.repeat(64),
    roomId, code: 'GCD234', state: 'ROUND_1', version: 7, round: 1, poolVersion: 1, dishCount: 10,
    pool: Array.from({ length: 10 }, (_, i) => ({
      roundDishId: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      dishId: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      name: `Server dish ${i + 1}`, description: null, mealSlots: ['lunch'], cuisineIds: [], cuisineLabels: [],
      categoryIds: [], categoryLabels: [], temperature: null, flavor: null, artwork: null, priceReference: null,
    })),
    members: Array.from({ length: 3 }, (_, i) => ({ userId: `40000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, displayName: `Person ${i + 1}`, role: i === 0 ? 'HOST' : 'MEMBER', submissionStatus: 'NOT_SUBMITTED' })),
    submittedCount: 0, memberCount: 3, ownBallot: [], ownWaiting: false,
    waitingStartedAt: null, deadline: null, serverTime: new Date().toISOString(), result: null,
    hostUserId: '40000000-0000-4000-8000-000000000001', settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null },
    ownPreferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false },
    ownPreferenceRevision: null, preferenceRanking: 'UNSUPPORTED', removalCap: null,
    expiresAt: new Date(Date.now() + 3600000).toISOString(), canEndWaiting: false, ...overrides,
  };
  expect(isCanonicalRoomSnapshot(s)).toBe(true);
  return s as unknown as RoomSnapshot;
}
function repository(s: RoomSnapshot) {
  return { getSnapshot: jest.fn().mockResolvedValue({ ok: true, data: s }), submitBallot: jest.fn(), enterWaiting: jest.fn(), finalize: jest.fn() };
}
function waiting(round: 1 | 2) {
  const start = Date.now() - 30000;
  const base = snapshot();
  return snapshot({
    state: round === 1 ? 'WAITING_1' : 'WAITING_2', round, removalCap: round === 2 ? 3 : null,
    waitingStartedAt: new Date(start).toISOString(), deadline: new Date(start + 60000).toISOString(),
    submittedCount: 1, members: base.members.map((m, i) => ({ ...m, submissionStatus: i === 0 ? 'ACCEPTED' : 'NOT_SUBMITTED' })),
    ownBallot: [], ownWaiting: false,
  });
}
function terminal() {
  const base = snapshot();
  return snapshot({ state: 'NO_CONSENSUS', round: 2, pool: [], submittedCount: 1,
    members: base.members.map((m, i) => ({ ...m, submissionStatus: i === 0 ? 'ACCEPTED' : 'NOT_SUBMITTED' })), result: {
    resultId: '50000000-0000-4000-8000-000000000001', contractVersion: contract, policyVersion: policy,
    status: 'NO_CONSENSUS', round: 2, winner: null, reasonCode: 'ALL_REMOVED', finalizedAt: new Date().toISOString(),
    scoreVersion: null, rankingVersion: null, topDishes: [], round1BallotCount: 2,
  } });
}

beforeEach(() => clearVoteSession('anonymous'));
afterEach(async () => {
  await cleanup();
  clearVoteSession('anonymous');
  clearVoteSession('user-wait');
  clearVoteSession('user-resume');
  jest.restoreAllMocks();
});

it('F1 repaired: uses canonical choice fields for both rounds', async () => {
  for (const round of [1, 2] as const) {
    const rpc = jest.fn().mockResolvedValue({ ok: true, version: 8, state: round === 1 ? 'ROUND_1' : 'ROUND_2', data: { accepted: true, round, poolVersion: 1, submittedAt: new Date().toISOString() } });
    const live = createLiveVoteRepository({ rpcCaller: rpc });
    const res = await live.submitBallot({ roomId, round, poolVersion: 1, expectedVersion: 7, requestId: `wire_${round}`, votes: [{ roundDishId: snapshot().pool[0]!.roundDishId, vote: round === 1 ? 'OK' : 'KEEP' }] });
    expect(res.ok).toBe(true);
    expect(rpc.mock.calls[0][1].payload.votes[0]).toEqual({ roundDishId: snapshot().pool[0]!.roundDishId, choice: round === 1 ? 'OK' : 'KEEP' });
  }
});

it('F7 partially repaired: rejects a success response with no ACK body', async () => {
  const live = createLiveVoteRepository({ rpcCaller: jest.fn().mockResolvedValue({ ok: true }) });
  const res = await live.submitBallot({ roomId, round: 1, poolVersion: 1, expectedVersion: 7, votes: [{ roundDishId: snapshot().pool[0]!.roundDishId, vote: 'OK' }] });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error.messageKey).toBe('MALFORMED_RESPONSE');
});

it('does not repeatedly load a ROUND_1 snapshot after the real VoteScreen renders', async () => {
  const s = snapshot();
  const repo = repository(s);
  const view = await render(<VoteScreen roomId={roomId} repository={repo} onGoToFinalRound={jest.fn()} />);
  expect(repo.getSnapshot).toHaveBeenCalledTimes(1);
  await act(async () => new Promise(resolve => setTimeout(resolve, 50)));
  await view.unmount();
  expect(repo.getSnapshot).toHaveBeenCalledTimes(1);
});

it.each([1, 2] as const)('allows an unsubmitted caller to keep voting in WAITING_%s', async round => {
  const repo = repository(waiting(round));
  const { result } = await renderHook(() => round === 1
    ? useRoundOneVoting({ repository: repo, roomId, initialIsHost: false })
    : useRoundTwoVoting({ repository: repo, roomId, initialIsHost: false }));
  expect(result.current.submissionState).toBe('idle');
  expect(result.current.isLocked).toBe(false);
});

it('keeps missing reference prices unknown instead of generating 50-70k', () => {
  const [card] = mapSnapshotPoolToPoolDishes(snapshot().pool);
  expect(card!.priceMin ?? null).toBeNull();
  expect(card!.priceMax ?? null).toBeNull();
});

it('handles terminal R2 snapshots before the round-two transition branch in R1', async () => {
  const onNoConsensus = jest.fn();
  const onRoundTwo = jest.fn();
  const repo = repository(terminal());
  await renderHook(() => useRoundOneVoting({ repository: repo, roomId, onGoToNoConsensus: onNoConsensus, onRoundTwo }));
  expect(onNoConsensus).toHaveBeenCalledTimes(1);
  expect(onRoundTwo).not.toHaveBeenCalled();
});

it('does not override the no-consensus route through the generic onFinish callback', async () => {
  const destinations: string[] = [];
  const repo = repository(terminal());
  const noConsensus = () => destinations.push('/room/no-consensus');
  const finish = () => destinations.push('/room/result');
  await renderHook(() => useRoundTwoVoting({ repository: repo, roomId, onGoToNoConsensus: noConsensus, onFinish: finish }));
  expect(destinations).toEqual(['/room/no-consensus']);
});

it('computes the countdown using server clock offset on a skewed client', async () => {
  const s = waiting(1);
  const serverNow = Date.now();
  s.ownWaiting = true;
  s.ownBallot = s.pool.map(d => ({ roundDishId: d.roundDishId, choice: 'OK' }));
  s.serverTime = new Date(serverNow).toISOString();
  s.deadline = new Date(serverNow + 30000).toISOString();
  jest.spyOn(Date, 'now').mockReturnValue(serverNow + 300000);
  const repo = repository(s);
  const { result } = await renderHook(() => useRoundOneVoting({ repository: repo, roomId }));
  expect(result.current.waitingCountdown).toBe(30);
});

it('keeps the whole unknown-ACK request stable after snapshot version changes', async () => {
  const s = snapshot();
  const repo = repository(s);
  repo.submitBallot.mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const votes = Object.fromEntries(s.pool.map(d => [d.roundDishId, 'OK' as const]));
  const { result } = await renderHook(() => useRoundOneVoting({ repository: repo, roomId, initialVotes: votes }));
  await act(async () => result.current.handleSubmit());
  repo.getSnapshot.mockResolvedValue({ ok: true, data: snapshot({ version: 8 }) });
  await act(async () => result.current.fetchSnapshot());
  await act(async () => result.current.handleSubmit());
  expect(repo.submitBallot).toHaveBeenCalledTimes(2);
  expect(repo.submitBallot.mock.calls[1][0]).toEqual(repo.submitBallot.mock.calls[0][0]);
});

it.each([1, 2] as const)('recovers the waiting transition after reopening with an ACKed ballot in ROUND_%s', async round => {
  const s = waiting(round);
  s.state = round === 1 ? 'ROUND_1' : 'ROUND_2';
  s.deadline = null;
  s.waitingStartedAt = null;
  s.ownBallot = s.pool.map(d => ({ roundDishId: d.roundDishId, choice: round === 1 ? 'OK' : 'KEEP' }));
  expect(isCanonicalRoomSnapshot(s)).toBe(true);
  const repo = repository(s);
  repo.enterWaiting.mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const { result } = await renderHook(() => round === 1
    ? useRoundOneVoting({ repository: repo, roomId })
    : useRoundTwoVoting({ repository: repo, roomId }));
  expect(result.current.submissionState).toBe('ack');
  // Either resume the missing write, or show an explicit retry affordance.
  expect(repo.enterWaiting.mock.calls.length > 0 || Boolean(result.current.waitingError)).toBe(true);
  await waitFor(() => {
    expect(result.current.isRetryingWaiting).toBe(false);
    expect(result.current.waitingError).toBeTruthy();
  });
});

it.each([1, 2] as const)('reuses the same waiting request id after a transport failure in round %s', async round => {
  const s = round === 1 ? snapshot() : waiting(2);
  s.state = round === 1 ? 'ROUND_1' : 'ROUND_2';
  s.round = round;
  s.deadline = null;
  s.waitingStartedAt = null;
  s.ownBallot = s.pool.map(d => ({ roundDishId: d.roundDishId, choice: round === 1 ? 'OK' : 'KEEP' }));
  expect(isCanonicalRoomSnapshot(s)).toBe(true);
  const repo = repository(s);
  repo.enterWaiting.mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const { result } = await renderHook(() => round === 1
    ? useRoundOneVoting({ repository: repo, roomId, identityId: 'user-wait' })
    : useRoundTwoVoting({ repository: repo, roomId, identityId: 'user-wait' }));

  await waitFor(() => expect(repo.enterWaiting).toHaveBeenCalledTimes(1));
  await waitFor(() => {
    expect(result.current.isRetryingWaiting).toBe(false);
    expect(result.current.waitingError).toBeTruthy();
  });
  const originalRequestId = repo.enterWaiting.mock.calls[0][0].requestId;
  await act(async () => result.current.handleRetryWaiting());
  expect(repo.enterWaiting).toHaveBeenCalledTimes(2);
  expect(repo.enterWaiting.mock.calls[1][0].requestId).toBe(originalRequestId);
});

it('restores an unresolved ballot from the same in-memory user/room/pool scope after remount', async () => {
  const s = snapshot();
  const repo = repository(s);
  repo.submitBallot.mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const votes = Object.fromEntries(s.pool.map(d => [d.roundDishId, 'OK' as const]));
  const first = await renderHook(() => useRoundOneVoting({ repository: repo, roomId, identityId: 'user-resume', initialVotes: votes }));
  await waitFor(() => expect(first.result.current.allVoted).toBe(true));
  await act(async () => first.result.current.handleSubmit());
  const originalRequest = repo.submitBallot.mock.calls[0][0];
  await first.unmount();

  const resumed = await renderHook(() => useRoundOneVoting({ repository: repo, roomId, identityId: 'user-resume' }));
  await waitFor(() => expect(resumed.result.current.allVoted).toBe(true));
  expect(resumed.result.current.votes).toEqual(votes);
  expect(resumed.result.current.allVoted).toBe(true);
  await act(async () => resumed.result.current.handleSubmit());
  expect(repo.submitBallot.mock.calls[1][0]).toEqual(originalRequest);
});

it('does not display a canonical USD amount as Vietnamese dong', async () => {
  const s = snapshot();
  const card = { ...s.pool[0], priceReference: { amount: 10, currency: 'USD', unit: 'portion', servingSize: null, sourceRef: 'review-synthetic-source', checkedAt: new Date().toISOString() } };
  expect(isCanonicalRoomSnapshot({ ...s, pool: [card, ...s.pool.slice(1)] })).toBe(true);
  const candidates = mapSnapshotPoolToPoolDishes([card]);
  await render(<FinalRoundScreen candidates={candidates} showScenarioPicker={false} />);
  expect(screen.queryByText('10 đ')).toBeNull();
});

it.each([1, 2] as const)('preserves the entire ambiguous waiting request after a newer snapshot in round %s', async round => {
  const s = waiting(round);
  s.state = round === 1 ? 'ROUND_1' : 'ROUND_2';
  s.deadline = null;
  s.waitingStartedAt = null;
  s.ownBallot = s.pool.map(d => ({ roundDishId: d.roundDishId, choice: round === 1 ? 'OK' : 'KEEP' }));
  const repo = repository(s);
  repo.enterWaiting.mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const { result } = await renderHook(() => round === 1
    ? useRoundOneVoting({ repository: repo, roomId, identityId: 'user-wait' })
    : useRoundTwoVoting({ repository: repo, roomId, identityId: 'user-wait' }));

  await waitFor(() => expect(result.current.waitingError).toBeTruthy());
  const originalRequest = repo.enterWaiting.mock.calls[0][0];
  repo.getSnapshot.mockResolvedValue({ ok: true, data: { ...s, version: s.version + 1 } });
  await act(async () => result.current.fetchSnapshot());
  await act(async () => result.current.handleRetryWaiting());

  expect(repo.enterWaiting).toHaveBeenCalledTimes(2);
  expect(repo.enterWaiting.mock.calls[1][0]).toEqual(originalRequest);
});

it.each([1, 2] as const)('uses the caller identity for host controls in round %s even before majority is reached', async round => {
  const s = waiting(round);
  s.ownWaiting = true;
  s.ownBallot = s.pool.map(d => ({ roundDishId: d.roundDishId, choice: round === 1 ? 'OK' : 'KEEP' }));
  const repo = repository(s);
  const member = await renderHook(() => round === 1
    ? useRoundOneVoting({ repository: repo, roomId, identityId: s.members[1]!.userId })
    : useRoundTwoVoting({ repository: repo, roomId, identityId: s.members[1]!.userId }));
  await waitFor(() => expect(member.result.current.submissionState).toBe('ack'));
  expect(member.result.current.isHost).toBe(false);
  expect(member.result.current.canHostEarlyFinish).toBe(false);
  await member.unmount();

  const host = await renderHook(() => round === 1
    ? useRoundOneVoting({ repository: repo, roomId, identityId: s.hostUserId })
    : useRoundTwoVoting({ repository: repo, roomId, identityId: s.hostUserId }));
  await waitFor(() => expect(host.result.current.submissionState).toBe('ack'));
  expect(host.result.current.isHost).toBe(true);
  expect(host.result.current.canHostEarlyFinish).toBe(false);
});
