import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { type PoolDish } from '../../src/data/api';
import { FinalRoundScreen, VoteScreen } from '../../src/features/voting';

const TEST_POOL: PoolDish[] = [
  {
    roundDishId: 'dish_test_01',
    choiceId: 'choice_test_01',
    dishId: 'dish_pho_bo',
    name: 'Phở bò tái nạm',
    description: 'Nước dùng ninh xương 12 tiếng thơm ngon',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_nuoc'],
    origin: 'north',
    temperature: 'hot',
    priceMin: 55000,
    priceMax: 75000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    venueId: 'ven_pho_phu_vuong',
    venueName: 'Phở Phú Vương',
    artwork: {
      url: 'https://example.test/pho.jpg',
      usageRights: 'granted',
      license: null,
      attribution: null,
    },
  },
  {
    roundDishId: 'dish_test_02',
    choiceId: 'choice_test_02',
    dishId: 'dish_com_tam',
    name: 'Cơm tấm sườn bì chả',
    description: 'Sườn nướng than hoa mật ong',
    cuisineIds: ['cui_vietnam'],
    categoryIds: ['cat_mon_com'],
    origin: 'south',
    temperature: 'warm',
    priceMin: 45000,
    priceMax: 65000,
    currency: 'VND',
    unit: 'menu_item_unspecified',
    servingSize: '1 phần',
    venueId: 'ven_ba_ghien',
    venueName: 'Cơm Tấm Ba Ghiền',
    artwork: null, // Fallback artwork
  },
];

describe('GM-12 — VoteScreen (Vòng 1 Flashcard Vote)', () => {
  test('Ba nút WANT, OK, NO luôn hiện và bắt đầu ở trạng thái UNSET', async () => {
    await render(<VoteScreen pool={TEST_POOL} />);

    expect(screen.getByText('GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)')).toBeOnTheScreen();
    expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
    expect(screen.getByText('Cơm tấm sườn bì chả')).toBeOnTheScreen();

    // 3 buttons per dish: 2 dishes -> 2 of each
    const wantButtons = screen.getAllByRole('button', { name: 'Muốn ăn' });
    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });
    const noButtons = screen.getAllByRole('button', { name: 'Không ăn' });

    expect(wantButtons).toHaveLength(2);
    expect(okButtons).toHaveLength(2);
    expect(noButtons).toHaveLength(2);

    // Initial state is UNSET
    expect(screen.getAllByText('Chưa chọn (UNSET)')).toHaveLength(2);
    expect(screen.getByText('Tiến độ: 0/2 món')).toBeOnTheScreen();
    expect(screen.getByText('Còn 2 món chưa chọn (UNSET)')).toBeOnTheScreen();
  });

  test('Tương tác chọn phiếu, đổi phiếu và hoàn tác (undo) về UNSET', async () => {
    const user = userEvent.setup();
    await render(<VoteScreen pool={TEST_POOL} />);

    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });
    const noButtons = screen.getAllByRole('button', { name: 'Không ăn' });

    // Tap OK on dish 1
    await user.press(okButtons[0]!);
    expect(screen.getByText('Tiến độ: 1/2 món')).toBeOnTheScreen();
    expect(screen.getByText('Phiếu: OK')).toBeOnTheScreen();

    // Change vote to NO on dish 1
    await user.press(noButtons[0]!);
    expect(screen.getByText('Phiếu: NO')).toBeOnTheScreen();

    // Undo / clear vote on dish 1
    const undoButton = screen.getByRole('button', { name: 'Bỏ chọn phiếu cho Phở bò tái nạm' });
    await user.press(undoButton);
    expect(screen.getByText('Tiến độ: 0/2 món')).toBeOnTheScreen();
    expect(screen.getAllByText('Chưa chọn (UNSET)')).toHaveLength(2);
  });

  test('Double-tap đặt WANT nhưng không tự submit', async () => {
    const user = userEvent.setup();
    await render(<VoteScreen pool={TEST_POOL} />);

    const cardPho = screen.getByLabelText('Mở món Phở bò tái nạm');

    // Rapid double-tap
    await user.press(cardPho);
    await user.press(cardPho);

    // Should have placed WANT
    expect(screen.getByText('Phiếu: WANT')).toBeOnTheScreen();
    expect(screen.getByText('Tiến độ: 1/2 món')).toBeOnTheScreen();

    // But submit button remains disabled because dish 2 is still UNSET
    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText(/Đã nhận phiếu thành công/)).toBeNull();
  });

  test('UNSET khác OK: nút Gửi chỉ bật khi đã chọn đủ phiếu cho tất cả các món', async () => {
    const user = userEvent.setup();
    await render(<VoteScreen pool={TEST_POOL} />);

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);

    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });

    // Vote 1 dish
    await user.press(okButtons[0]!);
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);

    // Vote second dish
    await user.press(okButtons[1]!);
    expect(screen.getByText('Tiến độ: 2/2 món')).toBeOnTheScreen();
    expect(screen.getByText('✓ Đã đủ phiếu cho tất cả các món')).toBeOnTheScreen();
    expect(submitBtn.props.accessibilityState.disabled).toBe(false);

    // If user unsets one dish, submit button becomes disabled again
    const undoButton = screen.getByRole('button', { name: 'Bỏ chọn phiếu cho Phở bò tái nạm' });
    await user.press(undoButton);
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);
  });

  test('Luồng nộp phiếu: hiển thị trạng thái pending, ACK với biên nhận, và nút sang Vòng 2', async () => {
    const onGoToFinal = jest.fn();
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'WANT', dish_test_02: 'OK' }}
        onGoToFinalRound={onGoToFinal}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(false);

    await user.press(submitBtn);

    // Wait for ACK
    await waitFor(() => {
      expect(screen.getByText(/Đã nhận phiếu thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });

    const finalBtn = screen.getByRole('button', { name: 'Tiến hành Vòng 2 · Chọn lọc →' });
    await user.press(finalBtn);
    expect(onGoToFinal).toHaveBeenCalledTimes(1);
  });

  test('Mô phỏng lỗi nộp phiếu (Error state fixture) và nút thử lại', async () => {
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'OK', dish_test_02: 'OK' }}
        simulateError={true}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    await user.press(submitBtn);

    expect(screen.getByText('Lỗi nộp phiếu (Fixture Error)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen();
  });

  test('Hiển thị ảnh dự phòng (fallback) khi món không có artwork', async () => {
    await render(<VoteScreen pool={TEST_POOL} />);
    expect(screen.getByLabelText('Ảnh dự phòng Cơm tấm sườn bì chả')).toBeOnTheScreen();
  });
});

describe('GM-12 — FinalRoundScreen (Vòng 2 Chọn lọc)', () => {
  test('Hiển thị banner Vòng 2, các món ứng viên và nút toggle đôi Giữ/Loại', async () => {
    await render(<FinalRoundScreen candidates={TEST_POOL} />);

    expect(screen.getByText('⚡ VÒNG 2 · CHỌN LỌC')).toBeOnTheScreen();
    expect(screen.getByText('Các món cả nhóm cùng ăn được. Chọn Giữ hoặc Loại để chốt.')).toBeOnTheScreen();

    const keepButtons = screen.getAllByRole('button', { name: /Giữ món/ });
    const removeButtons = screen.getAllByRole('button', { name: /Loại món/ });

    expect(keepButtons).toHaveLength(2);
    expect(removeButtons).toHaveLength(2);
  });

  test('Loại hết tất cả món vẫn hoàn toàn hợp lệ để nộp phiếu', async () => {
    const user = userEvent.setup();
    await render(<FinalRoundScreen candidates={TEST_POOL} />);

    const removeButtons = screen.getAllByRole('button', { name: /Loại món/ });

    // Mark both as REMOVE
    await user.press(removeButtons[0]!);
    await user.press(removeButtons[1]!);

    expect(screen.getByText(/Bạn đang chọn LOẠI HẾT tất cả món\. Thao tác này hoàn toàn hợp lệ\./)).toBeOnTheScreen();

    // Submit button remains enabled
    const submitBtn = screen.getByRole('button', { name: 'Gửi lựa chọn Vòng 2 →' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(false);
  });

  test('Yêu cầu xác nhận nộp riêng qua dialog trước khi gửi phiếu Vòng 2', async () => {
    const user = userEvent.setup();
    await render(<FinalRoundScreen candidates={TEST_POOL} />);

    const submitBtn = screen.getByRole('button', { name: 'Gửi lựa chọn Vòng 2 →' });
    await user.press(submitBtn);

    // Dialog opens
    expect(screen.getByRole('header', { name: 'Xác nhận nộp lựa chọn Vòng 2' })).toBeOnTheScreen();
    expect(screen.getByText(/Thao tác nộp phiếu là quyết định cuối cùng cho Vòng 2/)).toBeOnTheScreen();

    // Confirm submit inside dialog
    const confirmSubmitBtn = screen.getByRole('button', { name: 'Xác nhận nộp phiếu' });
    await user.press(confirmSubmitBtn);

    // Receives ACK
    await waitFor(() => {
      expect(screen.getByText(/Đã nộp phiếu Vòng 2 thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });
  });

  test('Tối đa hai vòng: sau Vòng 2 hiển thị kết quả và không có Vòng 3', async () => {
    const onFinish = jest.fn();
    const user = userEvent.setup();
    await render(
      <FinalRoundScreen
        candidates={TEST_POOL}
        initialChoices={{ dish_test_01: 'KEEP', dish_test_02: 'REMOVE' }}
        onFinish={onFinish}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi lựa chọn Vòng 2 →' });
    await user.press(submitBtn);

    const confirmSubmitBtn = screen.getByRole('button', { name: 'Xác nhận nộp phiếu' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText('Đã tìm thấy món đồng thuận! 🎉')).toBeOnTheScreen();
    });

    // Check no Round 3
    expect(screen.getByText('✓ Hoàn tất phiên bình chọn (Tối đa 2 vòng — Không có Vòng 3).')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Vòng 3/ })).toBeNull();

    // Finish button
    const finishBtn = screen.getByRole('button', { name: 'Hoàn tất và về trang chủ' });
    await user.press(finishBtn);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
