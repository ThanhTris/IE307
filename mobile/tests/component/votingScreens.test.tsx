import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { type ApiClient, type PoolDish, type RoomResult } from '../../src/data/api';
import {
  FIXTURE_CANDIDATES_N1,
  FIXTURE_CANDIDATES_N4,
  FIXTURE_ROUND_TWO_CANDIDATES,
  FinalRoundScreen,
  VoteScreen,
} from '../../src/features/voting';

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
    venueName: 'Cơm Tấm Ba Ghiền',
    artwork: null, // fallback
  },
];

describe('GM-12 — VoteScreen (Vòng 1 Flashcard Vote)', () => {
  test('Ba nút WANT, OK, NO luôn hiện và bắt đầu ở trạng thái UNSET', async () => {
    await render(<VoteScreen pool={TEST_POOL} simulateDelayMs={0} />);

    expect(screen.getByText('GM-12 · UI Chọn món Vòng 1 (Flashcard Vote)')).toBeOnTheScreen();
    expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
    expect(screen.getByText('Cơm tấm sườn bì chả')).toBeOnTheScreen();

    const wantButtons = screen.getAllByRole('button', { name: 'Muốn ăn' });
    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });
    const noButtons = screen.getAllByRole('button', { name: 'Không ăn' });

    expect(wantButtons).toHaveLength(2);
    expect(okButtons).toHaveLength(2);
    expect(noButtons).toHaveLength(2);

    expect(screen.getAllByText('Chưa chọn (UNSET)')).toHaveLength(2);
  });

  test('Tương tác chọn phiếu, đổi phiếu và hoàn tác (undo) về UNSET', async () => {
    const user = userEvent.setup();
    await render(<VoteScreen pool={TEST_POOL} simulateDelayMs={0} />);

    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });
    const noButtons = screen.getAllByRole('button', { name: 'Không ăn' });

    // Tap OK on dish 1
    await user.press(okButtons[0]!);
    expect(screen.getByText('Phiếu: OK')).toBeOnTheScreen();

    // Change vote to NO on dish 1
    await user.press(noButtons[0]!);
    expect(screen.getByText('Phiếu: NO')).toBeOnTheScreen();

    // Undo / clear vote on dish 1
    const undoButton = screen.getByRole('button', { name: 'Bỏ chọn phiếu cho Phở bò tái nạm' });
    await user.press(undoButton);
    expect(screen.getAllByText('Chưa chọn (UNSET)')).toHaveLength(2);
  });

  test('Double-tap đặt WANT từ UNSET, OK, NO và lặp lại vẫn là WANT (không toggle về UNSET, không tự gửi)', async () => {
    const user = userEvent.setup();
    await render(<VoteScreen pool={TEST_POOL} simulateDelayMs={0} />);

    const cardPho = screen.getByLabelText('Mở món Phở bò tái nạm');

    // 1. Double tap from UNSET -> WANT
    await user.press(cardPho);
    await user.press(cardPho);
    expect(screen.getByText('Phiếu: WANT')).toBeOnTheScreen();

    // 2. Double tap again when already WANT -> MUST STAY WANT (NO toggle to UNSET!)
    await user.press(cardPho);
    await user.press(cardPho);
    expect(screen.getByText('Phiếu: WANT')).toBeOnTheScreen();
    expect(screen.queryByText('Chưa chọn (UNSET)')).toBeOnTheScreen(); // dish 2 is still UNSET

    // 3. From OK -> double tap sets WANT
    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });
    await user.press(okButtons[0]!);
    expect(screen.getByText('Phiếu: OK')).toBeOnTheScreen();

    await user.press(cardPho);
    await user.press(cardPho);
    expect(screen.getByText('Phiếu: WANT')).toBeOnTheScreen();

    // 4. From NO -> double tap sets WANT
    const noButtons = screen.getAllByRole('button', { name: 'Không ăn' });
    await user.press(noButtons[0]!);
    expect(screen.getByText('Phiếu: NO')).toBeOnTheScreen();

    await user.press(cardPho);
    await user.press(cardPho);
    expect(screen.getByText('Phiếu: WANT')).toBeOnTheScreen();

    // Submit button remains disabled because dish 2 is still UNSET
    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText(/Đã nhận phiếu thành công/)).toBeNull();
  });

  test('UNSET khác OK: nút Gửi chỉ bật khi đã chọn đủ phiếu cho tất cả các món', async () => {
    const user = userEvent.setup();
    await render(<VoteScreen pool={TEST_POOL} simulateDelayMs={0} />);

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);

    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });

    // Vote 1 dish
    await user.press(okButtons[0]!);
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);

    // Vote second dish
    await user.press(okButtons[1]!);
    expect(submitBtn.props.accessibilityState.disabled).toBe(false);

    // If user unsets one dish, submit button becomes disabled again
    const undoButton = screen.getByRole('button', { name: 'Bỏ chọn phiếu cho Phở bò tái nạm' });
    await user.press(undoButton);
    expect(submitBtn.props.accessibilityState.disabled).toBe(true);
  });

  test('Trạng thái Pending hiển thị rõ ràng và khóa tương tác trong khi chờ phản hồi', async () => {
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'WANT', dish_test_02: 'OK' }}
        simulateDelayMs={200}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(false);

    // Click submit
    await user.press(submitBtn);

    // While pending: pending notice appears and submit button enters loading state
    expect(screen.getByText('Đang gửi phiếu… (Pending)')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Đang gửi phiếu…' })).toBeOnTheScreen();

    // Once finished:
    await waitFor(() => {
      expect(screen.getByText(/Đã nhận phiếu thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });
  });

  test('Sau ACK: khóa toàn bộ phiếu, không thể sửa hay nộp lại trùng', async () => {
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'WANT', dish_test_02: 'OK' }}
        initialScenario="round_two"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    await user.press(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã nhận phiếu thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });

    // Vote buttons are disabled
    const okButtons = screen.getAllByRole('button', { name: 'Ăn được' });
    expect(okButtons[0]!.props.accessibilityState.disabled).toBe(true);

    // Double tap on card is locked and does not change vote
    const cardPho = screen.getByLabelText('Mở món Phở bò tái nạm');
    await user.press(cardPho);
    await user.press(cardPho);
    expect(screen.getByText('Phiếu: WANT')).toBeOnTheScreen();

    // Submit button is locked as "Đã nộp phiếu (Đã xác nhận)"
    const lockedSubmitBtn = screen.getByRole('button', { name: 'Đã nộp phiếu (Đã xác nhận)' });
    expect(lockedSubmitBtn.props.accessibilityState.disabled).toBe(true);
  });

  test('Kịch bản chờ nhóm (Waiting): ACK nhưng chưa đủ thành viên nộp thì không mở Vòng 2', async () => {
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'WANT', dish_test_02: 'OK' }}
        initialScenario="waiting"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    await user.press(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã nhận phiếu thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });

    // Shows waiting notice
    expect(screen.getByText(/Đang đợi các thành viên khác nộp phiếu… \(Chờ kết quả\)/)).toBeOnTheScreen();

    // Does NOT show button to Round 2
    expect(screen.queryByRole('button', { name: 'Tiến hành Vòng 2 · Chọn lọc →' })).toBeNull();
  });

  test('Waiting: Countdown 60s và nút Host kết thúc chờ sớm chỉ bật khi A_r > M/2', async () => {
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'WANT', dish_test_02: 'OK' }}
        initialScenario="waiting"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    await user.press(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đang đợi các thành viên khác nộp phiếu… \(Chờ kết quả\)/)).toBeOnTheScreen();
    });

    // Countdown label displayed
    expect(screen.getByText(/Hạn 60s/)).toBeOnTheScreen();

    // Với mặc định 2/3 thành viên (> 50%), Host có thể bấm Chốt ngay
    const earlyFinishBtn = screen.getByRole('button', { name: /Chốt ngay · Kết thúc chờ sớm/ });
    expect(Boolean(earlyFinishBtn.props.accessibilityState?.disabled)).toBe(false);

    // Chuyển sang mô phỏng 1/3 (chưa quá nửa: 1 <= 3/2 = 1.5)
    const btn1Of3 = screen.getByRole('button', { name: 'Chuyển tiến độ 1/3 ACK' });
    await user.press(btn1Of3);

    // Nút Chốt ngay bị disabled do không đủ đa số
    const disabledEarlyFinishBtn = screen.getByRole('button', { name: /Chốt ngay \(1\/3 chưa quá nửa\)/ });
    expect(disabledEarlyFinishBtn.props.accessibilityState.disabled).toBe(true);

    // Chuyển lại 2/3 (đủ đa số: 2 > 1.5)
    const btn2Of3 = screen.getByRole('button', { name: 'Chuyển tiến độ 2/3 ACK' });
    await user.press(btn2Of3);
    const enabledBtn = screen.getByRole('button', { name: /Chốt ngay · Kết thúc chờ sớm/ });
    expect(Boolean(enabledBtn.props.accessibilityState?.disabled)).toBe(false);

    // Bấm Chốt ngay chuyển sang yêu cầu Vòng 2
    await user.press(enabledBtn);
    expect(screen.getByText('Yêu cầu Vòng 2 · Chọn lọc (Chưa đồng thuận)')).toBeOnTheScreen();
  });

  test('Flashcard Vòng 1: hiển thị thẻ hiện tại, điều hướng thẻ trước/sau, Undo trước gửi', async () => {
    const user = userEvent.setup();
    await render(<VoteScreen pool={TEST_POOL} initialViewMode="flashcard" simulateDelayMs={0} />);

    // Thẻ 1/2: Phở bò tái nạm
    expect(screen.getByText('Thẻ 1 / 2')).toBeOnTheScreen();
    expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();

    // 3 nút cử chỉ thay thế đều hiển thị với touch target
    expect(screen.getByRole('button', { name: 'Không ăn (Vuốt trái · NO)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Muốn ăn (Chạm 2 lần · WANT)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ăn được (Vuốt phải · OK)' })).toBeOnTheScreen();

    // Bấm nút gesture NO trên thẻ 1 -> tự động chuyển sang thẻ 2
    const noGestureBtn = screen.getByRole('button', { name: 'Không ăn (Vuốt trái · NO)' });
    await user.press(noGestureBtn);

    // Đã chuyển sang Thẻ 2/2: Cơm tấm sườn bì chả
    expect(screen.getByText('Thẻ 2 / 2')).toBeOnTheScreen();
    expect(screen.getByText('Cơm tấm sườn bì chả')).toBeOnTheScreen();

    // Bấm Hoàn tác (Undo) để quay lại thẻ trước
    const undoCardBtn = screen.getByRole('button', { name: 'Hoàn tác về thẻ trước' });
    await user.press(undoCardBtn);

    // Đã quay lại Thẻ 1/2
    expect(screen.getByText('Thẻ 1 / 2')).toBeOnTheScreen();
    expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
  });

  test('Kịch bản Chuyển Vòng 2: mở nút Vòng 2 và truyền đúng danh sách ứng viên từ fixture', async () => {
    const onGoToFinal = jest.fn();
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'WANT', dish_test_02: 'OK' }}
        initialScenario="round_two"
        simulateDelayMs={0}
        onGoToFinalRound={onGoToFinal}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    await user.press(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Yêu cầu Vòng 2 · Chọn lọc (Chưa đồng thuận)')).toBeOnTheScreen();
    });

    const finalBtn = screen.getByRole('button', { name: 'Tiến hành Vòng 2 · Chọn lọc →' });
    await user.press(finalBtn);

    // Asserts called with FIXTURE_ROUND_TWO_CANDIDATES
    expect(onGoToFinal).toHaveBeenCalledTimes(1);
    expect(onGoToFinal).toHaveBeenCalledWith(FIXTURE_ROUND_TWO_CANDIDATES);
  });

  test('Mô phỏng lỗi nộp phiếu (Error state fixture) và nút Thử lại gửi thành công', async () => {
    const user = userEvent.setup();
    await render(
      <VoteScreen
        pool={TEST_POOL}
        initialVotes={{ dish_test_01: 'OK', dish_test_02: 'OK' }}
        initialScenario="error"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Gửi phiếu' });
    await user.press(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Lỗi nộp phiếu (Fixture Error)')).toBeOnTheScreen();
    });
    const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
    expect(retryBtn).toBeOnTheScreen();

    // Clicking retry switches to success and resolves ACK
    await user.press(retryBtn);
    await waitFor(() => {
      expect(screen.getByText(/Đã nhận phiếu thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });
  });

  test('Hiển thị ảnh dự phòng (fallback) khi món không có artwork', async () => {
    await render(<VoteScreen pool={TEST_POOL} simulateDelayMs={0} />);
    expect(screen.getByLabelText('Ảnh dự phòng Cơm tấm sườn bì chả')).toBeOnTheScreen();
  });
});

describe('GM-12 — FinalRoundScreen (Vòng 2 Chọn lọc)', () => {
  test('Hiển thị banner Vòng 2, các món ứng viên và nút toggle đôi Giữ/Loại', async () => {
    await render(<FinalRoundScreen candidates={TEST_POOL} simulateDelayMs={0} />);

    expect(screen.getByText('⚡ VÒNG 2 · CHỌN LỌC')).toBeOnTheScreen();
    expect(screen.getByText('Các món cả nhóm cùng ăn được. Chọn Giữ hoặc Loại để chốt.')).toBeOnTheScreen();

    const keepButtons = screen.getAllByRole('button', { name: /Giữ món/ });
    const removeButtons = screen.getAllByRole('button', { name: /Loại món/ });

    expect(keepButtons).toHaveLength(2);
    expect(removeButtons).toHaveLength(2);
  });

  test('N=1 có thể loại món duy nhất (Loại hết) và nộp phiếu hợp lệ theo Cap R2=1', async () => {
    const user = userEvent.setup();
    await render(<FinalRoundScreen candidates={FIXTURE_CANDIDATES_N1} simulateDelayMs={0} />);

    const removeBtn = screen.getByRole('button', { name: /Loại món/ });
    await user.press(removeBtn);

    expect(screen.getByText(/Bạn đang chọn LOẠI TẤT CẢ các món/)).toBeOnTheScreen();

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    expect(submitBtn.props.accessibilityState.disabled).toBe(false);
  });

  test('Cap R2=max(1, floor(0.30*N)) giới hạn số lượng món loại và chặn chọn vượt cap', async () => {
    const user = userEvent.setup();
    // N=4 -> Cap = max(1, floor(1.2)) = 1
    await render(<FinalRoundScreen candidates={FIXTURE_CANDIDATES_N4} simulateDelayMs={0} />);

    expect(screen.getByText(/Giới hạn loại: tối đa 1 món/)).toBeOnTheScreen();
    const removeButtons = screen.getAllByRole('button', { name: /Loại món/ });
    expect(removeButtons).toHaveLength(4);

    // Loại món 1 -> thành công (1/1 món)
    await user.press(removeButtons[0]!);
    expect(screen.getByText(/Đã chọn loại: 1\/1 món/)).toBeOnTheScreen();

    // Món 2 nút Loại bị disabled vì đã đạt cap
    expect(removeButtons[1]!.props.accessibilityState.disabled).toBe(true);
  });

  test('Nút Giữ tất cả đặt lại toàn bộ món về KEEP và xóa thông báo cap', async () => {
    const user = userEvent.setup();
    await render(<FinalRoundScreen candidates={TEST_POOL} simulateDelayMs={0} />);

    const removeButtons = screen.getAllByRole('button', { name: /Loại món/ });
    await user.press(removeButtons[0]!);

    // Bấm Giữ tất cả
    const keepAllBtn = screen.getByRole('button', { name: 'Chọn giữ tất cả' });
    await user.press(keepAllBtn);

    expect(screen.getByText(/Đã chọn loại: 0\/1 món/)).toBeOnTheScreen();
  });

  test('Yêu cầu xác nhận qua SheetDialog trước khi chốt phiếu Vòng 2', async () => {
    const user = userEvent.setup();
    await render(<FinalRoundScreen candidates={TEST_POOL} simulateDelayMs={0} />);

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    await user.press(submitBtn);

    // Dialog opens
    expect(screen.getByRole('header', { name: 'Xác nhận nộp phiếu Vòng 2' })).toBeOnTheScreen();

    // Confirm submit inside dialog
    const confirmSubmitBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã nộp phiếu Vòng 2 thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });
  });

  test('ACK nhưng người khác chưa nộp xong (Waiting): không tự hiển thị winner', async () => {
    const user = userEvent.setup();
    await render(
      <FinalRoundScreen
        candidates={TEST_POOL}
        initialScenario="waiting"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    await user.press(submitBtn);

    const confirmSubmitBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã nộp phiếu Vòng 2 thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });

    // Shows waiting notice
    expect(screen.getByText(/Đang đợi các thành viên khác nộp phiếu… \(Chờ kết quả nhóm\)/)).toBeOnTheScreen();

    // MUST NOT show winner heading or fake winner
    expect(screen.queryByText(/🎉 ĐÃ TÌM THẤY MÓN ĐỒNG THUẬN!/)).toBeNull();
  });

  test('Hiển thị đúng món chiến thắng từ result fixture khác với món KEEP đầu tiên', async () => {
    const customResult: RoomResult = {
      resultId: 'res_custom_02',
      roomId: 'room_demo_gm12',
      round: 2,
      winnerRoundDishId: TEST_POOL[1]!.roundDishId,
      winnerDish: TEST_POOL[1]!, // Cơm tấm sườn bì chả (dish #2)
      reasonCode: 'ACCEPTABLE_FINAL',
      matchTier: 'CONSENSUS',
      finalizedAt: new Date().toISOString(),
      policyVersion: 'decision-v2',
    };

    const user = userEvent.setup();
    await render(
      <FinalRoundScreen
        candidates={TEST_POOL}
        initialChoices={{ dish_test_01: 'KEEP', dish_test_02: 'KEEP' }}
        initialResult={customResult}
        initialScenario="consensus"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    await user.press(submitBtn);

    const confirmSubmitBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText('🎉 ĐÃ TÌM THẤY MÓN ĐỒNG THUẬN!')).toBeOnTheScreen();
    });

    // The displayed winner MUST BE Cơm tấm (dish #2), NOT Phở bò (dish #1)
    expect(screen.getAllByText('Cơm tấm sườn bì chả')).toHaveLength(2);
    expect(screen.getAllByText('Cơm Tấm Ba Ghiền')).toHaveLength(2);
  });

  test('Khóa toàn bộ tương tác sau khi nộp Vòng 2: không thể sửa hay mở lại dialog', async () => {
    const user = userEvent.setup();
    await render(
      <FinalRoundScreen
        candidates={TEST_POOL}
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    await user.press(submitBtn);

    const confirmSubmitBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã nộp phiếu Vòng 2 thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });

    // Toggle buttons are disabled
    const keepButtons = screen.getAllByRole('button', { name: /Giữ món/ });
    expect(keepButtons[0]!.props.accessibilityState.disabled).toBe(true);

    // Batch buttons are disabled
    const batchKeepBtn = screen.getByRole('button', { name: 'Chọn giữ tất cả' });
    expect(batchKeepBtn.props.accessibilityState.disabled).toBe(true);

    // Submit button is locked as "Đã nộp phiếu Vòng 2 (Đã xác nhận)"
    const lockedSubmitBtn = screen.getByRole('button', { name: 'Đã nộp phiếu Vòng 2 (Đã xác nhận)' });
    expect(lockedSubmitBtn.props.accessibilityState.disabled).toBe(true);
  });

  test('Kịch bản Loại hết: hiển thị thông báo KHÔNG TÌM THẤY MÓN ĐỒNG THUẬN', async () => {
    const user = userEvent.setup();
    await render(
      <FinalRoundScreen
        candidates={TEST_POOL}
        initialScenario="all_removed"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    await user.press(submitBtn);

    const confirmSubmitBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText('🚫 KHÔNG TÌM THẤY MÓN ĐỒNG THUẬN')).toBeOnTheScreen();
    });

    expect(screen.getByText(/Cả nhóm đã loại toàn bộ các món trong Vòng 2/)).toBeOnTheScreen();
  });

  test('Lỗi nộp Vòng 2 và Thử lại thành công', async () => {
    const user = userEvent.setup();
    await render(
      <FinalRoundScreen
        candidates={TEST_POOL}
        initialScenario="error"
        simulateDelayMs={0}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    await user.press(submitBtn);

    const confirmSubmitBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText('Lỗi nộp phiếu Vòng 2 (Fixture Error)')).toBeOnTheScreen();
    });
    const retryBtn = screen.getByRole('button', { name: 'Thử lại' });
    expect(retryBtn).toBeOnTheScreen();

    await user.press(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã nộp phiếu Vòng 2 thành công! \(Server ACK\)/)).toBeOnTheScreen();
    });
  });

  test('Nộp phiếu Vòng 2 gửi đúng payload KEEP/REMOVE (không bị đổi sai thành WANT/NO) với round: 2', async () => {
    const user = userEvent.setup();
    const submitBallotSpy = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        accepted: true,
        round: 2,
        allMembersSubmitted: true,
        roomVersion: 3,
        receipt: {
          round: 2,
          intentId: 'intent_test',
          requestId: 'req_test',
          submittedAt: new Date().toISOString(),
          voteCount: 2,
        },
      },
    });

    const mockApi = {
      submitBallot: submitBallotSpy,
    } as unknown as ApiClient;

    await render(
      <FinalRoundScreen
        candidates={TEST_POOL}
        api={mockApi}
        simulateDelayMs={0}
      />
    );

    // Món A (Phở bò tái nạm) mặc định là KEEP; bấm Giữ món để đảm bảo KEEP
    const keepPhoBtn = screen.getByRole('button', { name: 'Giữ món Phở bò tái nạm' });
    await user.press(keepPhoBtn);

    // Món B (Cơm tấm sườn bì chả) bấm Loại món để chuyển sang REMOVE
    const removeComBtn = screen.getByRole('button', { name: 'Loại món Cơm tấm sườn bì chả' });
    await user.press(removeComBtn);

    // Bấm Xác nhận nộp Vòng 2 để mở SheetDialog
    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nộp Vòng 2' });
    await user.press(submitBtn);

    // Bấm Chốt phiếu ngay trong SheetDialog
    const confirmSubmitBtn = screen.getByRole('button', { name: 'Chốt phiếu ngay' });
    await user.press(confirmSubmitBtn);

    await waitFor(() => {
      expect(submitBallotSpy).toHaveBeenCalledTimes(1);
    });

    const calledPayload = submitBallotSpy.mock.calls[0][0];
    expect(calledPayload.round).toBe(2);
    expect(calledPayload.votes).toEqual([
      { roundDishId: 'dish_test_01', vote: 'KEEP' },
      { roundDishId: 'dish_test_02', vote: 'REMOVE' },
    ]);
    expect(calledPayload.votes[0].vote).toBe('KEEP');
    expect(calledPayload.votes[1].vote).toBe('REMOVE');
    expect(calledPayload.votes.some((v: { vote: string }) => v.vote === 'WANT' || v.vote === 'NO')).toBe(false);
  });
});
