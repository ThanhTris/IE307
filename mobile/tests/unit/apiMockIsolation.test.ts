import { MockApiClient, MOCK_CURRENT_USER, SessionUser, RoomSnapshot, UserPreferences } from '../../src/data/api';

const roomId = 'room_mock_001';
const otherUser: SessionUser = { id: 'usr_tuan_002', displayName: 'Tuấn', isGuest: true,
  createdAt: '2026-10-11T12:00:00Z' };
const preferences: UserPreferences = { cuisineIds: ['cui_vietnam'], categoryIds: [], historyConsent: true };

async function snapshot(mock: MockApiClient, id = roomId): Promise<RoomSnapshot> {
  const result = await mock.getRoomSnapshot(id);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Fixture snapshot failed');
  return result.data;
}

async function start(mock: MockApiClient): Promise<RoomSnapshot> {
  const ready = await mock.setReady({ roomId, expectedVersion: (await snapshot(mock)).version, ready: true });
  expect(ready.ok).toBe(true);
  expect((await mock.startRound({ roomId, expectedVersion: (await snapshot(mock)).version })).ok).toBe(true);
  return snapshot(mock);
}

describe('GM-07 mock caller projection isolation', () => {
  it('hides the previous caller ballot and receipt when switching to another member, then restores the owner view', async () => {
    const mock = new MockApiClient({ delayMs: 0 });
    const voting = await start(mock);
    const request = { roomId, round: voting.round, poolVersion: voting.poolVersion, expectedVersion: voting.version,
      intentId: 'owner_intent', requestId: 'owner_request',
      votes: voting.pool.map(d => ({ roundDishId: d.roundDishId, vote: 'WANT' as const })) };
    const ack = await mock.submitBallot(request);
    expect(ack.ok).toBe(true);
    const owner = await snapshot(mock);
    expect(owner.ownSubmission?.intentId).toBe(request.intentId);
    expect(Object.keys(owner.ownVotes ?? {})).toHaveLength(voting.pool.length);

    mock.setCurrentUser(otherUser);
    const other = await snapshot(mock, 'GCD1');
    expect(other.ownVotes).toBeUndefined();
    expect(other.ownSubmission).toBeNull();
    expect(other.state).toBe(owner.state);
    expect(other.version).toBe(owner.version);
    expect(other.result).toEqual(owner.result);

    mock.setCurrentUser(MOCK_CURRENT_USER);
    expect((await snapshot(mock)).ownSubmission).toEqual(owner.ownSubmission);
    expect((await snapshot(mock)).ownVotes).toEqual(owner.ownVotes);
    expect(await mock.submitBallot(request)).toEqual(ack);
  });

  it('keeps each caller preferences and each room projection separate', async () => {
    const mock = new MockApiClient({ delayMs: 0 });
    expect((await mock.updatePreferences({ roomId, expectedVersion: 1, preferences, requestId: 'same_id' })).ok).toBe(true);
    const owner = await snapshot(mock);
    mock.setCurrentUser(otherUser);
    expect((await snapshot(mock)).ownPreferences).toBeUndefined();
    const otherPreferences = { ...preferences, cuisineIds: ['cui_korea'], historyConsent: false };
    expect((await mock.updatePreferences({ roomId, expectedVersion: owner.version,
      preferences: otherPreferences, requestId: 'same_id' })).ok).toBe(true);
    expect((await snapshot(mock)).ownPreferences).toEqual(otherPreferences);
    mock.setCurrentUser(MOCK_CURRENT_USER);
    expect((await snapshot(mock)).ownPreferences).toEqual(preferences);

    const created = await mock.createRoom({ displayName: 'Owner', context: owner.context });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('Fixture room creation failed');
    const separate = await snapshot(mock, created.data.roomId);
    expect(separate.ownPreferences).toBeUndefined();
    expect(separate.ownVotes).toBeUndefined();
    expect(separate.ownSubmission).toBeNull();
  });

  it('keeps two callers receipts independent, including the same requestId and two rounds', async () => {
    const mock = new MockApiClient({ delayMs: 0, scenario: 'round_two' });
    const first = await start(mock);
    const firstRequest = { roomId, round: first.round, poolVersion: first.poolVersion, expectedVersion: first.version,
      intentId: 'owner_round_1', requestId: 'shared_id',
      votes: first.pool.map(d => ({ roundDishId: d.roundDishId, vote: 'WANT' as const })) };
    const firstAck = await mock.submitBallot(firstRequest);
    expect(firstAck.ok).toBe(true);
    const owner = await snapshot(mock);
    expect(owner.round).toBe(2);
    mock.setCurrentUser(otherUser);
    const second = await snapshot(mock);
    expect(second.ownSubmission).toBeNull();
    expect(second.ownVotes).toBeUndefined();
    const secondRequest = { roomId, round: second.round, poolVersion: second.poolVersion, expectedVersion: second.version,
      intentId: 'other_round_2', requestId: 'shared_id',
      votes: second.pool.map(d => ({ roundDishId: d.roundDishId, vote: 'KEEP' as const })) };
    const secondAck = await mock.submitBallot(secondRequest);
    expect(secondAck.ok).toBe(true);
    expect((await snapshot(mock)).ownSubmission?.intentId).toBe('other_round_2');
    expect(await mock.submitBallot(secondRequest)).toEqual(secondAck);
    mock.setCurrentUser(MOCK_CURRENT_USER);
    expect((await snapshot(mock)).ownSubmission).toEqual(owner.ownSubmission);
    expect((await snapshot(mock)).ownVotes).toEqual(owner.ownVotes);
    expect(await mock.submitBallot(firstRequest)).toEqual(firstAck);
  });

  it('detaches private fields from request, ACK and snapshot objects', async () => {
    const mock = new MockApiClient({ delayMs: 0 });
    const input = { ...preferences, cuisineIds: ['original'] };
    expect((await mock.updatePreferences({ roomId, expectedVersion: 1, preferences: input })).ok).toBe(true);
    input.cuisineIds.push('mutated_request');
    expect((await snapshot(mock)).ownPreferences?.cuisineIds).toEqual(['original']);
    const voting = await start(mock);
    const ack = await mock.submitBallot({ roomId, round: voting.round, poolVersion: voting.poolVersion,
      expectedVersion: voting.version, intentId: 'original_intent',
      votes: voting.pool.map(d => ({ roundDishId: d.roundDishId, vote: 'WANT' })) });
    expect(ack.ok).toBe(true);
    if (!ack.ok || !ack.data.receipt) throw new Error('Fixture ballot failed');
    ack.data.receipt.intentId = 'mutated_ack';
    const returned = await snapshot(mock);
    if (!returned.ownSubmission || !returned.ownVotes || !returned.ownPreferences) throw new Error('Missing own fields');
    returned.ownSubmission.intentId = 'mutated_snapshot';
    returned.ownVotes[voting.pool[0]!.roundDishId] = 'NO';
    returned.ownPreferences.cuisineIds.push('mutated_snapshot');
    const fresh = await snapshot(mock);
    expect(fresh.ownSubmission?.intentId).toBe('original_intent');
    expect(fresh.ownVotes?.[voting.pool[0]!.roundDishId]).toBe('WANT');
    expect(fresh.ownPreferences?.cuisineIds).toEqual(['original']);
  });
});
