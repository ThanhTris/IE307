import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { LiveDishResultScreen } from '../../src/features/result/screens/LiveDishResultScreen';
import { DishResultEntry } from '../../src/bootstrap/DishResultEntry';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import {
  LiveResultRepository,
  createMockResultRepository,
} from '../../src/features/result/services/resultRepository';
import type { ScoredResult } from '../../src/features/result/services/resultPresentation';
import { completeNativeAnimations } from '../helpers/completeNativeAnimations';

jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({
  useRoomRepository: jest.fn(),
}));

jest.mock('../../src/features/auth/components/RequireActiveSession', () => ({
  RequireActiveSession: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Ensure React 19 act environment is recognized in Jest
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('LiveDishResultScreen & DishResultEntry Component Tests', () => {
  const decidedResult: ScoredResult = {
    resultId: '00000000-0000-4000-8000-000000000100',
    contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
    policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
    status: 'DECIDED',
    round: 2,
    reasonCode: 'ACCEPTABLE_FINAL',
    finalizedAt: '2026-11-06T10:05:00Z',
    scoreVersion: 'want2-ok1-round1-v1',
    rankingVersion: 'score-desc-dense-rank-v1',
    round1BallotCount: 3,
    winner: {
      dishId: '00000000-0000-4000-8000-000000000010',
      roundDishId: '00000000-0000-4000-8000-000000000020',
      name: 'Phở bò tái nạm',
      description: 'Phở bò truyền thống',
      mealSlots: ['lunch', 'dinner'],
    cuisineIds: [], cuisineLabels: [], categoryIds: [], categoryLabels: [], temperature: null, flavor: null,
      artwork: null,
      priceReference: {
        amount: 65000,
        currency: 'VND',
        unit: 'portion',
        servingSize: null,
        sourceRef: 'Menu',
        checkedAt: '2026-11-06T10:00:00Z',
      },
    } as any,
    topDishes: [
      {
        dish: {
          dishId: '00000000-0000-4000-8000-000000000010',
          roundDishId: '00000000-0000-4000-8000-000000000020',
          name: 'Phở bò tái nạm',
          description: 'Phở bò truyền thống',
          mealSlots: ['lunch', 'dinner'],
    cuisineIds: [], cuisineLabels: [], categoryIds: [], categoryLabels: [], temperature: null, flavor: null,
          artwork: null,
          priceReference: {
            amount: 65000,
            currency: 'VND',
            unit: 'portion',
            servingSize: null,
            sourceRef: 'Menu',
            checkedAt: '2026-11-06T10:00:00Z',
          },
        } as any,
        score: 6,
        rank: 1,
        isWinner: true,
      },
      {
        dish: {
          dishId: '00000000-0000-4000-8000-000000000011',
          roundDishId: '00000000-0000-4000-8000-000000000021',
          name: 'Cơm tấm sườn bì',
          description: null,
          mealSlots: ['lunch'],
    cuisineIds: [], cuisineLabels: [], categoryIds: [], categoryLabels: [], temperature: null, flavor: null,
          artwork: null,
          priceReference: null,
        } as any,
        score: 5,
        rank: 2,
        isWinner: false,
      },
    ],
  };

  const noConsensusR1: ScoredResult = {
    resultId: '00000000-0000-4000-8000-000000000101',
    contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
    policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
    status: 'NO_CONSENSUS',
    round: 1,
    reasonCode: 'EMPTY_INTERSECTION',
    finalizedAt: '2026-11-06T10:05:00Z',
    scoreVersion: null,
    rankingVersion: null,
    round1BallotCount: 3,
    winner: null,
    topDishes: [],
  };

  const noConsensusR2: ScoredResult = {
    resultId: '00000000-0000-4000-8000-000000000102',
    contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
    policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
    status: 'NO_CONSENSUS',
    round: 2,
    reasonCode: 'ALL_REMOVED',
    finalizedAt: '2026-11-06T10:05:00Z',
    scoreVersion: null,
    rankingVersion: null,
    round1BallotCount: 3,
    winner: null,
    topDishes: [],
  };

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    completeNativeAnimations();
    jest.mocked(useRoomRepository).mockReturnValue({
      mode: 'real',
      user: { id: 'user_1', displayName: 'Tuấn' },
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('renders DECIDED result with Top 3 podium, winner and price', async () => {
    const repo = createMockResultRepository({
      initialResult: decidedResult,
    });

    await render(
      <LiveDishResultScreen
        roomId="room_123"
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    // Dismiss celebration modal if visible
    const dismiss = screen.queryByText('Chạm để bỏ qua');
    if (dismiss) {
      fireEvent.press(dismiss);
    }

    expect(within(screen.getByTestId('podium-group-1')).getByLabelText(/Phở bò tái nạm.* · Món chiến thắng$/)).toBeOnTheScreen();
    expect(screen.getByText('Cơm tấm sườn bì')).toBeOnTheScreen();
    expect(screen.getAllByText('6 điểm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5 điểm')).toBeOnTheScreen();
  });

  test('renders NO_CONSENSUS round 1 (EMPTY_INTERSECTION)', async () => {
    const repo = createMockResultRepository({
      initialResult: noConsensusR1,
    });

    await render(
      <LiveDishResultScreen
        roomId="room_123"
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    expect(screen.getByText('Không thể chốt được món ăn')).toBeOnTheScreen();
    expect(screen.getByText(/Không còn món phù hợp sau lượt chọn Vòng/)).toBeOnTheScreen();
  });

  test('renders NO_CONSENSUS round 2 (ALL_REMOVED)', async () => {
    const repo = createMockResultRepository({
      initialResult: noConsensusR2,
    });

    await render(
      <LiveDishResultScreen
        roomId="room_123"
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    expect(screen.getByText('Chưa chọn được món')).toBeOnTheScreen();
    expect(screen.getByText('Không còn món phù hợp sau Vòng 2.')).toBeOnTheScreen();
  });

  test('renders error state with retry button on failure', async () => {
    let shouldFail = true;
    const repo = {
      getResult: jest.fn().mockImplementation(async () => {
        if (shouldFail) {
          return { ok: false, error: { messageKey: 'NETWORK_ERROR' } };
        }
        return { ok: true, data: { capability: 'scored-v4' as const, result: decidedResult } };
      }),
      getScoredResult: jest.fn(),
    };

    await render(
      <LiveDishResultScreen
        roomId="room_123"
        repository={repo as any}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    expect(screen.getByText('Chưa tải được kết quả')).toBeOnTheScreen();
    const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
    expect(retryBtn).toBeOnTheScreen();

    // Click retry
    shouldFail = false;
    fireEvent.press(retryBtn);

    const dismiss = await screen.findByText('Chạm để bỏ qua');
    fireEvent.press(dismiss);

    expect(within(screen.getByTestId('podium-group-1')).getByLabelText(/Phở bò tái nạm.* · Món chiến thắng$/)).toBeOnTheScreen();
  });

  test('places error does not alter winner display', async () => {
    const repo = createMockResultRepository({
      initialResult: decidedResult,
      nearbyStatus: 'error',
      places: [],
    });

    await render(
      <LiveDishResultScreen
        roomId="room_123"
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    const dismiss = screen.queryByText('Chạm để bỏ qua');
    if (dismiss) {
      fireEvent.press(dismiss);
    }

    // Winner and podium are intact despite places error
    expect(within(screen.getByTestId('podium-group-1')).getByLabelText(/Phở bò tái nạm.* · Món chiến thắng$/)).toBeOnTheScreen();
    expect(screen.getByText('Cơm tấm sườn bì')).toBeOnTheScreen();
    expect(screen.getByText('Không tải được danh sách quán')).toBeOnTheScreen();
  });

  test('polls NOT_READY and transitions to DECIDED when server finalizes', async () => {
    let attempts = 0;
    const repo = {
      getResult: jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          return { ok: false, error: { messageKey: 'NOT_READY' } };
        }
        return { ok: true, data: { capability: 'scored-v4' as const, result: decidedResult } };
      }),
    };

    await render(
      <LiveDishResultScreen
        roomId="room_poll"
        repository={repo as any}
        pollIntervalMs={30}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    expect(screen.getByText('Đang chốt kết quả')).toBeOnTheScreen();
    expect(repo.getResult).toHaveBeenCalledTimes(1);

    // Wait for the short poll to tick
    await new Promise(r => setTimeout(r, 80));

    expect(repo.getResult).toHaveBeenCalledTimes(2);

    const dismiss = await screen.findByText('Chạm để bỏ qua');
    fireEvent.press(dismiss);
    expect(within(screen.getByTestId('podium-group-1')).getByLabelText(/Phở bò tái nạm.* · Món chiến thắng$/)).toBeOnTheScreen();
  });

  test('cancels NOT_READY poll timer upon unmount', async () => {
    const repo = {
      getResult: jest.fn().mockResolvedValue({ ok: false, error: { messageKey: 'NOT_READY' } }),
    };

    const { unmount } = await render(
      <LiveDishResultScreen
        roomId="room_poll_unmount"
        repository={repo as any}
        pollIntervalMs={50}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    expect(screen.getByText('Đang chốt kết quả')).toBeOnTheScreen();
    expect(repo.getResult).toHaveBeenCalled();
    const callsBeforeUnmount = repo.getResult.mock.calls.length;

    await unmount();

    await new Promise(r => setTimeout(r, 120));
    expect(repo.getResult).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  test('room switch immediately resets UI and does not leak room A winner into room B', async () => {
    let resolveA: (val: any) => void;
    const promiseA = new Promise(resolve => {
      resolveA = resolve;
    });

    let resolveB: (val: any) => void;
    const promiseB = new Promise(resolve => {
      resolveB = resolve;
    });

    const repo = {
      getResult: jest.fn().mockImplementation((roomId: string) => {
        if (roomId === 'room_A') return promiseA;
        if (roomId === 'room_B') return promiseB;
        return Promise.reject(new Error('Unknown room'));
      }),
    };

    function TestHost({ roomId }: { roomId: string }) {
      return (
        <LiveDishResultScreen
          key={roomId}
          roomId={roomId}
          repository={repo as any}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );
    }

    const { rerender } = await render(<TestHost roomId="room_A" />);

    // Initially loading room A
    expect(screen.getByText('Đang tải kết quả')).toBeOnTheScreen();

    // Switch to room B before room A resolves
    await rerender(<TestHost roomId="room_B" />);

    // Room B is immediately in loading state
    expect(screen.getByText('Đang tải kết quả')).toBeOnTheScreen();

    // Late response for room A arrives
    resolveA!({
      ok: true,
      data: { capability: 'scored-v4' as const, result: decidedResult },
    });

    // Room A response must be ignored; room A winner must NOT leak into room B
    expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
    expect(screen.getByText('Đang tải kết quả')).toBeOnTheScreen();

    // Now resolve room B
    resolveB!({
      ok: true,
      data: {
        capability: 'scored-v4' as const,
        result: {
          ...decidedResult,
          resultId: 'res_B',
          winner: { ...decidedResult.winner!, name: 'Bún chả Hà Nội' },
          topDishes: [{ ...decidedResult.topDishes[0]!, dish: { ...decidedResult.topDishes[0]!.dish, name: 'Bún chả Hà Nội' } }],
        },
      },
    });

    const dismissB = await screen.findByText('Chạm để bỏ qua');
    fireEvent.press(dismissB);
    expect(screen.getAllByText('Bún chả Hà Nội').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
  });

  test('initial Places failure shows error card with retry button, and retry failure does not lock spinner', async () => {
    let failPlaces = true;
    const mockFetchNearbyPlaces = jest.fn().mockImplementation(async () => {
      if (failPlaces) {
        return { ok: false, error: { messageKey: 'NETWORK_ERROR' } };
      }
      return {
        ok: true,
        data: {
          resultId: decidedResult.resultId,
          winnerDishId: decidedResult.winner!.dishId,
          status: 'ready',
          places: [
            {
              id: 'p1',
              name: 'Quán Phở Thìn 13 Lò Đúc',
              address: '13 Lò Đúc, Hà Nội',
              distanceM: 500,
              latitude: 21.018,
              longitude: 105.856,
              attribution: null,
            },
          ],
          fetchedAt: '2026-11-06T10:10:00Z',
        },
      };
    });

    const repo = {
      getResult: jest.fn().mockResolvedValue({ ok: true, data: { capability: 'scored-v4' as const, result: decidedResult } }),
      fetchNearbyPlaces: mockFetchNearbyPlaces,
    };

    await render(
      <LiveDishResultScreen
        roomId="room_places"
        repository={repo as any}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    const dismiss = screen.queryByText('Chạm để bỏ qua');
    if (dismiss) {
      fireEvent.press(dismiss);
    }

    // Initial failure must display offline error notice and retry button (not unsupported card!)
    expect(await screen.findByText('Bạn đang ngoại tuyến')).toBeOnTheScreen();
    const retryBtn = await screen.findByRole('button', { name: 'Thử lại tìm quán' });
    expect(retryBtn).toBeOnTheScreen();

    // Press retry while still failing
    fireEvent.press(retryBtn);

    // Wait a tick for useResultAction to release lock
    await new Promise(r => setTimeout(r, 50));

    // Must still show retry button and not get stuck in infinite spinner
    const retryBtnAfterFail = await screen.findByRole('button', { name: 'Thử lại tìm quán' });
    expect(retryBtnAfterFail).toBeOnTheScreen();

    // Now succeed on retry
    failPlaces = false;
    fireEvent.press(retryBtnAfterFail);

    expect(await screen.findByText('Quán Phở Thìn 13 Lò Đúc')).toBeOnTheScreen();
  });

  test('renders one shared score in each pedestal when dishes tie', async () => {
    const tieResult: ScoredResult = {
      ...decidedResult,
      round1BallotCount: 4, // max score = 2 * 4 = 8
      topDishes: [
        {
          dish: decidedResult.winner!,
          score: 8,
          rank: 1,
          isWinner: true,
        },
        {
          dish: {
            dishId: '00000000-0000-4000-8000-000000000011',
            roundDishId: '00000000-0000-4000-8000-000000000021',
            name: 'Bún chả Hà Nội',
            description: null,
            artwork: null,
            priceReference: null,
          },
          score: 8,
          rank: 1,
          isWinner: false,
        },
        {
          dish: {
            dishId: '00000000-0000-4000-8000-000000000012',
            roundDishId: '00000000-0000-4000-8000-000000000022',
            name: 'Cơm tấm sườn bì',
            description: null,
            artwork: null,
            priceReference: null,
          },
          score: 6,
          rank: 2,
          isWinner: false,
        },
      ],
    };

    const repo = createMockResultRepository({ initialResult: tieResult });

    await render(
      <LiveDishResultScreen
        roomId="room_tie"
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    const dismiss = await screen.findByText('Chạm để bỏ qua');
    fireEvent.press(dismiss);

    const first = within(screen.getByTestId('podium-group-1'));
    expect(first.getAllByText('8 điểm')).toHaveLength(1);
    expect(within(first.getByTestId('podium-bar-1')).getByText('8 điểm')).toBeOnTheScreen();
    expect(within(screen.getByTestId('podium-bar-2')).getByText('6 điểm')).toBeOnTheScreen();
  });

  test('external actions return ok: false pending GM-30', async () => {
    const repo = createMockResultRepository({ initialResult: decidedResult });

    await render(
      <LiveDishResultScreen
        roomId="room_ext"
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    const dismiss = await screen.findByText('Chạm để bỏ qua');
    fireEvent.press(dismiss);

    const mapsBtn = await screen.findByText('Mở bản đồ');
    fireEvent.press(mapsBtn);

    // Displays not yet supported message from useResultAction
    expect(await screen.findByText(/Đã nhận yêu cầu của bạn|Mô phỏng · Mở bản đồ|Chưa thực hiện được thao tác/)).toBeOnTheScreen();
  });

  test('renders result when resultId matches server response (GM-28 navigation)', async () => {
    const repo = createMockResultRepository({ initialResult: decidedResult });
    await render(
      <LiveDishResultScreen
        roomId="room_res_match"
        resultId={decidedResult.resultId}
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );
    const dismiss = await screen.findByText('Chạm để bỏ qua');
    fireEvent.press(dismiss);
    expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
  });

  test('transitions to error notice when resultId does not match server response', async () => {
    const repo = createMockResultRepository({ initialResult: decidedResult });
    await render(
      <LiveDishResultScreen
        roomId="room_res_mismatch"
        resultId="00000000-0000-4000-8000-999999999999"
        repository={repo}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );
    expect(await screen.findByText('Thử lại')).toBeOnTheScreen();
    expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
  });

  test('transitions to error notice when resultId does not match legacy-unscored-v1 response', async () => {
    const legacyResult = {
      resultId: '00000000-0000-4000-8000-000000000001',
      roomId: 'room_legacy_mismatch',
      round: 1 as const,
      winnerRoundDishId: '00000000-0000-4000-8000-000000000020',
      winnerDish: decidedResult.winner as any,
      reasonCode: 'UNANIMOUS_WANT' as const,
      matchTier: 'EXACT' as const,
      finalizedAt: '2026-11-06T10:05:00Z',
      policyVersion: 'decision-v2' as const,
    };
    const repo = {
      getResult: jest.fn().mockResolvedValue({
        ok: true,
        data: { capability: 'legacy-unscored-v1' as const, result: legacyResult },
      }),
      getScoredResult: jest.fn(),
    };
    await render(
      <LiveDishResultScreen
        roomId="room_legacy_mismatch"
        resultId="00000000-0000-4000-8000-999999999999"
        repository={repo as any}
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );
    expect(await screen.findByRole('button', { name: 'Th\u1eed l\u1ea1i' })).toBeOnTheScreen();
    expect(screen.queryByText('Phơ bò tái nạm')).toBeNull();
  });

  test('default composition wiring uses user identity from roomRepository', async () => {
    const mockRpc = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        resultId: '00000000-0000-4000-8000-000000000100',
        contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
        policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
        status: 'DECIDED',
        round: 2,
        reasonCode: 'ACCEPTABLE_FINAL',
        finalizedAt: '2026-11-06T10:05:00Z',
        scoreVersion: 'want2-ok1-round1-v1',
        rankingVersion: 'score-desc-dense-rank-v1',
        round1BallotCount: 3,
        winner: decidedResult.winner,
        topDishes: decidedResult.topDishes,
      },
    });

    jest.mocked(useRoomRepository).mockReturnValue({
      mode: 'real',
      user: { id: 'user_live_real' },
      repository: {
        getCurrentUser: () => ({ id: 'user_live_real' }),
        getRpcCaller: () => mockRpc,
      },
    } as any);

    await render(
      <LiveDishResultScreen
        roomId="room_default_composition"
        onHome={jest.fn()}
        onNewSession={jest.fn()}
      />
    );

    const dismiss = await screen.findByText('Chạm để bỏ qua');
    fireEvent.press(dismiss);
    expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
  });

  describe('DishResultEntry integration', () => {
    test('renders LiveDishResultScreen in real mode when roomId is provided', async () => {
      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <DishResultEntry
          roomId="room_123"
          repository={repo}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
          onLegacyNewSession={jest.fn()}
          onOtherScreen={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      expect(within(screen.getByTestId('podium-group-1')).getByLabelText(/Phở bò tái nạm.* · Món chiến thắng$/)).toBeOnTheScreen();
    });

    test('renders StatusNotice in real mode when roomId is missing', async () => {
      await render(
        <DishResultEntry
          onHome={jest.fn()}
          onNewSession={jest.fn()}
          onLegacyNewSession={jest.fn()}
          onOtherScreen={jest.fn()}
        />
      );

      expect(screen.getByText('Chưa thể mở kết quả')).toBeOnTheScreen();
      expect(screen.getByText('Hãy quay lại trang chủ để kiểm tra trạng thái phòng của bạn.')).toBeOnTheScreen();
    });

    test('DishResultEntry forwards resultId prop in real mode', async () => {
      const repo = createMockResultRepository({ initialResult: decidedResult });
      await render(
        <DishResultEntry
          roomId="room_entry_res_id"
          resultId={decidedResult.resultId}
          repository={repo}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
          onLegacyNewSession={jest.fn()}
          onOtherScreen={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);
      expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
    });

    test('cleans up default repository session listener on unmount', async () => {
      const mockUnsubscribe = jest.fn();
      const mockSubscribe = jest.fn().mockReturnValue(mockUnsubscribe);
      const mockRoomRepo = {
        getCurrentUser: jest.fn().mockReturnValue({ id: 'user_1' }),
        subscribeSession: mockSubscribe,
        getRpcCaller: jest.fn().mockReturnValue(jest.fn().mockResolvedValue({ ok: true, data: decidedResult })),
      };

      jest.mocked(useRoomRepository).mockReturnValue({
        mode: 'real',
        user: { id: 'user_1', displayName: 'Tuấn' },
        repository: mockRoomRepo as any,
      } as any);

      const view = await render(
        <LiveDishResultScreen
          roomId="room_listener_test"
          onHome={jest.fn()}
          onNewSession={jest.fn()}
          onOtherScreen={jest.fn()}
        />
      );

      expect(mockSubscribe).toHaveBeenCalled();
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      await act(async () => {
        view.unmount();
      });

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    test('does NOT dispose externally injected customRepository on unmount', async () => {
      const mockDispose = jest.fn();
      const customRepo = createMockResultRepository({ initialResult: decidedResult });
      customRepo.dispose = mockDispose;

      const view = await render(
        <LiveDishResultScreen
          roomId="room_custom_test"
          repository={customRepo}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
          onOtherScreen={jest.fn()}
        />
      );

      await act(async () => {
        view.unmount();
      });

      expect(mockDispose).not.toHaveBeenCalled();
    });

    test('FetchTransport HTTP 409 RESULT_NOT_READY throw continues polling backoff', async () => {
      let callCount = 0;
      const mockRpc = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject({
            status: 409,
            body: {
              ok: false,
              error: {
                messageKey: 'RESULT_NOT_READY',
              },
            },
          });
        }
        return Promise.resolve({
          ok: true,
          data: decidedResult,
        });
      });

      const repo = new LiveResultRepository({ rpcCaller: mockRpc });

      await render(
        <LiveDishResultScreen
          roomId="room_polling_409"
          repository={repo}
          pollIntervalMs={40}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
          onOtherScreen={jest.fn()}
        />
      );

      // Advance timers / wait for next poll if not already completed
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verifies that polling retry succeeded (called twice) rather than stopping at 409 error
      expect(callCount).toBe(2);

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);
      expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
    });

    test('placesConfig passes through simulated Places in QA and preserves winner & Top 3 podium', async () => {
      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <LiveDishResultScreen
          roomId="room_places_sim"
          repository={repo}
          placesConfig={{ isDevSimulated: true }}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      // Verifies winner and Top 3 are preserved
      expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
      expect(screen.getByText('Cơm tấm sườn bì')).toBeTruthy();

      // Verifies simulated places are displayed
      expect(await screen.findByText(/Dữ liệu mô phỏng trên máy ảo AVD/)).toBeTruthy();
    });

    test('placesConfig passes through real Places mode (no key) and preserves winner & Top 3 podium', async () => {
      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <LiveDishResultScreen
          roomId="room_places_real_nokey"
          repository={repo}
          placesConfig={{ isDevSimulated: false, apiKey: '' }}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      // Verifies winner and Top 3 are strictly preserved in real mode even with no key
      expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
      expect(screen.getByText('Cơm tấm sườn bì')).toBeTruthy();
      expect(await screen.findByText('Chưa thể hiển thị bản đồ')).toBeTruthy();
    });

    test('DishResultEntry forwards placesConfig to LiveDishResultScreen in real mode', async () => {
      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <DishResultEntry
          roomId="room_entry_places"
          repository={repo}
          placesConfig={{ isDevSimulated: true }}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
          onLegacyNewSession={jest.fn()}
          onOtherScreen={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
      expect(await screen.findByText(/Dữ liệu mô phỏng trên máy ảo AVD/)).toBeTruthy();
    });

    test('default map renderer renders map canvas, markers, and updates selected place on marker press', async () => {
      const placesRepo = {
        fetchNearbyPlaces: jest.fn().mockResolvedValue({
          ok: true,
          data: {
            resultId: decidedResult.resultId,
            winnerDishId: decidedResult.winner!.dishId,
            status: 'ready',
            places: [
              {
                id: 'place_01',
                name: 'Quán Phở 1',
                address: '100 Lê Lợi',
                distanceM: 200,
                latitude: 10.776,
                longitude: 106.700,
                attribution: 'Dữ liệu mô phỏng trên máy ảo AVD',
              },
              {
                id: 'place_02',
                name: 'Quán Phở 2',
                address: '200 Nguyễn Huệ',
                distanceM: 450,
                latitude: 10.774,
                longitude: 106.703,
                attribution: 'Dữ liệu mô phỏng trên máy ảo AVD',
              },
            ],
            fetchedAt: '2026-11-08T10:00:00Z',
          },
        }),
      };

      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <LiveDishResultScreen
          roomId="room_default_map"
          repository={repo}
          placesRepository={placesRepo as any}
          placesConfig={{ isDevSimulated: true }}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      // Verify default map canvas is rendered
      expect(await screen.findByTestId('result-map-canvas')).toBeTruthy();

      // Verify AVD simulation badge is shown
      expect(screen.getByTestId('avd-simulation-badge')).toBeTruthy();

      // Verify markers for both places are rendered
      const marker1 = screen.getByTestId('result-map-marker-place_01');
      const marker2 = screen.getByTestId('result-map-marker-place_02');
      expect(marker1).toBeTruthy();
      expect(marker2).toBeTruthy();

      // Initially place 1 is selected
      expect(screen.getAllByText('Quán Phở 1').length).toBeGreaterThan(0);

      // Press marker 2 to select place 2
      fireEvent.press(marker2);
      expect((await screen.findAllByText('Quán Phở 2')).length).toBeGreaterThan(0);
    });

    test('live map renderer renders Google Static Maps image when apiKey and coordinates exist', async () => {
      const placesRepo = {
        fetchNearbyPlaces: jest.fn().mockResolvedValue({
          ok: true,
          data: {
            resultId: decidedResult.resultId,
            winnerDishId: decidedResult.winner!.dishId,
            status: 'ready',
            places: [
              {
                id: 'place_live_01',
                name: 'Quán Phở Live',
                address: '100 Lê Lợi',
                distanceM: 200,
                latitude: 10.776,
                longitude: 106.700,
                attribution: 'Google Places',
              },
            ],
            fetchedAt: '2026-11-08T10:00:00Z',
          },
        }),
      };

      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <LiveDishResultScreen
          roomId="room_live_map_key"
          repository={repo}
          placesRepository={placesRepo as any}
          placesConfig={{ isDevSimulated: false, apiKey: 'test_live_api_key' }}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      // Verify Google Static Map image is rendered with API key and coordinates
      const mapImg = await screen.findByTestId('live-google-map-image');
      expect(mapImg.props.source.uri).toContain('maps.googleapis.com/maps/api/staticmap');
      expect(mapImg.props.source.uri).toContain('key=test_live_api_key');
      expect(mapImg.props.source.uri).toContain('10.776,106.7');
    });

    test('live map renderer shows unavailable notice when apiKey is missing, preserving winner, Top 3, and external button', async () => {
      const placesRepo = {
        fetchNearbyPlaces: jest.fn().mockResolvedValue({
          ok: true,
          data: {
            resultId: decidedResult.resultId,
            winnerDishId: decidedResult.winner!.dishId,
            status: 'ready',
            places: [
              {
                id: 'place_live_02',
                name: 'Quán Phở NoKey',
                address: '100 Lê Lợi',
                distanceM: 200,
                latitude: 10.776,
                longitude: 106.700,
                attribution: 'Google Places',
              },
            ],
            fetchedAt: '2026-11-08T10:00:00Z',
          },
        }),
      };

      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <LiveDishResultScreen
          roomId="room_live_map_nokey"
          repository={repo}
          placesRepository={placesRepo as any}
          placesConfig={{ isDevSimulated: false, apiKey: '' }}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      // Verify unavailable notice is displayed per GM-30 requirement
      expect(await screen.findByTestId('live-map-unavailable')).toBeTruthy();
      expect(screen.getByText('Bản đồ trong ứng dụng chưa khả dụng')).toBeTruthy();
      expect(screen.getByText(/Vui lòng bấm nút "Mở bản đồ" bên dưới để xem vị trí quán trên Google Maps/)).toBeTruthy();

      // Verify external "Mở bản đồ" button is present and usable
      expect(screen.getByLabelText('Mở bản đồ')).toBeTruthy();

      // Verify winner dish and Top 3 are preserved
      expect(screen.getAllByText('Phở bò tái nạm').length).toBeGreaterThan(0);
      expect(screen.getByText('Cơm tấm sườn bì')).toBeTruthy();
    });
    test('live map recovers and reloads when switching from Place A (image error) to Place B', async () => {
      const placesRepo = {
        fetchNearbyPlaces: jest.fn().mockResolvedValue({
          ok: true,
          data: {
            resultId: decidedResult.resultId,
            winnerDishId: decidedResult.winner!.dishId,
            status: 'ready',
            places: [
              {
                id: 'place_err_01',
                name: 'Phở Gia Truyền Error',
                address: '10 Hàng Đồng',
                distanceM: 250,
                latitude: 21.033,
                longitude: 105.850,
                attribution: 'Google Places',
              },
              {
                id: 'place_ok_02',
                name: 'Phở Hòa Pasteur',
                address: '260C Pasteur',
                distanceM: 400,
                latitude: 10.787,
                longitude: 106.691,
                attribution: 'Google Places',
              },
            ],
            fetchedAt: '2026-11-08T10:00:00Z',
          },
        }),
      };

      const repo = createMockResultRepository({
        initialResult: decidedResult,
      });

      await render(
        <LiveDishResultScreen
          roomId="room_live_map_error_recovery"
          repository={repo}
          placesRepository={placesRepo as any}
          placesConfig={{ isDevSimulated: false, apiKey: 'valid_maps_key' }}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      const dismiss = await screen.findByText('Chạm để bỏ qua');
      fireEvent.press(dismiss);

      // Initially, Place A is selected and static map image is rendered
      const mapImgA = await screen.findByTestId('live-google-map-image');
      expect(mapImgA.props.source.uri).toContain('21.033,105.85');

      // Trigger image load error on Place A static map
      fireEvent(mapImgA, 'error', { nativeEvent: { error: 'Network error loading tile' } });

      // Live map shows unavailable notice for Place A
      expect(await screen.findByTestId('live-map-unavailable')).toBeTruthy();
      expect(screen.queryByTestId('live-google-map-image')).toBeNull();

      // Now switch to Place B
      const placeBCard = await screen.findByLabelText('Chọn quán Phở Hòa Pasteur');
      fireEvent.press(placeBCard);

      // Map error resets: unavailable notice disappears and Place B static map loads!
      await waitFor(() => {
        expect(screen.queryByTestId('live-map-unavailable')).toBeNull();
      });
      const mapImgB = await screen.findByTestId('live-google-map-image');
      expect(mapImgB.props.source.uri).toContain('10.787,106.691');
    });
  });
});
