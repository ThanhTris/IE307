import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { FinalRoundScreen } from '../../src/features/voting/screens/FinalRoundScreen';
import { useRoundOneVoting } from '../../src/features/voting/hooks/useRoundOneVoting';
import { useRoundTwoVoting } from '../../src/features/voting/hooks/useRoundTwoVoting';
import { mapSnapshotPoolToPoolDishes } from '../../src/features/voting/services/voteRepository';
import { clearVoteSession, getSubmissionReceipt } from '../../src/features/voting/services/voteSessionState';
import { isCanonicalRoomSnapshot } from '../../src/data/api/responseGuards';
import type { RoomSnapshot } from '../../src/data/api';

const contract = 'dish-session-v4/roadmap-v2/GM-07.B-supplement';
const policy = 'dish-decision-v4/ADR-019-30PCT-MIN1';
const roomId = '30000000-0000-4000-8000-000000000001';

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  const snapshot = {
    contractVersion: contract,
    policyVersion: policy,
    catalogueVersion: 'review-synthetic-v1',
    catalogueSha: 'a'.repeat(64),
    roomId,
    code: 'GCD234',
    state: 'ROUND_1',
    version: 7,
    round: 1,
    poolVersion: 1,
    dishCount: 10,
    pool: Array.from({ length: 10 }, (_, i) => ({
      roundDishId: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      dishId: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      name: `Server dish ${i + 1}`,
      description: null,
      mealSlots: ['lunch'],
      cuisineIds: [],
      cuisineLabels: [],
      categoryIds: [],
      categoryLabels: [],
      temperature: null,
      flavor: null,
      artwork: null,
      priceReference: null,
    })),
    members: Array.from({ length: 3 }, (_, i) => ({
      userId: `40000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      displayName: `Person ${i + 1}`,
      role: i === 0 ? 'HOST' : 'MEMBER',
      submissionStatus: 'NOT_SUBMITTED',
    })),
    submittedCount: 0,
    memberCount: 3,
    ownBallot: [],
    ownWaiting: false,
    waitingStartedAt: null,
    deadline: null,
    serverTime: new Date().toISOString(),
    result: null,
    hostUserId: '40000000-0000-4000-8000-000000000001',
    settings: { dishCount: 10, mealSlot: 'lunch', desiredAt: null },
    ownPreferences: { cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false },
    ownPreferenceRevision: null,
    preferenceRanking: 'UNSUPPORTED',
    removalCap: null,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    canEndWaiting: false,
    ...overrides,
  };
  expect(isCanonicalRoomSnapshot(snapshot)).toBe(true);
  return snapshot as unknown as RoomSnapshot;
}

function makeRepository(initial: RoomSnapshot) {
  return {
    getSnapshot: jest.fn().mockResolvedValue({ ok: true, data: initial }),
    submitBallot: jest.fn(),
    enterWaiting: jest.fn(),
    finalize: jest.fn(),
  };
}

afterEach(() => {
  clearVoteSession('anonymous');
  clearVoteSession('user-draft');
  clearVoteSession('user-wait-1');
  clearVoteSession('user-wait-2');
  clearVoteSession('user-cycle');
  jest.restoreAllMocks();
});

it('restores an unsent ballot draft for the same identity, room, round, and pool version', async () => {
  const s = makeSnapshot();
  const repo = makeRepository(s);
  const pool = mapSnapshotPoolToPoolDishes(s.pool);
  const first = await renderHook(() => useRoundOneVoting({
    repository: repo,
    roomId,
    identityId: 'user-draft',
    pool,
  }));

  await act(async () => first.result.current.handleVote(pool[0]!.roundDishId, 'NO'));
  await first.unmount();

  const resumed = await renderHook(() => useRoundOneVoting({
    repository: repo,
    roomId,
    identityId: 'user-draft',
    pool,
  }));
  expect(resumed.result.current.votes[pool[0]!.roundDishId]).toBe('NO');
  await resumed.unmount();
});

it.each([1, 2] as const)('continues the missing waiting step for an ACKed ballot when the room is already waiting in round %s', async round => {
  const state = round === 1 ? 'WAITING_1' : 'WAITING_2';
  const s = makeSnapshot({
    state,
    round,
    removalCap: round === 2 ? 3 : null,
    ownBallot: Array.from({ length: 10 }, (_, i) => ({
      roundDishId: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      choice: round === 1 ? 'OK' : 'KEEP',
    })),
    deadline: new Date(Date.now() + 60000).toISOString(),
    waitingStartedAt: new Date().toISOString(),
  });
  const repo = makeRepository(s);
  repo.enterWaiting.mockResolvedValue({ ok: true, data: { deadline: s.deadline } });
  const { result, unmount } = await renderHook(() => round === 1
    ? useRoundOneVoting({ repository: repo, roomId, identityId: `user-wait-${round}` })
    : useRoundTwoVoting({ repository: repo, roomId, identityId: `user-wait-${round}` }));

  await waitFor(() => expect(repo.enterWaiting).toHaveBeenCalledTimes(1));
  expect(repo.submitBallot).not.toHaveBeenCalled();
  expect(repo.enterWaiting.mock.calls[0][0].round).toBe(round);
  expect(result.current.submissionState).toBe('ack');
  await unmount();
});

it('renders a canonical VND price with its kg unit', async () => {
  const s = makeSnapshot();
  const card = {
    ...s.pool[0],
    priceReference: {
      amount: 50000,
      currency: 'VND',
      unit: 'kg',
      servingSize: null,
      sourceRef: 'review-synthetic-source',
      checkedAt: new Date().toISOString(),
    },
  };
  const candidates = mapSnapshotPoolToPoolDishes([card]);

  await render(<FinalRoundScreen candidates={candidates} showScenarioPicker />);
  await waitFor(() => expect(screen.getByText(/kg/)).toBeTruthy());
  expect(screen.getByText(/50K\/kg/)).toBeTruthy();
});

it('does not replay an unresolved ballot from room A after switching the hook to room B', async () => {
  const roomA = makeSnapshot();
  const roomBId = '30000000-0000-4000-8000-000000000002';
  const roomB = makeSnapshot({
    roomId: roomBId,
    pool: roomA.pool.map((dish, i) => ({
      ...dish,
      roundDishId: `60000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    })),
  });
  const repo = makeRepository(roomA);
  repo.getSnapshot.mockImplementation(async (id: string) => ({ ok: true, data: id === roomId ? roomA : roomB }));
  repo.submitBallot.mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const votes = Object.fromEntries(roomA.pool.map(dish => [dish.roundDishId, 'OK' as const]));
  const view = await renderHook((props: unknown) => {
    const { activeRoomId } = props as { activeRoomId: string };
    return useRoundOneVoting({ repository: repo, roomId: activeRoomId, initialVotes: votes });
  }, { initialProps: { activeRoomId: roomId } });

  await waitFor(() => expect(view.result.current?.allVoted).toBe(true));
  await act(async () => view.result.current.handleSubmit());
  await view.rerender({ activeRoomId: roomBId });
  await waitFor(() => expect(repo.getSnapshot).toHaveBeenCalledWith(roomBId));
  await act(async () => {
    for (const dish of roomB.pool) view.result.current.handleVote(dish.roundDishId, 'OK');
  });
  await act(async () => view.result.current.handleSubmit());

  expect(repo.submitBallot).toHaveBeenCalledTimes(2);
  expect(repo.submitBallot.mock.calls[0][0].roomId).toBe(roomId);
  expect(repo.submitBallot.mock.calls[1][0].roomId).toBe(roomBId);
  expect(repo.submitBallot.mock.calls[1][0].requestId).not.toBe(repo.submitBallot.mock.calls[0][0].requestId);
  await view.unmount();
});

it('does not apply a delayed lower-version snapshot after a newer version', async () => {
  const s = makeSnapshot();
  const repo = makeRepository(s);
  repo.submitBallot.mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
  const votes = Object.fromEntries(s.pool.map(dish => [dish.roundDishId, 'OK' as const]));
  const view = await renderHook(() => useRoundOneVoting({ repository: repo, roomId, initialVotes: votes }));

  let oldResponse!: (value: unknown) => void;
  let newResponse!: (value: unknown) => void;
  repo.getSnapshot.mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; }));
  repo.getSnapshot.mockImplementationOnce(() => new Promise(resolve => { newResponse = resolve; }));
  let oldRead!: Promise<unknown>;
  let newRead!: Promise<unknown>;
  await act(async () => {
    oldRead = view.result.current.fetchSnapshot();
    newRead = view.result.current.fetchSnapshot();
  });
  await act(async () => {
    newResponse({ ok: true, data: makeSnapshot({ version: 9 }) });
    await newRead;
  });
  await act(async () => {
    oldResponse({ ok: true, data: makeSnapshot({ version: 8 }) });
    await oldRead;
  });
  await act(async () => view.result.current.handleSubmit());

  expect(repo.submitBallot.mock.calls[0][0].expectedVersion).toBe(9);
  await view.unmount();
});

it('ignores an old submit continuation after switching A → B → A', async () => {
  const snapshotA = makeSnapshot();
  const snapshotBId = '30000000-0000-4000-8000-000000000002';
  const candidates = mapSnapshotPoolToPoolDishes(snapshotA.pool);
  const repo = makeRepository(snapshotA);
  let resolveSubmit!: (value: unknown) => void;
  repo.submitBallot.mockImplementationOnce(() => new Promise(resolve => { resolveSubmit = resolve; }));
  const initialVotes = Object.fromEntries(candidates.map(dish => [dish.roundDishId, 'OK' as const]));
  const identityId = 'user-cycle';
  const scope = { identityId, roomId, round: 1 as const, poolVersion: 1 };

  const view = await renderHook((props: unknown) => {
    const { activeRoomId } = props as { activeRoomId: string };
    return useRoundOneVoting({
      repository: repo,
      roomId: activeRoomId,
      identityId,
      pool: candidates,
      initialVotes,
    });
  }, { initialProps: { activeRoomId: roomId } });

  let oldSubmission!: Promise<void>;
  await act(async () => { oldSubmission = view.result.current.handleSubmit(); });
  await waitFor(() => expect(repo.submitBallot).toHaveBeenCalledTimes(1));
  await view.rerender({ activeRoomId: snapshotBId });
  await view.rerender({ activeRoomId: roomId });

  await act(async () => {
    resolveSubmit({
      ok: true,
      requestId: 'late-request',
      data: {
        allMembersSubmitted: false,
        receipt: {
          round: 1,
          intentId: 'late-intent',
          requestId: 'late-request',
          submittedAt: new Date().toISOString(),
          voteCount: candidates.length,
        },
      },
    });
    await oldSubmission;
  });

  expect(getSubmissionReceipt(scope)).toBeNull();
  expect(view.result.current.submissionState).toBe('pending');
  await view.unmount();
});
