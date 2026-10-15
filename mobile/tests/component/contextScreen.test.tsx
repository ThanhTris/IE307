import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { ContextScreen } from '../../src/features/context/screens/ContextScreen';

describe('GM-24 ContextScreen Component & Scenarios', () => {
  it('renders correctly with default scenario and displays all core sections', async () => {
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    expect(screen.getByText('Bối cảnh & Vị trí phòng')).toBeOnTheScreen();
    expect(screen.getByText('🧪 Kịch bản thử nghiệm')).toBeOnTheScreen();
    expect(screen.getByText('📍 Điểm hẹn công cộng')).toBeOnTheScreen();
    expect(screen.getByText('📏 Bán kính tìm quán')).toBeOnTheScreen();
    expect(screen.getByText('⏰ Thời gian ăn')).toBeOnTheScreen();
    expect(screen.getByText('🍽️ Buổi ăn & Hình thức')).toBeOnTheScreen();
    expect(screen.getByText('🛡️ BẢO MẬT & QUYỀN RIÊNG TƯ (AUDIT)')).toBeOnTheScreen();
  });

  it('scenario gps_grant_rua suggests nearest anchor (Hồ Con Rùa) with distance badge', async () => {
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    await waitFor(() => {
      expect(screen.getAllByText('Hồ Con Rùa').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Cách bạn ~0 m/)).toBeOnTheScreen();
    });
  });

  it('scenario gps_grant_dibo suggests Phố Đi Bộ Nguyễn Huệ', async () => {
    await render(<ContextScreen initialScenario="gps_grant_dibo" />);

    await waitFor(() => {
      expect(screen.getAllByText('Phố Đi Bộ Nguyễn Huệ').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('scenario gps_deny displays permission denied message and enables manual mode', async () => {
    await render(<ContextScreen initialScenario="gps_deny" />);

    await waitFor(() => {
      expect(screen.getByText('Quyền vị trí bị từ chối')).toBeOnTheScreen();
      expect(screen.getByText(/Quyền vị trí bị từ chối\. Vui lòng chọn điểm hẹn công cộng thủ công\./)).toBeOnTheScreen();
      expect(screen.getByText('✍️ Chọn thủ công')).toBeOnTheScreen();
    });
  });

  it('scenario gps_off displays GPS unavailable message and falls back to manual', async () => {
    await render(<ContextScreen initialScenario="gps_off" />);

    await waitFor(() => {
      expect(screen.getByText('Thông báo định vị')).toBeOnTheScreen();
      expect(screen.getByText(/GPS_POSITION_UNAVAILABLE/)).toBeOnTheScreen();
    });
  });

  it('scenario gps_outside_hanoi flags outside coverage warning with manual override', async () => {
    await render(<ContextScreen initialScenario="gps_outside_hanoi" />);

    await waitFor(() => {
      expect(screen.getByText('Vị trí ngoài vùng hỗ trợ')).toBeOnTheScreen();
      expect(screen.getByText('Ngoài vùng phủ sóng')).toBeOnTheScreen();
    });
  });

  it('allows manual selection of any public anchor and updates the context', async () => {
    const user = userEvent.setup();
    await render(<ContextScreen initialScenario="manual_only" />);

    await waitFor(() => {
      expect(screen.getByText('Đại Học Bách Khoa (Cơ sở 1)')).toBeOnTheScreen();
    });

    await user.press(screen.getByText('Đại Học Bách Khoa (Cơ sở 1)'));

    await waitFor(() => {
      expect(screen.getByText('268 Lý Thường Kiệt, Phường 14, Quận 10')).toBeOnTheScreen();
    });
  });

  it('time resolution: Eat Now mode adds 30 min buffer once from server time', async () => {
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    await waitFor(() => {
      expect(screen.getByText(/⚡ Ăn ngay \(Buffer 30p\)/)).toBeOnTheScreen();
      expect(screen.getByText(/Đã cộng 30 phút chuẩn bị một lần duy nhất từ giờ máy chủ\./)).toBeOnTheScreen();
    });
  });

  it('time resolution: Scheduled mode detects past time and requires confirmation', async () => {
    const user = userEvent.setup();
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    // Switch to Scheduled mode
    await user.press(screen.getByText('🕒 Đặt giờ trước'));

    // Select -1 hour offset (in the past relative to server time)
    await user.press(screen.getByText('Quá khứ (-1 giờ)'));

    await waitFor(() => {
      expect(screen.getByText(/Giờ đã chọn nằm trong quá khứ so với giờ máy chủ!/)).toBeOnTheScreen();
      expect(screen.getByText('Xác nhận giờ này')).toBeOnTheScreen();
    });

    // Press confirm
    await user.press(screen.getByText('Xác nhận giờ này'));

    await waitFor(() => {
      expect(screen.queryByText(/Giờ đã chọn nằm trong quá khứ so với giờ máy chủ!/)).toBeNull();
    });
  });

  it('privacy audit panel explicitly confirms 0 raw GPS in server payload', async () => {
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    await waitFor(() => {
      expect(screen.getByText(/Đã kiểm toán: 0 tọa độ GPS thô được gửi trong log, request hoặc cơ sở dữ liệu\./)).toBeOnTheScreen();
      expect(screen.getByText(/anchorId/)).toBeOnTheScreen();
      expect(screen.queryByText(/"latitude":/)).toBeNull();
      expect(screen.queryByText(/"longitude":/)).toBeNull();
    });
  });

  it('displays error and retry action when server is offline', async () => {
    const user = userEvent.setup();
    await render(<ContextScreen initialScenario="server_offline" />);

    await waitFor(() => {
      expect(screen.getByText('Lỗi tải dữ liệu khu vực')).toBeOnTheScreen();
      expect(screen.getByText('Thử lại kết nối')).toBeOnTheScreen();
    });

    // Clicking retry attempts to reload
    await user.press(screen.getByText('Thử lại kết nối'));
  });

  it('scenario switching in UI dynamically reconfigures location service', async () => {
    const user = userEvent.setup();
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    await waitFor(() => {
      expect(screen.getAllByText('Hồ Con Rùa').length).toBeGreaterThanOrEqual(1);
    });

    // Switch to Phố Đi Bộ scenario chip
    await user.press(screen.getByText('Phố Đi Bộ'));

    await waitFor(() => {
      expect(screen.getAllByText('Phố Đi Bộ Nguyễn Huệ').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('onSaveContext passes pure sanitized RoomContext without coordinates', async () => {
    const user = userEvent.setup();
    const handleSave = jest.fn();

    await render(
      <ContextScreen
        initialScenario="gps_grant_rua"
        onSaveContext={handleSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Xác nhận bối cảnh phòng')).toBeOnTheScreen();
    });

    await user.press(screen.getByText('Xác nhận bối cảnh phòng'));

    expect(handleSave).toHaveBeenCalledTimes(1);
    const savedContext = handleSave.mock.calls[0][0];

    expect(savedContext.anchorId).toBe('anc_ho_con_rua');
    expect(savedContext.radiusM).toBe(1500);
    expect(savedContext.mealSlot).toBe('lunch');
    expect(savedContext.serviceMode).toBe('dine_in');
    expect(savedContext.avoidRecent).toBe(false);
    expect('latitude' in savedContext).toBe(false);
    expect('longitude' in savedContext).toBe(false);
    expect('coords' in savedContext).toBe(false);
  });
});
