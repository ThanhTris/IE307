import {
  createPlacesRepository,
  LivePlacesRepository,
  MockPlacesRepository,
} from '../../src/features/result/services/placesRepository';
import { MockLocationAdapter } from '../../src/features/context/services/location/MockLocationAdapter';
import type { LocationAdapter, LocationPermissionStatus } from '../../src/features/context/services/location/types';

describe('GM-30 placesRepository — Places Client Integration & Winner Isolation', () => {
  describe('Absolute Winner Isolation & Error Guard', () => {
    test('never throws on network error or quota exceeded; returns safe ReadResult with status error', async () => {
      const failingAdapter: LocationAdapter = {
        getPermissionStatus: async () => 'granted',
        requestPermission: async () => 'granted',
        getCurrentCoordinates: async () => {
          throw new Error('GPS sensor timeout');
        },
      };

      const repo = new LivePlacesRepository({ locationAdapter: failingAdapter });
      const result = await repo.fetchNearbyPlaces({
        resultId: 'res_01',
        winnerDishId: 'dish_01',
        dishName: 'Bún Bò Huế',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.resultId).toBe('res_01');
        expect(result.data.winnerDishId).toBe('dish_01');
        expect(result.data.status).toBe('error');
        expect(result.data.places).toEqual([]);
      }
    });

    test('rejects missing resultId or winnerDishId with INVALID_INPUT', async () => {
      const repo = new LivePlacesRepository();
      const resMissingResult = await repo.fetchNearbyPlaces({
        resultId: '',
        winnerDishId: 'dish_01',
        dishName: 'Phở',
      });
      expect(resMissingResult).toEqual({
        ok: false,
        error: { messageKey: 'INVALID_INPUT', message: 'Missing required result or dish information' },
      });

      const resMissingDish = await repo.fetchNearbyPlaces({
        resultId: 'res_01',
        winnerDishId: '',
        dishName: 'Phở',
      });
      expect(resMissingDish).toEqual({
        ok: false,
        error: { messageKey: 'INVALID_INPUT', message: 'Missing required result or dish information' },
      });
    });
  });

  describe('Location Permission States', () => {
    const makeAdapterWithPermission = (permission: LocationPermissionStatus): LocationAdapter => ({
      getPermissionStatus: async () => permission,
      requestPermission: async () => permission,
      getCurrentCoordinates: async () => ({ latitude: 10.7769, longitude: 106.7009 }),
    });

    test('undetermined permission returns status permission (Figma 622:8962)', async () => {
      const repo = new LivePlacesRepository({
        locationAdapter: makeAdapterWithPermission('undetermined'),
      });
      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Bánh Xèo',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('permission');
        expect(res.data.places).toEqual([]);
      }
    });

    test('denied permission returns status denied', async () => {
      const repo = new LivePlacesRepository({
        locationAdapter: makeAdapterWithPermission('denied'),
      });
      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Bánh Cuốn',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('denied');
      }
    });

    test('off permission returns status location-off', async () => {
      const repo = new LivePlacesRepository({
        locationAdapter: makeAdapterWithPermission('off'),
      });
      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Hủ Tiếu Nam Vang',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('location-off');
      }
    });

    test('unavailable permission returns status unsupported', async () => {
      const repo = new LivePlacesRepository({
        locationAdapter: makeAdapterWithPermission('unavailable'),
      });
      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Chè Bưởi',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('unsupported');
      }
    });
  });

  describe('Dev Simulated AVD Mode', () => {
    test('generates labeled simulated venues when isDevSimulated is true or apiKey is missing', async () => {
      const locAdapter = new MockLocationAdapter('granted', { latitude: 10.7769, longitude: 106.7009 });

      const repo = new LivePlacesRepository({
        locationAdapter: locAdapter,
        config: { isDevSimulated: true },
      });

      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Phở Bò',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('ready');
        expect(res.data.places.length).toBeGreaterThan(0);
        expect(res.data.places[0]!.name).toContain('Phở Bò');
        expect(res.data.places[0]!.attribution).toContain('Dữ liệu mô phỏng trên máy ảo AVD');
        expect(typeof res.data.places[0]!.distanceM).toBe('number');
      }
    });
  });

  describe('Real Google Places API Call', () => {
    let originalFetch: any;

    beforeEach(() => {
      originalFetch = (globalThis as any).fetch;
    });

    afterEach(() => {
      (globalThis as any).fetch = originalFetch;
    });

    test('formats Places API request and maps response fields with attribution and distance', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          places: [
            {
              id: 'places/ChIJ123456789',
              displayName: { text: 'Quán Phở Thìn Lò Đúc' },
              formattedAddress: '13 Lò Đúc, Hà Nội',
              location: { latitude: 10.78, longitude: 106.71 },
            },
            {
              id: 'places/ChIJ987654321',
              displayName: { text: 'Phở 10 Lý Quốc Sư' },
              formattedAddress: '10 Lý Quốc Sư, Hà Nội',
              location: { latitude: 10.79, longitude: 106.72 },
            },
          ],
        }),
      });
      (globalThis as any).fetch = mockFetch;

      const locAdapter = new MockLocationAdapter('granted', { latitude: 10.7769, longitude: 106.7009 });

      const repo = new LivePlacesRepository({
        locationAdapter: locAdapter,
        config: {
          apiKey: 'AIzaSy_TEST_KEY',
          isDevSimulated: false,
        },
      });

      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Phở Tái Lăn',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
      expect(options.headers['X-Goog-Api-Key']).toBe('AIzaSy_TEST_KEY');
      expect(options.headers['X-Goog-FieldMask']).toContain('places.displayName');

      const body = JSON.parse(options.body);
      expect(body.textQuery).toBe('quán Phở Tái Lăn');
      expect(body.locationBias.circle.center.latitude).toBe(10.7769);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('ready');
        expect(res.data.places).toHaveLength(2);
        expect(res.data.places[0]!.id).toBe('places/ChIJ123456789');
        expect(res.data.places[0]!.name).toBe('Quán Phở Thìn Lò Đúc');
        expect(res.data.places[0]!.attribution).toBe('Dữ liệu quán từ Google Places API');
        expect(typeof res.data.places[0]!.distanceM).toBe('number');
      }
    });

    test('returns empty status when Google Places returns 0 places', async () => {
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ places: [] }),
      });

      const locAdapter = new MockLocationAdapter('granted', { latitude: 10.7769, longitude: 106.7009 });

      const repo = new LivePlacesRepository({
        locationAdapter: locAdapter,
        config: { apiKey: 'TEST_KEY', isDevSimulated: false },
      });

      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Món Rất Hiếm Không Ai Bán',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('empty');
        expect(res.data.places).toEqual([]);
      }
    });

    test('returns error status when Google Places API responds with 403 or 500', async () => {
      (globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const locAdapter = new MockLocationAdapter('granted', { latitude: 10.7769, longitude: 106.7009 });

      const repo = new LivePlacesRepository({
        locationAdapter: locAdapter,
        config: { apiKey: 'TEST_KEY', isDevSimulated: false },
      });

      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Cơm Gà',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('error');
        expect(res.data.places).toEqual([]);
      }
    });
  });

  describe('Monotonic Epochs & Cancellation', () => {
    test('superseded request is aborted and does not overwrite current result', async () => {
      let resolveFirst: (v: any) => void;
      const firstPromise = new Promise(resolve => {
        resolveFirst = resolve;
      });

      const mockFetch = jest.fn().mockImplementation((_url: string, options: any) => {
        const body = JSON.parse(options?.body ?? '{}');
        if (body.textQuery?.includes('Phở')) {
          return firstPromise;
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            places: [{ id: 'p2', displayName: { text: 'Quán Thứ Hai' }, formattedAddress: 'Địa chỉ 2' }],
          }),
        });
      });

      (globalThis as any).fetch = mockFetch;

      const locAdapter = new MockLocationAdapter('granted', { latitude: 10.77, longitude: 106.70 });

      const repo = new LivePlacesRepository({
        locationAdapter: locAdapter,
        config: { apiKey: 'KEY', isDevSimulated: false },
      });

      // Start first request
      const firstCallPromise = repo.fetchNearbyPlaces({
        resultId: 'r_01',
        winnerDishId: 'd_01',
        dishName: 'Phở',
      });

      // Immediately start second request for a different room
      const secondCallPromise = repo.fetchNearbyPlaces({
        resultId: 'r_02',
        winnerDishId: 'd_02',
        dishName: 'Bún Chả',
      });

      // Finish first fetch late
      resolveFirst!({
        ok: true,
        json: async () => ({
          places: [{ id: 'p1', displayName: { text: 'Quán Thứ Nhất' } }],
        }),
      });

      const [res1, res2] = await Promise.all([firstCallPromise, secondCallPromise]);

      // First call was superseded by second call
      expect(res1.ok).toBe(false);
      // Second call succeeds with its own data
      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.data.resultId).toBe('r_02');
        expect(res2.data.places[0]!.name).toBe('Quán Thứ Hai');
      }
    });

    test('dispose aborts pending request and blocks further queries', async () => {
      const repo = new LivePlacesRepository();
      repo.dispose();

      const res = await repo.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Phở',
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.messageKey).toBe('CONTEXT_CHANGED');
      }
    });
  });

  describe('MockPlacesRepository & Factory', () => {
    test('MockPlacesRepository returns configured mock places and status', async () => {
      const mock = new MockPlacesRepository({
        status: 'ready',
        places: [
          {
            id: 'mock_p1',
            name: 'Quán Mock 1',
            address: '123 Mock St',
            distanceM: 300,
            latitude: 10.7,
            longitude: 106.7,
            attribution: 'Mock Attribution',
          },
        ],
      });

      const res = await mock.fetchNearbyPlaces({
        resultId: 'r1',
        winnerDishId: 'd1',
        dishName: 'Bánh Mì',
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('ready');
        expect(res.data.places).toHaveLength(1);
        expect(res.data.places[0]!.name).toBe('Quán Mock 1');
      }
    });

    test('createPlacesRepository creates LivePlacesRepository with options', () => {
      const repo = createPlacesRepository({ isDevSimulated: true });
      expect(repo).toBeInstanceOf(LivePlacesRepository);
    });
  });
});
