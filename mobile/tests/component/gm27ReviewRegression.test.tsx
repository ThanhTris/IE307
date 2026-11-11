import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LiveDishResultScreen } from '../../src/features/result/screens/LiveDishResultScreen';
import { LiveResultRepository, mapRawToScoredResult, mapRawToResultDish } from '../../src/features/result/services/resultRepository';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import type { ResultRepository } from '../../src/features/result/services/resultRepository';
import type { ScoredResult } from '../../src/features/result/services/resultPresentation';
import type { RoomRepository } from '../../src/features/rooms/services/roomRepository';

jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: jest.fn() }));

const dish = {
  dishId: '00000000-0000-4000-8000-000000000010',
  roundDishId: '00000000-0000-4000-8000-000000000020',
  name: 'Món kết quả phòng A', description: null, artwork: null, priceReference: null,
};
const result: ScoredResult = {
  resultId: '00000000-0000-4000-8000-000000000100',
  contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
  policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
  status: 'DECIDED', round: 2, winner: dish, reasonCode: 'ACCEPTABLE_FINAL',
  finalizedAt: '2026-11-06T10:00:00Z', round1BallotCount: 3,
  scoreVersion: 'want2-ok1-round1-v1', rankingVersion: 'score-desc-dense-rank-v1',
  topDishes: [{ dish, score: 6, rank: 1, isWinner: true }],
};
// Match the now-required raw poolDish fields; presentation expectations stay unchanged.
const clone = () => {
  const raw = JSON.parse(JSON.stringify(result));
  const enrich = (value: Record<string, unknown>) => Object.assign(value, {
    mealSlots: ['lunch'], cuisineIds: [], cuisineLabels: [], categoryIds: [], categoryLabels: [], temperature: null, flavor: null,
  });
  enrich(raw.winner);
  for (const item of raw.topDishes) enrich(item.dish);
  return raw;
};
const props = { roomId: 'room-a', onHome: jest.fn(), onNewSession: jest.fn() };
const repo = (getResult: jest.Mock, rest: Partial<ResultRepository> = {}): ResultRepository => ({
  getResult, getScoredResult: jest.fn(), ...rest,
});
async function dismissCelebration() {
  const button = await screen.findByText('Chạm để bỏ qua');
  await fireEvent.press(button);
}

beforeEach(() => {
  jest.mocked(useRoomRepository).mockReturnValue({ mode: 'real', user: { id: 'user-a' } } as any);
});
afterEach(() => jest.useRealTimers());

describe('PR157 reviewer contract regression', () => {
  const serverRows: unknown[] = require('../fixtures/gm27/qa-projections.json');
  test.each(serverRows.map((value, index) => ({ value, index })))('accepts persisted QA server projection $index as control', ({ value }) => {
    expect(mapRawToScoredResult(value)).not.toBeNull();
  });
  test('accepts the intact canonical result as control', () => {
    expect(mapRawToScoredResult(clone())).toEqual(result);
  });
  test.each(['contractVersion', 'policyVersion', 'scoreVersion', 'rankingVersion'])('rejects canonical response missing %s', key => {
    const raw = clone(); delete raw[key];
    expect(mapRawToScoredResult(raw)).toBeNull();
  });
  test.each(['scoreVersion', 'rankingVersion'])('rejects unknown %s rather than rewriting it', key => {
    const raw = clone(); raw[key] = 'unsupported-v99';
    expect(mapRawToScoredResult(raw)).toBeNull();
  });
  test('rejects missing roundDishId instead of manufacturing an ID', () => {
    const raw = clone(); delete raw.winner.roundDishId; delete raw.topDishes[0].dish.roundDishId;
    expect(mapRawToScoredResult(raw)).toBeNull();
  });
  test('rejects NO_CONSENSUS containing a winner and nonempty podium', () => {
    const raw = { ...clone(), status: 'NO_CONSENSUS', reasonCode: 'ALL_REMOVED' };
    expect(mapRawToScoredResult(raw)).toBeNull();
  });
  test('does not invent a price source when sourceRef is null', () => {
    const mapped = mapRawToResultDish({ ...clone().winner, priceReference: {
      amount: 10, currency: 'USD', unit: 'portion', sourceRef: null,
      checkedAt: '2026-11-06T10:00:00Z',
    } });
    expect(mapped?.priceReference?.sourceRef).not.toBe('Menu');
  });
  test('rechecks NOT_READY instead of becoming an unrecoverable spinner', async () => {
    const read = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: { messageKey: 'NOT_READY' } })
      .mockResolvedValue({ ok: true, data: { capability: 'scored-v4', result } });
    await render(<LiveDishResultScreen {...props} repository={repo(read)} pollIntervalMs={200} />);
    expect(screen.getByLabelText('Đang chốt kết quả')).toBeOnTheScreen();
    await waitFor(() => expect(read.mock.calls.length).toBeGreaterThan(1));
  });
  test('clears room A result while opening room B', async () => {
    const read = jest.fn().mockResolvedValueOnce({ ok: true, data: { capability: 'scored-v4', result } })
      .mockReturnValue(new Promise(() => {}));
    const repository = repo(read);
    const view = await render(<LiveDishResultScreen {...props} repository={repository} />);
    await dismissCelebration();
    expect(screen.getAllByText(dish.name).length).toBeGreaterThan(0);
    await view.rerender(<LiveDishResultScreen {...props} roomId="room-b" repository={repository} />);
    expect(screen.queryAllByText(dish.name)).toEqual([]);
    expect(screen.getByLabelText('Đang tải kết quả')).toBeOnTheScreen();
  });
  test('renders an error and retry when Places returns ok:false', async () => {
    const read = jest.fn().mockResolvedValue({ ok: true, data: { capability: 'scored-v4', result } });
    const fetchPlaces = jest.fn().mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    await render(<LiveDishResultScreen {...props} repository={repo(read, { fetchNearbyPlaces: fetchPlaces })} />);
    await dismissCelebration();
    expect(screen.getByText(/Không tải được danh sách quán|Bạn đang ngoại tuyến/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Thử lại( tìm quán)?$/ })).toBeEnabled();
    expect(screen.getAllByText(dish.name).length).toBeGreaterThan(0);
  });
  test('does not leave Places loading forever after failed retry', async () => {
    const read = jest.fn().mockResolvedValue({ ok: true, data: { capability: 'scored-v4', result } });
    const fetchPlaces = jest.fn()
      .mockResolvedValueOnce({ ok: true, data: { resultId: result.resultId, winnerDishId: dish.dishId, status: 'error', places: [], fetchedAt: null } })
      .mockResolvedValue({ ok: false, error: { messageKey: 'NETWORK_ERROR' } });
    await render(<LiveDishResultScreen {...props} repository={repo(read, { fetchNearbyPlaces: fetchPlaces })} />);
    await dismissCelebration();
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
    expect(screen.queryByLabelText('Đang tìm quán')).toBeNull();
    expect(screen.getByRole('button', { name: /^Thử lại( tìm quán)?$/ })).toBeEnabled();
  });
  test('honors a forced access rejection rather than keeping an authorized result in cache', async () => {
    const rpc = jest.fn().mockResolvedValueOnce({ ok: true, data: clone() })
      .mockResolvedValue({ ok: false, error: { messageKey: 'NOT_MEMBER' } });
    const repository = new LiveResultRepository({ rpcCaller: rpc });
    expect((await repository.getResult('room-a')).ok).toBe(true);
    expect((await repository.getResult('room-a', { forceRefetch: true })).ok).toBe(false);
    const next = await repository.getResult('room-a');
    expect(next.ok).toBe(false);
  });
});

describe('PR157 follow-up identity and invalidation paths', () => {
  test('the production roomRepository composition partitions cache using the active identity', async () => {
    let identity = 'identity-a';
    const rpc = jest.fn().mockImplementation(async () => identity === 'identity-a'
      ? { ok: true, data: clone() }
      : { ok: false, error: { messageKey: 'NOT_MEMBER' } });
    const roomRepository = {
      getCurrentUser: () => ({ id: identity }),
      getRpcCaller: () => rpc,
    } as unknown as RoomRepository;
    // Same constructor arguments as LiveDishResultScreen; no test-only identity callback.
    const repository = new LiveResultRepository({ roomRepository });
    expect((await repository.getResult('room-a')).ok).toBe(true);
    identity = 'identity-b';
    const asB = await repository.getResult('room-a');
    expect(asB.ok).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  test.each([401, 403])('HTTP %i rejection invalidates the old authorized cache', async status => {
    const rpc = jest.fn().mockResolvedValueOnce({ ok: true, data: clone() })
      .mockRejectedValue({ status, body: { messageKey: 'AUTH_REQUIRED' } });
    const repository = new LiveResultRepository({ rpcCaller: rpc });
    expect((await repository.getResult('room-a')).ok).toBe(true);
    expect(await repository.getResult('room-a', { forceRefetch: true }))
      .toMatchObject({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } });
    expect((await repository.getResult('room-a')).ok).toBe(false);
  });

  test('clearCache prevents a pending old response from restoring private cache', async () => {
    let resolve!: (value: unknown) => void;
    const pendingResponse = new Promise(r => { resolve = r; });
    const rpc = jest.fn().mockReturnValueOnce(pendingResponse)
      .mockResolvedValue({ ok: false, error: { messageKey: 'NOT_MEMBER' } });
    const repository = new LiveResultRepository({ rpcCaller: rpc, getCurrentIdentity: () => 'identity-a' });
    const pending = repository.getResult('room-a');
    repository.clearCache();
    resolve({ ok: true, data: clone() });
    await pending;
    const next = await repository.getResult('room-a');
    expect(next.ok).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  test('a response invalidated while pending is rejected before it can update UI', async () => {
    let resolve!: (value: unknown) => void;
    const pendingResponse = new Promise(r => { resolve = r; });
    const repository = new LiveResultRepository({ rpcCaller: jest.fn().mockReturnValue(pendingResponse) });
    const pending = repository.getResult('room-a');
    repository.invalidateRoom('room-a');
    resolve({ ok: true, data: clone() });
    expect((await pending).ok).toBe(false);
  });

  test.each(['winner', 'topDishes', 'scoreVersion', 'rankingVersion'])('NO_CONSENSUS rejects a missing mandatory %s field', key => {
    const raw = {
      ...clone(), status: 'NO_CONSENSUS', reasonCode: 'ALL_REMOVED',
      winner: null, topDishes: [], scoreVersion: null, rankingVersion: null,
    };
    delete raw[key];
    expect(mapRawToScoredResult(raw)).toBeNull();
  });
});
