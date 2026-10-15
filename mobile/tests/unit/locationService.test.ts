import {
  calculateDistanceM,
  findNearestAnchor,
  computeEatNowTime,
  validateDesiredTime,
  sanitizeContextForServer,
  redactLocationFromLog,
  MockLocationAdapter,
  LocationService,
  DEFAULT_MAX_COVERAGE_RADIUS_M,
  DEFAULT_EAT_NOW_BUFFER_MINUTES,
  type LocationCoordinates,
  type ContextDraft,
} from '../../src/features/context/services/location';
import type { PublicAnchor } from '../../src/data/api/contracts';

const MOCK_ANCHORS: PublicAnchor[] = [
  {
    id: 'anc_ho_con_rua',
    coverageId: 'cov_quan_3',
    name: 'Hồ Con Rùa',
    address: 'Vòng xoay Công trường Quốc Tế, Phường 6, Quận 3',
    lat: 10.7828,
    lng: 106.6958,
  },
  {
    id: 'anc_pho_di_bo',
    coverageId: 'cov_quan_1',
    name: 'Phố Đi Bộ Nguyễn Huệ',
    address: 'Nguyễn Huệ, Bến Nghé, Quận 1',
    lat: 10.7743,
    lng: 106.7034,
  },
  {
    id: 'anc_dai_hoc_bach_khoa',
    coverageId: 'cov_quan_10',
    name: 'Đại Học Bách Khoa (Cơ sở 1)',
    address: '268 Lý Thường Kiệt, Phường 14, Quận 10',
    lat: 10.7721,
    lng: 106.6579,
  },
];

describe('GM-24 Location Service & Domain Logic', () => {
  describe('calculateDistanceM', () => {
    it('returns 0 for identical coordinates', () => {
      expect(calculateDistanceM(10.7828, 106.6958, 10.7828, 106.6958)).toBe(0);
    });

    it('calculates approximately correct distance between known HCM landmarks', () => {
      // Distance between Hồ Con Rùa and Phố Đi Bộ is approx 1,200 - 1,400 meters
      const distance = calculateDistanceM(10.7828, 106.6958, 10.7743, 106.7034);
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1400);
    });

    it('returns NaN for invalid or non-finite inputs', () => {
      expect(calculateDistanceM(Number.NaN, 106.6958, 10.7743, 106.7034)).toBeNaN();
      expect(calculateDistanceM(10.7828, Number.POSITIVE_INFINITY, 10.7743, 106.7034)).toBeNaN();
    });
  });

  describe('findNearestAnchor', () => {
    it('identifies the nearest public anchor and sorts candidate anchors by distance', () => {
      // User standing right next to Hồ Con Rùa
      const userCoords: LocationCoordinates = { latitude: 10.7827, longitude: 106.6959 };
      const result = findNearestAnchor(userCoords, MOCK_ANCHORS);

      expect(result.nearest?.id).toBe('anc_ho_con_rua');
      expect(result.distanceM).toBeLessThan(50);
      expect(result.isOutsideCoverage).toBe(false);
      expect(result.sortedAnchors[0]?.id).toBe('anc_ho_con_rua');
      expect(result.sortedAnchors[1]?.id).toBe('anc_pho_di_bo');
    });

    it('flags outside coverage when the user coordinates are far away from all anchors', () => {
      // User coordinates in Hanoi (~1,140 km away)
      const hanoiCoords: LocationCoordinates = { latitude: 21.0285, longitude: 105.8542 };
      const result = findNearestAnchor(hanoiCoords, MOCK_ANCHORS, DEFAULT_MAX_COVERAGE_RADIUS_M);

      expect(result.isOutsideCoverage).toBe(true);
      expect(result.distanceM).toBeGreaterThan(1000000);
    });

    it('handles empty anchor list safely', () => {
      const userCoords: LocationCoordinates = { latitude: 10.7828, longitude: 106.6958 };
      const result = findNearestAnchor(userCoords, []);

      expect(result.nearest).toBeNull();
      expect(result.distanceM).toBeNull();
      expect(result.isOutsideCoverage).toBe(true);
      expect(result.sortedAnchors).toHaveLength(0);
    });
  });

  describe('computeEatNowTime (Ăn ngay: server now + buffer once)', () => {
    it('adds designated buffer minutes exactly once to server time', () => {
      const serverTime = '2026-10-15T12:00:00.000Z';
      const eatNowTime = computeEatNowTime(serverTime, 30);

      expect(eatNowTime).toBe('2026-10-15T12:30:00.000Z');
    });

    it('uses default 30 minutes buffer when omitted', () => {
      const serverTime = '2026-10-15T10:00:00.000Z';
      const eatNowTime = computeEatNowTime(serverTime);

      const diffMs = Date.parse(eatNowTime) - Date.parse(serverTime);
      expect(diffMs).toBe(DEFAULT_EAT_NOW_BUFFER_MINUTES * 60 * 1000);
    });

    it('throws on invalid server time format', () => {
      expect(() => computeEatNowTime('invalid-date')).toThrow('INVALID_SERVER_TIME');
    });
  });

  describe('validateDesiredTime (Đặt giờ: no double-buffer & past confirmation)', () => {
    const serverTime = '2026-10-15T12:00:00.000Z';

    it('validates legitimate future time within policy window', () => {
      const desiredAt = '2026-10-15T18:00:00.000Z';
      const result = validateDesiredTime(desiredAt, serverTime);

      expect(result.isValid).toBe(true);
      expect(result.isPast).toBe(false);
      expect(result.isTooFarFuture).toBe(false);
    });

    it('identifies past time and requires confirmation without adding buffer', () => {
      const pastTime = '2026-10-15T11:00:00.000Z';
      const result = validateDesiredTime(pastTime, serverTime);

      expect(result.isValid).toBe(false);
      expect(result.isPast).toBe(true);
      expect(result.messageKey).toBe('DESIRED_TIME_PASSED');
    });

    it('flags time exceeding 7-day policy horizon', () => {
      // 8 days in the future
      const eightDaysFuture = new Date(Date.parse(serverTime) + 8 * 24 * 60 * 60 * 1000).toISOString();
      const result = validateDesiredTime(eightDaysFuture, serverTime);

      expect(result.isValid).toBe(false);
      expect(result.isTooFarFuture).toBe(true);
      expect(result.messageKey).toBe('DESIRED_TIME_TOO_FAR');
    });

    it('returns error on malformed timestamp', () => {
      const result = validateDesiredTime('invalid-time', serverTime);
      expect(result.isValid).toBe(false);
      expect(result.messageKey).toBe('INVALID_INPUT');
    });
  });

  describe('Privacy Boundary: sanitizeContextForServer & redactLocationFromLog', () => {
    it('sanitizes room context, including only authorized discovery fields and NO raw GPS', () => {
      const draft: ContextDraft & { latitude?: number; longitude?: number; rawGps?: string } = {
        anchorId: 'anc_ho_con_rua',
        anchorName: 'Hồ Con Rùa',
        radiusM: 1500,
        desiredAt: '2026-10-15T12:30:00.000Z',
        serviceMode: 'dine_in',
        mealSlot: 'lunch',
        budget: 75000,
        avoidRecent: true,
        // Prohibited coordinates inadvertently attached
        latitude: 10.7828,
        longitude: 106.6958,
        rawGps: '10.7828,106.6958',
      };

      const sanitized = sanitizeContextForServer(draft);

      expect(sanitized).toEqual({
        anchorId: 'anc_ho_con_rua',
        anchorName: 'Hồ Con Rùa',
        radiusM: 1500,
        desiredAt: '2026-10-15T12:30:00.000Z',
        serviceMode: 'dine_in',
        mealSlot: 'lunch',
        budget: 75000,
        avoidRecent: true,
      });

      expect('latitude' in sanitized).toBe(false);
      expect('longitude' in sanitized).toBe(false);
      expect('rawGps' in sanitized).toBe(false);
      expect('coords' in sanitized).toBe(false);
    });

    it('throws error when radius exceeds maximum policy or is invalid', () => {
      const baseDraft: ContextDraft = {
        anchorId: 'anc_ho_con_rua',
        radiusM: 15000, // exceeds 10,000 m policy
        desiredAt: '2026-10-15T12:30:00.000Z',
        serviceMode: 'dine_in',
        mealSlot: 'lunch',
        avoidRecent: false,
      };

      expect(() => sanitizeContextForServer(baseDraft)).toThrow('RADIUS_EXCEEDS_POLICY');
      expect(() => sanitizeContextForServer({ ...baseDraft, radiusM: 0 })).toThrow('INVALID_RADIUS');
      expect(() => sanitizeContextForServer({ ...baseDraft, anchorId: '' })).toThrow('INVALID_ANCHOR_ID');
    });

    it('redactLocationFromLog recursively strips sensitive GPS keys from logs', () => {
      const debugPayload = {
        event: 'LOCATION_FETCHED',
        user: { id: 'usr_1', latitude: 10.7828, longitude: 106.6958 },
        device: { coords: { lat: 10.7828, lng: 106.6958, accuracy: 5 } },
        nestedList: [{ rawGps: 'secret', anchorId: 'anc_1' }],
      };

      const redacted = redactLocationFromLog(debugPayload);

      expect(redacted).toEqual({
        event: 'LOCATION_FETCHED',
        user: { id: 'usr_1', latitude: '[REDACTED_GPS]', longitude: '[REDACTED_GPS]' },
        device: { coords: '[REDACTED_GPS]' },
        nestedList: [{ rawGps: '[REDACTED_GPS]', anchorId: 'anc_1' }],
      });
    });
  });

  describe('LocationService & MockLocationAdapter Integration', () => {
    let mockAdapter: MockLocationAdapter;
    let service: LocationService;

    beforeEach(() => {
      mockAdapter = new MockLocationAdapter('undetermined', {
        latitude: 10.7828,
        longitude: 106.6958,
      });
      service = new LocationService({ adapter: mockAdapter });
    });

    it('resolves nearest public anchor when permission is granted', async () => {
      mockAdapter.setPermissionStatus('granted');
      const resolution = await service.resolveWithGps(MOCK_ANCHORS);

      expect(resolution.mode).toBe('gps');
      expect(resolution.permission).toBe('granted');
      expect(resolution.selectedAnchor?.id).toBe('anc_ho_con_rua');
      expect(resolution.distanceM).toBe(0);
      expect(resolution.isOutsideCoverage).toBe(false);
      expect(resolution.errorMessage).toBeNull();
    });

    it('gracefully falls back to manual mode when permission is denied', async () => {
      mockAdapter.setPermissionStatus('denied');
      const resolution = await service.resolveWithGps(MOCK_ANCHORS);

      expect(resolution.mode).toBe('manual');
      expect(resolution.permission).toBe('denied');
      expect(resolution.coords).toBeNull();
      expect(resolution.selectedAnchor?.id).toBe('anc_ho_con_rua'); // fallback default anchor
      expect(resolution.errorMessage).toContain('Quyền vị trí bị từ chối');
    });

    it('falls back to manual mode when GPS provider fails or is turned off', async () => {
      mockAdapter.setPermissionStatus('granted');
      mockAdapter.setSimulateFailure(true);

      const resolution = await service.resolveWithGps(MOCK_ANCHORS);

      expect(resolution.mode).toBe('manual');
      expect(resolution.permission).toBe('unavailable');
      expect(resolution.coords).toBeNull();
      expect(resolution.errorMessage).toBe('GPS_POSITION_UNAVAILABLE');
    });

    it('flags outside coverage when GPS is far from all available coverage anchors', async () => {
      mockAdapter.setPermissionStatus('granted');
      mockAdapter.setCoordinates({ latitude: 16.0544, longitude: 108.2022 }); // Da Nang

      const resolution = await service.resolveWithGps(MOCK_ANCHORS);

      expect(resolution.mode).toBe('manual');
      expect(resolution.isOutsideCoverage).toBe(true);
      expect(resolution.errorMessage).toContain('ngoài khu vực hỗ trợ');
    });

    it('allows explicit manual anchor selection regardless of GPS state', () => {
      const manualRes = service.resolveManual('anc_dai_hoc_bach_khoa', MOCK_ANCHORS);

      expect(manualRes.mode).toBe('manual');
      expect(manualRes.selectedAnchor?.id).toBe('anc_dai_hoc_bach_khoa');
      expect(manualRes.selectedAnchor?.name).toBe('Đại Học Bách Khoa (Cơ sở 1)');
      expect(manualRes.coords).toBeNull();
    });

    it('resolves Eat Now time context with 30-minute buffer once', () => {
      const serverTime = '2026-10-15T09:00:00.000Z';
      const timeRes = service.resolveEatNow(serverTime);

      expect(timeRes.mode).toBe('now');
      expect(timeRes.desiredAt).toBe('2026-10-15T09:30:00.000Z');
      expect(timeRes.isPast).toBe(false);
      expect(timeRes.requiresConfirmation).toBe(false);
    });

    it('resolves Scheduled time without double buffer and detects past confirmation requirements', () => {
      const serverTime = '2026-10-15T12:00:00.000Z';
      const pastTime = '2026-10-15T11:30:00.000Z';

      // Unconfirmed past time
      const unconfirmed = service.resolveScheduledTime(pastTime, serverTime, false);
      expect(unconfirmed.mode).toBe('scheduled');
      expect(unconfirmed.isPast).toBe(true);
      expect(unconfirmed.requiresConfirmation).toBe(true);
      expect(unconfirmed.confirmedPast).toBe(false);

      // Confirmed past time
      const confirmed = service.resolveScheduledTime(pastTime, serverTime, true);
      expect(confirmed.mode).toBe('scheduled');
      expect(confirmed.isPast).toBe(true);
      expect(confirmed.requiresConfirmation).toBe(false);
      expect(confirmed.confirmedPast).toBe(true);
    });
  });
});
