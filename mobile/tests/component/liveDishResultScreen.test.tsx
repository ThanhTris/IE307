import { fireEvent, render, screen } from '@testing-library/react-native';
import { LiveDishResultScreen } from '../../src/features/result/screens/LiveDishResultScreen';
import { DishResultEntry } from '../../src/bootstrap/DishResultEntry';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import {
  createMockResultRepository,
} from '../../src/features/result/services/resultRepository';
import type { ScoredResult } from '../../src/features/result/services/resultPresentation';

jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({
  useRoomRepository: jest.fn(),
}));

jest.mock('../../src/features/auth/components/RequireActiveSession', () => ({
  RequireActiveSession: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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
      artwork: null,
      priceReference: {
        amount: 65000,
        currency: 'VND',
        unit: 'portion',
        servingSize: null,
        sourceRef: 'Menu',
        checkedAt: '2026-11-06T10:00:00Z',
      },
    },
    topDishes: [
      {
        dish: {
          dishId: '00000000-0000-4000-8000-000000000010',
          roundDishId: '00000000-0000-4000-8000-000000000020',
          name: 'Phở bò tái nạm',
          description: 'Phở bò truyền thống',
          artwork: null,
          priceReference: {
            amount: 65000,
            currency: 'VND',
            unit: 'portion',
            servingSize: null,
            sourceRef: 'Menu',
            checkedAt: '2026-11-06T10:00:00Z',
          },
        },
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
          artwork: null,
          priceReference: null,
        },
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
    jest.mocked(useRoomRepository).mockReturnValue({
      mode: 'real',
      user: { id: 'user_1', displayName: 'Tuấn' },
    } as any);
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

    expect(screen.getByText(/Món được chọn/)).toBeOnTheScreen();
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

    expect(screen.getByText(/Món được chọn/)).toBeOnTheScreen();
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
    expect(screen.getByText(/Món được chọn/)).toBeOnTheScreen();
    expect(screen.getByText('Cơm tấm sườn bì')).toBeOnTheScreen();
    expect(screen.getByText('Không tải được danh sách quán')).toBeOnTheScreen();
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

      const dismiss = screen.queryByText('Chạm để bỏ qua');
      if (dismiss) {
        fireEvent.press(dismiss);
      }

      expect(screen.getByText(/Món được chọn/)).toBeOnTheScreen();
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
  });
});
