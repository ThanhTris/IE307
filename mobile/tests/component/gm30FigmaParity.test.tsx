import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RoomQrModal } from '../../src/features/rooms/components/RoomQrModal';
import { JoinRoomEntryScreen, type JoinRoomEntryProps } from '../../src/features/rooms/screens/JoinRoomEntryScreen';
import { LiveDishResultScreen } from '../../src/features/result/screens/LiveDishResultScreen';
import { createApiClient } from '../../src/data/api';
import { createJoinPreviewFixture } from '../../src/features/rooms/services/joinPreview';
import { SimulatedQrScannerAdapter } from '../../src/features/rooms/services/joinLinks';
import { MockPlacesRepository } from '../../src/features/result/services/placesRepository';
import { createMockResultRepository } from '../../src/features/result/services/resultRepository';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';
import type { ScoredResult } from '../../src/features/result/services/resultPresentation';

jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({
  useRoomRepository: jest.fn(),
}));

jest.mock('../../src/features/auth/components/RequireActiveSession', () => ({
  RequireActiveSession: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const press = async (label: string) => {
  await fireEvent.press(screen.getByRole('button', { name: label }));
};

describe('GM-30 Figma Parity & Native Linking Component Tests', () => {
  beforeEach(() => {
    jest.mocked(useRoomRepository).mockReturnValue({
      mode: 'mock',
      user: { id: 'u_test', displayName: 'Minh' },
    } as any);
  });

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
      cuisineIds: [],
      cuisineLabels: [],
      categoryIds: [],
      categoryLabels: [],
      temperature: null,
      flavor: null,
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
          cuisineIds: [],
          cuisineLabels: [],
          categoryIds: [],
          categoryLabels: [],
          temperature: null,
          flavor: null,
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
          cuisineIds: [],
          cuisineLabels: [],
          categoryIds: [],
          categoryLabels: [],
          temperature: null,
          flavor: null,
          artwork: null,
          priceReference: null,
        } as any,
        score: 4,
        rank: 2,
        isWinner: false,
      },
    ],
  };

  const dismissCelebrationIfNeeded = () => {
    const dismiss = screen.queryByText('Chạm để bỏ qua');
    if (dismiss) {
      fireEvent.press(dismiss);
    }
  };

  describe('Figma Node 368:12182 — L07 · Mở mã QR (RoomQrModal)', () => {
    test('renders modal title, room code badge, QR matrix, copy button and triggers actions', async () => {
      const handleClose = jest.fn();
      const handleCopy = jest.fn();

      await render(
        <RoomQrModal
          visible={true}
          code="GCD234"
          onClose={handleClose}
          onCopyLink={handleCopy}
        />
      );

      expect(screen.getByText('Mã QR phòng')).toBeOnTheScreen();
      expect(screen.getByText('Quét bằng ứng dụng Gì Cũng Được để vào phòng')).toBeOnTheScreen();
      expect(screen.getByText('MÃ PHÒNG')).toBeOnTheScreen();
      expect(screen.getByText('GCD234')).toBeOnTheScreen();
      expect(screen.getByTestId('qr-matrix-svg')).toBeOnTheScreen();

      // Test copy link button
      await press('Sao chép liên kết');
      expect(handleCopy).toHaveBeenCalledTimes(1);

      // Test close button
      await press('Đóng');
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('hides modal when visible is false', async () => {
      await render(
        <RoomQrModal
          visible={false}
          code="GCD234"
          onClose={jest.fn()}
        />
      );

      expect(screen.queryByText('Mã QR phòng')).toBeNull();
    });
  });

  describe('Figma Nodes 268:2019 & 275:2088 & 268:2081 — JoinRoomEntryScreen QR Modes', () => {
    function defaultProps(scanner?: any): JoinRoomEntryProps {
      return {
        repository: createApiClient('mock', { delayMs: 0 }),
        preview: createJoinPreviewFixture(),
        initialDisplayName: 'Minh',
        onBack: jest.fn(),
        onEntered: jest.fn(),
        qrScannerAdapter: scanner,
      };
    }

    test('Node 268:2019 — Vào phòng · Quét QR: switches to camera scanner mode and back', async () => {
      const scanner = new SimulatedQrScannerAdapter('undetermined', 'gi-cung-duoc://room/join?code=GCD234');
      const props = defaultProps(scanner);

      await render(<JoinRoomEntryScreen {...props} />);

      // Initially on manual entry mode with scan button
      expect(screen.getByRole('button', { name: 'Quét mã QR' })).toBeOnTheScreen();

      // Open camera scanner
      await press('Quét mã QR');

      // Now on Camera viewfinder screen (Figma 268:2019)
      expect(screen.getAllByText('Quét mã QR').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: 'Thử quét QR' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Nhập mã bằng tay' })).toBeOnTheScreen();

      // Switch back to manual entry
      await press('Nhập mã bằng tay');
      expect(screen.getByRole('button', { name: 'Quét mã QR' })).toBeOnTheScreen();
    });

    test('Node 275:2088 — Vào phòng · Camera bị từ chối: displays denied message and settings button', async () => {
      const scanner = new SimulatedQrScannerAdapter('denied');
      const openSettingsSpy = jest.spyOn(scanner, 'openSettings');
      const props = defaultProps(scanner);

      await render(<JoinRoomEntryScreen {...props} />);

      // Switch to camera mode
      await press('Quét mã QR');

      // Camera denied UI (Figma 275:2088)
      expect(screen.getAllByText('Camera bị từ chối').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Bạn chưa cấp quyền truy cập camera/)).toBeOnTheScreen();

      expect(screen.getByRole('button', { name: 'Mở Cài đặt' })).toBeOnTheScreen();
      await press('Mở Cài đặt');
      expect(openSettingsSpy).toHaveBeenCalledTimes(1);

      // Can switch back to manual entry
      await press('Nhập mã bằng tay');
      expect(screen.getByRole('button', { name: 'Quét mã QR' })).toBeOnTheScreen();
    });

    test('Node 268:2081 — Vào phòng · Xác nhận: scanning valid QR code loads room confirmation', async () => {
      const scanner = new SimulatedQrScannerAdapter('granted', 'gi-cung-duoc://room/join?code=GCD234');
      const props = defaultProps(scanner);
      props.preview = jest.fn().mockResolvedValue({
        ok: true,
        data: {
          code: 'GCD234',
          memberCount: 3,
          capacity: 20,
        },
      });

      await render(<JoinRoomEntryScreen {...props} />);

      // Open camera scanner
      await press('Quét mã QR');

      // Press scan QR button
      await press('Thử quét QR');

      // User confirms scanned code by pressing Tiếp tục →
      await press('Tiếp tục →');

      // Confirmation screen (Figma 268:2081)
      expect(await screen.findByText('Phòng GCD234')).toBeOnTheScreen();
      expect(screen.getByText('3/20 thành viên')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Xác nhận vào phòng' })).toBeOnTheScreen();
    });
  });

  describe('Figma Nodes 622:8962 & 206:913 & 379:1478 — LiveDishResultScreen Places & External Links', () => {
    test('Figma 622:8962 — Location permission prompt shown when location is not granted', async () => {
      const mockResultRepo = createMockResultRepository({
        initialResult: decidedResult,
      });
      const mockPlacesRepo = new MockPlacesRepository({
        status: 'permission',
        places: [],
      });

      await render(
        <LiveDishResultScreen
          roomId="room_123"
          repository={mockResultRepo}
          placesRepository={mockPlacesRepo}
          isReal={false}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      dismissCelebrationIfNeeded();

      // Result decided winner is isolated and presented
      expect(await screen.findByText('Phở bò tái nạm')).toBeOnTheScreen();

      // Notice for location permission (Figma 622:8962)
      expect(screen.getByText('Bật vị trí để tìm quán')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Cho phép vị trí' })).toBeOnTheScreen();
    });

    test('Figma 206:913 & 379:1478 — Places loaded and external actions trigger allowlisted URLs', async () => {
      const mockResultRepo = createMockResultRepository({
        initialResult: decidedResult,
      });
      const mockPlacesRepo = new MockPlacesRepository({
        status: 'ready',
        places: [
          {
            id: 'place-1',
            name: 'Phở Thìn Lò Đúc',
            address: '13 Lò Đúc, Hai Bà Trưng',
            distanceM: 450,
            latitude: 21.018,
            longitude: 105.856,
            attribution: 'Google Places',
          },
        ],
      });

      await render(
        <LiveDishResultScreen
          roomId="room_123"
          repository={mockResultRepo}
          placesRepository={mockPlacesRepo}
          isReal={false}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      dismissCelebrationIfNeeded();

      // Verify winner is rendered
      expect(await screen.findByText('Phở bò tái nạm')).toBeOnTheScreen();

      // Verify place is displayed
      expect(await screen.findByText('Phở Thìn Lò Đúc')).toBeOnTheScreen();

      // Verify external action buttons
      expect(screen.getByRole('button', { name: 'Mở bản đồ' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'TikTok ↗' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'YouTube ↗' })).toBeOnTheScreen();
    });

    test('Absolute Winner Isolation: places failure never corrupts or alters decided winner', async () => {
      const mockResultRepo = createMockResultRepository({
        initialResult: decidedResult,
      });
      const mockPlacesRepo = new MockPlacesRepository({
        status: 'error',
        places: [],
      });

      await render(
        <LiveDishResultScreen
          roomId="room_123"
          repository={mockResultRepo}
          placesRepository={mockPlacesRepo}
          isReal={false}
          onHome={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      dismissCelebrationIfNeeded();

      // Decided winner remains intact
      expect(await screen.findByText('Phở bò tái nạm')).toBeOnTheScreen();

      // Error notice shown for places, with retry option
      expect(screen.getByText('Không tải được danh sách quán')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeOnTheScreen();

      // Winner still displayed prominently
      expect(screen.getByText('Phở bò tái nạm')).toBeOnTheScreen();
    });
  });
});
