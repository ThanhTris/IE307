import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import type { ApiClient } from '../../src/data/api/contracts';
import { Gm24ContextScreen as ContextScreen } from '../../src/features/context/screens/Gm24ContextScreen';

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

  it('time resolution: Eat Now mode adds 15 min buffer once from server time', async () => {
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    await waitFor(() => {
      expect(screen.getByText(/⚡ Ăn ngay \(Buffer 15p\)/)).toBeOnTheScreen();
      expect(screen.getByText(/Đã cộng 15 phút chuẩn bị một lần duy nhất từ giờ máy chủ\./)).toBeOnTheScreen();
    });
  });

  it('time resolution: Scheduled mode detects past time, blocks saving, and allows adjustment to valid future time', async () => {
    const user = userEvent.setup();
    const handleSave = jest.fn();

    await render(
      <ContextScreen
        initialScenario="manual_only"
        onSaveContext={handleSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('🕒 Đặt giờ trước')).toBeOnTheScreen();
    });

    // Switch to Scheduled mode
    await user.press(screen.getByText('🕒 Đặt giờ trước'));

    // Select -1 hour offset (in the past relative to server time)
    await user.press(screen.getByText('Quá khứ (-1 giờ)'));

    await waitFor(() => {
      expect(screen.getByText(/Giờ đã chọn nằm trong quá khứ so với giờ máy chủ!/)).toBeOnTheScreen();
      expect(screen.getAllByText(/DESIRED_TIME_PASSED/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)')).toBeOnTheScreen();
    });

    // Attempting to press save button must NOT trigger handleSave because time is in past
    await user.press(screen.getByText('Xác nhận bối cảnh phòng'));
    expect(handleSave).not.toHaveBeenCalled();

    // User clicks "Điều chỉnh thành giờ hợp lệ"
    await user.press(screen.getByText('Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)'));

    await waitFor(() => {
      expect(screen.queryByText(/Giờ đã chọn nằm trong quá khứ so với giờ máy chủ!/)).toBeNull();
    });

    // Now saving is permitted and sends a valid future desiredAt
    await user.press(screen.getByText('Xác nhận bối cảnh phòng'));
    expect(handleSave).toHaveBeenCalledTimes(1);
    const saved = handleSave.mock.calls[0][0];
    expect(Date.parse(saved.desiredAt)).toBeGreaterThan(Date.parse('2026-10-15T11:30:00.000Z'));
  });

  it('privacy audit panel explicitly confirms 0 raw GPS in server payload and client logs', async () => {
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    await waitFor(() => {
      expect(screen.getByText(/Bảo đảm quyền riêng tư: Payload gửi máy chủ chỉ chứa anchorId, không chứa tọa độ GPS thô/)).toBeOnTheScreen();
      expect(screen.getByText(/anchorId/)).toBeOnTheScreen();
      expect(screen.queryByText(/"latitude":/)).toBeNull();
      expect(screen.queryByText(/"longitude":/)).toBeNull();
    });
  });

  it('displays error and retry action when server is offline, then clears error on scenario recovery', async () => {
    const user = userEvent.setup();
    await render(<ContextScreen initialScenario="server_offline" />);

    await waitFor(() => {
      expect(screen.getByText('Lỗi tải dữ liệu khu vực')).toBeOnTheScreen();
      expect(screen.getByText('Thử lại kết nối')).toBeOnTheScreen();
    });

    // Transition from server_offline error to "Thủ công"
    await user.press(screen.getByText('Thủ công'));

    // Stale server error must be completely cleared upon successful data load
    await waitFor(() => {
      expect(screen.queryByText('Lỗi tải dữ liệu khu vực')).toBeNull();
      expect(screen.getAllByText('Hồ Con Rùa').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('preserves user selected scheduled time mode across data reloads and retries', async () => {
    const user = userEvent.setup();
    await render(<ContextScreen initialScenario="manual_only" />);

    await waitFor(() => {
      expect(screen.getByText('🕒 Đặt giờ trước')).toBeOnTheScreen();
    });

    // Switch to Scheduled mode and select +3 hours
    await user.press(screen.getByText('🕒 Đặt giờ trước'));
    await user.press(screen.getByText('+3 giờ'));

    // Switch to another scenario that reloads discovery
    await user.press(screen.getAllByText('Hồ Con Rùa')[0]!);

    await waitFor(() => {
      // Must still be in Scheduled mode, NOT reset to Eat Now
    expect(screen.queryByText(/Đã cộng 15 phút chuẩn bị một lần duy nhất từ giờ máy chủ\./)).toBeNull();
    });
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

  it('supports toggling to real API mode with endpoint information', async () => {
    const user = userEvent.setup();
    await render(<ContextScreen initialScenario="gps_grant_rua" />);

    await waitFor(() => {
      expect(screen.getByText('🌐 Máy chủ thật (Live Supabase API)')).toBeOnTheScreen();
    });

    await user.press(screen.getByText('🌐 Máy chủ thật (Live Supabase API)'));

    await waitFor(() => {
      expect(screen.getByText(/Trạng thái kết nối:/)).toBeOnTheScreen();
      expect(screen.getByText(/Endpoint:/)).toBeOnTheScreen();
    });
  });

  it('clears a previously selected mock anchor when live discovery returns 401', async () => {
    const user = userEvent.setup();
    const handleSave = jest.fn();
    const client = {
      getDiscoveryContext: jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          data: {
            serverTime: '2026-10-15T11:30:00.000Z',
            anchors: [{
              id: 'anc_ho_con_rua',
              coverageId: 'cov_hcm',
              name: 'Hồ Con Rùa',
              address: 'Công trường Quốc Tế, Quận 3',
              lat: 10.7828,
              lng: 106.6958,
            }],
            coverageAreas: [],
          },
        })
        .mockResolvedValue({ ok: false, error: { messageKey: 'AUTH_REQUIRED' } }),
    } as unknown as ApiClient;

    await render(
      <ContextScreen
        apiClient={client}
        initialScenario="manual_only"
        onSaveContext={handleSave}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Hồ Con Rùa').length).toBeGreaterThanOrEqual(1);
    });

    await user.press(screen.getByText('🌐 Máy chủ thật (Live Supabase API)'));

    await waitFor(() => {
      expect(screen.queryByText('Công trường Quốc Tế, Quận 3')).toBeNull();
      expect(screen.getByText(/Lỗi tải dữ liệu khu vực/)).toBeOnTheScreen();
    });

    expect(handleSave).not.toHaveBeenCalled();
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
      expect(screen.getAllByText('Hồ Con Rùa').length).toBeGreaterThanOrEqual(1);
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
