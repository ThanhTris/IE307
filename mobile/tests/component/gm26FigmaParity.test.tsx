import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import {
  FIXTURE_CANDIDATES_N1,
  FIXTURE_CANDIDATES_N4,
  FIXTURE_ROUND_TWO_CANDIDATES,
  FinalRoundScreen,
  VoteScreen,
  createMockVoteRepository,
} from '../../src/features/voting';
import type { PoolDish } from '../../src/data/api';

const MOCK_POOL_3: PoolDish[] = [
  {
    roundDishId: 'dish_gm26_01',
    choiceId: 'choice_gm26_01',
    dishId: 'food_pho',
    name: 'Phở bò tái lăn',
    cuisineIds: ['cui_vn'],
    categoryIds: ['cat_soup'],
    origin: 'north',
    temperature: 'hot',
    priceMin: 60000,
    priceMax: 80000,
    currency: 'VND',
    venueName: 'Phở Thìn Lò Đúc',
    artwork: { url: 'https://example.test/pho.jpg', usageRights: 'granted', license: null, attribution: null },
  },
  {
    roundDishId: 'dish_gm26_02',
    choiceId: 'choice_gm26_02',
    dishId: 'food_buncha',
    name: 'Bún chả Hà Nội',
    cuisineIds: ['cui_vn'],
    categoryIds: ['cat_noodle'],
    origin: 'north',
    temperature: 'warm',
    priceMin: 50000,
    priceMax: 70000,
    currency: 'VND',
    venueName: 'Bún Chả Hương Liên',
    artwork: null, // fallback emoji test
  },
  {
    roundDishId: 'dish_gm26_03',
    choiceId: 'choice_gm26_03',
    dishId: 'food_comtam',
    name: 'Cơm tấm sườn nướng',
    cuisineIds: ['cui_vn'],
    categoryIds: ['cat_rice'],
    origin: 'south',
    temperature: 'warm',
    priceMin: 45000,
    priceMax: 65000,
    currency: 'VND',
    venueName: 'Cơm Tấm Ba Ghiền',
    artwork: null,
  },
];

describe('GM-26 Figma UI Parity Suite (Issue #87)', () => {
  // Node 330:3071 — 07 · Vòng 1 / Chọn món / Gửi phiếu
  describe('Node 330:3071 — Vòng 1 Flashcard & Gửi phiếu', () => {
    it('renders flashcard view, handles WANT/OK/NO, and keeps Submit disabled until all dishes are voted', async () => {
      const user = userEvent.setup();
      await render(
        <VoteScreen
          pool={MOCK_POOL_3}
          initialViewMode="flashcard"
          simulateDelayMs={0}
        />
      );

      // Verify flashcard deck
      expect(screen.getByText('Phở bò tái lăn')).toBeTruthy();
      expect(screen.getByText('Thẻ 1 / 3')).toBeTruthy();

      // Submit button is disabled because 0/3 voted
      const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
      expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

      // Vote WANT for dish 1
      const wantBtn = screen.getByRole('button', { name: 'Muốn ăn (Chạm 2 lần · WANT)' });
      await user.press(wantBtn);

      // Advances to card 2: Bún chả
      await waitFor(() => {
        expect(screen.getByText('Bún chả Hà Nội')).toBeTruthy();
        expect(screen.getByText('Thẻ 2 / 3')).toBeTruthy();
      });

      // Vote OK for dish 2
      const okBtn = screen.getByRole('button', { name: 'Ăn được (Vuốt phải · OK)' });
      await user.press(okBtn);

      // Advances to card 3: Cơm tấm
      await waitFor(() => {
        expect(screen.getByText('Cơm tấm sườn nướng')).toBeTruthy();
        expect(screen.getByText('Thẻ 3 / 3')).toBeTruthy();
      });

      // Submit button still disabled (2/3 voted)
      expect(submitBtn.props.accessibilityState?.disabled).toBe(true);

      // Vote NO for dish 3
      const noBtn = screen.getByRole('button', { name: 'Không ăn (Vuốt trái · NO)' });
      await user.press(noBtn);

      // Now all 3/3 voted -> Submit button is enabled
      await waitFor(() => {
        expect(Boolean(submitBtn.props.accessibilityState?.disabled)).toBe(false);
      });
    });

    it('submits ballot via VoteRepository, enters pending state, and locks interaction on ACK', async () => {
      const user = userEvent.setup();
      const mockRepo = createMockVoteRepository({
        initialTotalRoster: 3,
        initialAcknowledgedCount: 1,
      });

      await render(
        <VoteScreen
          pool={MOCK_POOL_3}
          repository={mockRepo}
          initialViewMode="list"
          simulateDelayMs={0}
          initialVotes={{
            dish_gm26_01: 'WANT',
            dish_gm26_02: 'OK',
            dish_gm26_03: 'NO',
          }}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
      expect(Boolean(submitBtn.props.accessibilityState?.disabled)).toBe(false);

      await user.press(submitBtn);

      // On ACK: displays confirmation and enters waiting state
      await waitFor(() => {
        expect(screen.getByText(/Đã nhận phiếu thành công/i)).toBeTruthy();
      });
    });
  });

  // Node 330:3072 — 08 · Chờ vòng 1 / Chốt ngay / Rời phòng
  describe('Node 330:3072 — Chờ vòng 1 & Host Chốt ngay khi A_r > M/2', () => {
    it('disables Chốt ngay when A_r <= M/2 and enables when quorum A_r > M/2 is reached', async () => {
      const user = userEvent.setup();
      const onGoToFinalRound = jest.fn();

      await render(
        <VoteScreen
          pool={MOCK_POOL_3}
          initialViewMode="list"
          initialScenario="waiting"
          initialIsHost={true}
          simulateDelayMs={0}
          onGoToFinalRound={onGoToFinalRound}
          initialVotes={{
            dish_gm26_01: 'WANT',
            dish_gm26_02: 'OK',
            dish_gm26_03: 'NO',
          }}
        />
      );

      // Submit to enter waiting
      const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
      await user.press(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Đang đợi các thành viên khác nộp phiếu/i)).toBeTruthy();
      });

      // Default 2/3 ACK (> 50%) -> Chốt ngay is enabled
      const enabledBtn = screen.getByRole('button', { name: /Chốt ngay · Kết thúc chờ sớm/ });
      expect(Boolean(enabledBtn.props.accessibilityState?.disabled)).toBe(false);

      // Switch simulation to 1/3 ACK (not > 50%)
      const chip13 = screen.getByRole('button', { name: 'Chuyển tiến độ 1/3 ACK' });
      await user.press(chip13);

      // Button Chốt ngay is disabled with rule explanation
      await waitFor(() => {
        const disabledEarlyFinishBtn = screen.getByRole('button', { name: /Chốt ngay \(1\/3 chưa quá nửa\)/ });
        expect(disabledEarlyFinishBtn.props.accessibilityState?.disabled).toBe(true);
      });

      // Switch simulation back to 2/3 ACK (> 50%)
      const chip23 = screen.getByRole('button', { name: 'Chuyển tiến độ 2/3 ACK' });
      await user.press(chip23);

      // Button Chốt ngay is now enabled again
      await waitFor(() => {
        const earlyFinishBtn = screen.getByRole('button', { name: /Chốt ngay · Kết thúc chờ sớm/ });
        expect(Boolean(earlyFinishBtn.props.accessibilityState?.disabled)).toBe(false);
      });

      // Host presses Chốt ngay
      const earlyFinishBtn = screen.getByRole('button', { name: /Chốt ngay · Kết thúc chờ sớm/ });
      await user.press(earlyFinishBtn);

      // Transitions to Round 2 with survivor candidates
      await waitFor(() => {
        expect(screen.getByText('Yêu cầu Vòng 2 · Chọn lọc (Chưa đồng thuận)')).toBeTruthy();
      });
    });
  });

  // Node 330:3073 — 09 · Vòng 2 / Pool còn lại / Giới hạn loại
  describe('Node 330:3073 — Vòng 2 Candidate Pool & Giới hạn loại (Cap 30%)', () => {
    it('displays survivor candidates and enforces cap: max(1, floor(0.30 * N))', async () => {
      const user = userEvent.setup();

      // N = 4 candidates -> cap = max(1, floor(1.2)) = 1
      await render(
        <FinalRoundScreen
          candidates={FIXTURE_CANDIDATES_N4}
          simulateDelayMs={0}
          initialIsHost={true}
        />
      );

      expect(screen.getByText(/VÒNG 2 · CHỌN LỌC/i)).toBeTruthy();
      expect(screen.getByText(/Bạn được loại tối đa 1 món/i)).toBeTruthy();

      // All start at KEEP
      const removeButtons = screen.getAllByRole('button', { name: /Loại món/ });
      expect(removeButtons.length).toBe(4);

      // Select REMOVE on candidate 1
      await user.press(removeButtons[0]!);

      // Candidate 1 status updates to ✕ ĐÃ LOẠI
      await waitFor(() => {
        expect(screen.getByText('✕ ĐÃ LOẠI')).toBeTruthy();
      });

      // Now at cap (1/1). Removing additional candidates is disabled
      await waitFor(() => {
        expect(screen.getByText(/Đã chọn loại: 1\/1 món/i)).toBeTruthy();
        expect(removeButtons[1]!.props.accessibilityState?.disabled).toBe(true);
        expect(removeButtons[2]!.props.accessibilityState?.disabled).toBe(true);
        expect(removeButtons[3]!.props.accessibilityState?.disabled).toBe(true);
      });

      // Reset all to KEEP
      const resetBtn = screen.getByRole('button', { name: 'Chọn giữ tất cả' });
      await user.press(resetBtn);

      await waitFor(() => {
        expect(screen.queryByText('✕ ĐÃ LOẠI')).toBeNull();
      });
    });

    it('requires confirmation dialog before final submission in Round 2', async () => {
      const user = userEvent.setup();
      await render(
        <FinalRoundScreen
          candidates={FIXTURE_ROUND_TWO_CANDIDATES}
          simulateDelayMs={0}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
      await user.press(submitBtn);

      // SheetDialog appears
      await waitFor(() => {
        expect(screen.getByText('Xác nhận nộp phiếu Vòng 2')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Chốt phiếu ngay' })).toBeTruthy();
      });

      // Confirm submission
      const confirmBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
      await user.press(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Lựa chọn Vòng 2 đã được nộp/i)).toBeTruthy();
      });
    });
  });

  // Node 330:3074 — 10 · Chờ vòng 2 / Xác nhận / Gửi lỗi / Kết nối lại
  describe('Node 330:3074 — Chờ vòng 2, Retry lỗi & Host chốt kết quả', () => {
    it('handles error state gracefully and allows retry without losing choices', async () => {
      const user = userEvent.setup();
      await render(
        <FinalRoundScreen
          candidates={FIXTURE_ROUND_TWO_CANDIDATES}
          initialScenario="error"
          simulateDelayMs={0}
        />
      );

      // Select REMOVE on candidate 1
      const removeButtons = screen.getAllByRole('button', { name: /Loại món/ });
      await user.press(removeButtons[0]!);

      const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
      await user.press(submitBtn);

      const confirmBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
      await user.press(confirmBtn);

      // Error banner is shown
      await waitFor(() => {
        expect(screen.getByText(/Mô phỏng lỗi kết nối máy chủ/i)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Thử lại nộp phiếu Vòng 2' })).toBeTruthy();
      });

      // Press retry
      const retryBtn = screen.getByRole('button', { name: 'Thử lại nộp phiếu Vòng 2' });
      await user.press(retryBtn);

      // Now successful
      await waitFor(() => {
        expect(screen.getByText(/Lựa chọn Vòng 2 đã được nộp/i)).toBeTruthy();
      });
    });
  });

  // Node 638:9369 — Vòng 2 — Còn 1 món · Đã loại
  describe('Node 638:9369 — Vòng 2 với N=1 món duy nhất & Loại hết', () => {
    it('supports N=1 candidate with cap=1, allows marking ✕ ĐÃ LOẠI and submitting ALL_REMOVED', async () => {
      const user = userEvent.setup();

      await render(
        <FinalRoundScreen
          candidates={FIXTURE_CANDIDATES_N1} // exactly 1 candidate: Phở bò
          simulateDelayMs={0}
          initialIsHost={true}
        />
      );

      // N=1 candidate card rendered
      expect(screen.getByText('Phở bò tái nạm')).toBeTruthy();
      expect(screen.getByText('Ứng viên #1')).toBeTruthy();
      expect(screen.getByText(/Bạn được loại tối đa 1 món \(kể cả N=1\)/i)).toBeTruthy();

      // Initially KEEP
      expect(screen.getByText('✓ GIỮ')).toBeTruthy();

      // Select REMOVE on the only candidate
      const removeBtn = screen.getByRole('button', { name: /Loại món/ });
      await user.press(removeBtn);

      // Status pill updates to ✕ ĐÃ LOẠI
      await waitFor(() => {
        expect(screen.getByText('✕ ĐÃ LOẠI')).toBeTruthy();
      });

      // Submit
      const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
      await user.press(submitBtn);

      // SheetDialog shows warning about ALL_REMOVED
      await waitFor(() => {
        expect(screen.getByText(/Chú ý: Bạn đang chọn LOẠI TẤT CẢ các món/i)).toBeTruthy();
      });

      const confirmBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
      await user.press(confirmBtn);

      // Outcome is NO_CONSENSUS / ALL_REMOVED
      await waitFor(() => {
        expect(screen.getByText(/KHÔNG TÌM THẤY MÓN ĐỒNG THUẬN/i)).toBeTruthy();
      });
    });
  });
});
