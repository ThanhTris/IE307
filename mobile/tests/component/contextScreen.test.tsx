import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { DiscoveryContextScreen } from '../../src/features/context/screens/DiscoveryContextScreen';

describe('GM-24 Dish-only Preview Pool & Room Setup (Figma Parity)', () => {
  it('renders correctly with default scenario and displays all core dish setup sections', async () => {
    await render(<DiscoveryContextScreen initialScenario="exact_20_lunch" />);

    expect(screen.getByText('Thiết lập phòng & Xem trước món')).toBeOnTheScreen();
    expect(screen.getByText('⚙️ Môi trường dữ liệu & API')).toBeOnTheScreen();
    expect(screen.getByText('🍽️ Buổi ăn')).toBeOnTheScreen();
    expect(screen.getByText('⏰ Thời gian')).toBeOnTheScreen();
    expect(screen.getByText('🔢 Số món để lựa chọn · 10–20')).toBeOnTheScreen();
    expect(screen.getByText('💰 Ngân sách mỗi người')).toBeOnTheScreen();
    expect(screen.getByText('🔄 Lịch sử & Tránh lặp món')).toBeOnTheScreen();
    expect(screen.getByText('👥 Rủ bạn ăn cùng')).toBeOnTheScreen();
    expect(screen.getByText('🛡️ BẢO MẬT & QUYỀN RIÊNG TƯ (AUDIT)')).toBeOnTheScreen();
  });

  it('stepper boundary: minus button is disabled at 10 dishes (Figma node 451:13066)', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="exact_20_lunch" />);

    // Default count is 15. Decrement until 10
    const minusBtn = screen.getByRole('button', { name: 'Giảm số món' });
    expect(minusBtn).toBeEnabled();

    // Click down to 10
    await user.press(minusBtn);
    await user.press(minusBtn);
    await user.press(minusBtn);
    await user.press(minusBtn);
    await user.press(minusBtn);

    await waitFor(() => {
      expect(screen.getByText('10 món')).toBeOnTheScreen();
      expect(minusBtn).toBeDisabled();
    });
  });

  it('stepper boundary: plus button is disabled at 20 dishes (Figma node 451:13189)', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="exact_20_lunch" />);

    const plusBtn = screen.getByRole('button', { name: 'Tăng số món' });
    expect(plusBtn).toBeEnabled();

    // Increment up to 20
    await user.press(plusBtn);
    await user.press(plusBtn);
    await user.press(plusBtn);
    await user.press(plusBtn);
    await user.press(plusBtn);

    await waitFor(() => {
      expect(screen.getByText('20 món')).toBeOnTheScreen();
      expect(plusBtn).toBeDisabled();
    });
  });

  it('loads exact lunch dishes when preview button is pressed', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="exact_20_lunch" />);

    const previewBtn = screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' });
    await user.press(previewBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã tìm thấy 15 món phù hợp cho Bữa trưa/)).toBeOnTheScreen();
      expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
      expect(screen.getByText('Bún bò Huế đặc biệt')).toBeOnTheScreen();
      expect(screen.getByText('Cơm tấm sườn bì chả')).toBeOnTheScreen();
    });
  });

  it('shortage >= 10: shows shortage dialog and allows confirming reduction to available count (Figma node 323:2664)', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="shortage_15_lunch" />);

    const previewBtn = screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' });
    await user.press(previewBtn);

    // Shortage dialog appears
    await waitFor(() => {
      expect(screen.getByText('Số món phù hợp')).toBeOnTheScreen();
      expect(screen.getByText(/Bạn đang chọn 20 món cho Bữa trưa\./)).toBeOnTheScreen();
      expect(screen.getByText('Có thể giảm số món')).toBeOnTheScreen();
      expect(screen.getByText(/Hiện có 15 món/)).toBeOnTheScreen();
      const reduceBtns = screen.getAllByRole('button', { name: 'Giảm số món' });
      expect(reduceBtns.length).toBe(2);
    });

    // Press reduce in dialog
    const reduceBtns = screen.getAllByRole('button', { name: 'Giảm số món' });
    await user.press(reduceBtns[1]!);

    // Count is reduced and preview reloads
    await waitFor(() => {
      expect(screen.getByText(/Đã tìm thấy 15 món phù hợp cho Bữa trưa/)).toBeOnTheScreen();
      expect(screen.getByText('15 món')).toBeOnTheScreen();
    });
  });

  it('shortage < 10: blocks room creation and does not allow reduction below 10 (Figma node 1015:9957)', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="shortage_7_dinner" />);

    const previewBtn = screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' });
    await user.press(previewBtn);

    await waitFor(() => {
      expect(screen.getByText('Số món phù hợp')).toBeOnTheScreen();
      expect(screen.getByText('Chưa đủ món')).toBeOnTheScreen();
      expect(screen.getByText(/Hiện có 7 món\. Cần ít nhất 10 món để tạo phòng\./)).toBeOnTheScreen();
      // Only the stepper minus button exists; no reduction button inside the shortage dialog
      const reduceBtns = screen.getAllByRole('button', { name: 'Giảm số món' });
      expect(reduceBtns.length).toBe(1);
      expect(screen.getByRole('button', { name: 'Sửa thiết lập' })).toBeEnabled();
    });
  });

  it('scheduled mode: detects past time, blocks preview, and allows adjustment to valid future time', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="exact_20_lunch" />);

    // Switch to scheduled mode
    await user.press(screen.getByRole('button', { name: 'Hẹn giờ' }));

    // Click Quá khứ (-1 giờ) button
    await user.press(screen.getByRole('button', { name: 'Quá khứ (-1 giờ)' }));

    await waitFor(() => {
      expect(screen.getByText(/DESIRED_TIME_PASSED: Giờ ăn đã qua/)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' })).toBeDisabled();
    });

    // Click adjust to valid time
    await user.press(
      screen.getByRole('button', { name: 'Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)' })
    );

    await waitFor(() => {
      expect(screen.queryByText(/DESIRED_TIME_PASSED/)).toBeNull();
      expect(screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' })).toBeEnabled();
    });
  });

  it('editing draft parameters invalidates stale preview', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="exact_20_lunch" />);

    // Load preview first
    await user.press(screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' }));
    await waitFor(() => {
      expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
    });

    // Change meal to breakfast
    await user.press(screen.getByRole('button', { name: 'Ăn sáng' }));

    // Preview should immediately clear
    await waitFor(() => {
      expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
    });
  });

  it('offline / network error scenario shows error notice and preserves draft', async () => {
    const user = userEvent.setup();
    await render(<DiscoveryContextScreen initialScenario="server_offline" />);

    await user.press(screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' }));

    await waitFor(() => {
      expect(screen.getByText('Lỗi xem trước')).toBeOnTheScreen();
      expect(screen.getByText(/Chưa biết yêu cầu đã được nhận hay chưa/)).toBeOnTheScreen();
    });
  });

  it('allows confirming preview and saving draft receipt', async () => {
    const user = userEvent.setup();
    const handleSave = jest.fn();
    await render(
      <DiscoveryContextScreen
        initialScenario="exact_20_lunch"
        onSaveContext={handleSave}
      />
    );

    await user.press(screen.getByRole('button', { name: '🔍 Xem trước danh sách món (Preview Pool)' }));

    await waitFor(() => {
      expect(screen.getByText('Tôi xác nhận danh sách món và thiết lập phòng')).toBeOnTheScreen();
    });

    // Check confirmation
    await user.press(screen.getByRole('checkbox', { name: 'Tôi xác nhận danh sách món và thiết lập phòng' }));

    // Save draft
    const saveBtn = screen.getByRole('button', { name: 'Xác nhận bản nháp phòng' });
    expect(saveBtn).toBeEnabled();
    await user.press(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Bản nháp đã xác nhận')).toBeOnTheScreen();
      expect(screen.getByText(/Bản nháp đã xác nhận: Ăn trưa · 15 món · Ăn ngay\. Chưa lưu vào phòng\./)).toBeOnTheScreen();
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          mealSlot: 'lunch',
          dishCount: 15,
        })
      );
    });
  });

  it('audit panel verifies 0 byte GPS and dish-only privacy boundary', async () => {
    await render(<DiscoveryContextScreen initialScenario="exact_20_lunch" />);

    expect(screen.getByText('🛡️ BẢO MẬT & QUYỀN RIÊNG TƯ (AUDIT)')).toBeOnTheScreen();
    expect(screen.getByText(/0 byte GPS:/)).toBeOnTheScreen();
    expect(screen.getByText(/Không thu thập, không lưu tọa độ GPS/)).toBeOnTheScreen();
    expect(screen.getByText(/Tách biệt Places:/)).toBeOnTheScreen();
  });
});
