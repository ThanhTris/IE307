import {
  DEFAULT_ANDROID_PACKAGE,
  LivePlacesRepository,
  buildPlacesRequestHeaders,
  createPlacesRepository,
  normalizeAndroidCertSha1,
} from '../../src/features/result/services/placesRepository';
import type { LocationAdapter } from '../../src/features/context/services/location/types';

function grantedLocationAdapter(latitude = 10.7769, longitude = 106.7009): LocationAdapter {
  return {
    getPermissionStatus: async () => 'granted',
    requestPermission: async () => 'granted',
    getCurrentCoordinates: async () => ({ latitude, longitude }),
  };
}

describe('GM-54 Google Places Android headers, response cache, and quota/403 isolation', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('normalizes SHA-1 fingerprint and attaches X-Android-Package + X-Android-Cert headers', () => {
    expect(normalizeAndroidCertSha1('ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89:ab:cd:ef:01'))
      .toBe('ABCDEF0123456789ABCDEF0123456789ABCDEF01');
    expect(normalizeAndroidCertSha1('too-short')).toBeUndefined();

    const headers = buildPlacesRequestHeaders({
      apiKey: 'places-key-1',
      androidPackage: 'vn.gicungduoc.mobile',
      androidCertSha1: '11:22:33:44:55:66:77:88:99:00:aa:bb:cc:dd:ee:ff:11:22:33:44',
    });

    expect(headers['X-Goog-Api-Key']).toBe('places-key-1');
    expect(headers['X-Android-Package']).toBe(DEFAULT_ANDROID_PACKAGE);
    expect(headers['X-Android-Cert']).toBe('11223344556677889900AABBCCDDEEFF11223344');

    const headersNoCert = buildPlacesRequestHeaders({ apiKey: 'places-key-2' });
    expect(headersNoCert['X-Android-Package']).toBe(DEFAULT_ANDROID_PACKAGE);
    expect(headersNoCert['X-Android-Cert']).toBeUndefined();
  });

  test('sends restriction headers on fetch and caches successful responses across repeated reads within TTL', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        places: [
          {
            id: 'p1',
            displayName: { text: 'Phở Hòa' },
            formattedAddress: '260C Pasteur',
            location: { latitude: 10.785, longitude: 106.689 },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const repo = createPlacesRepository({
      apiKey: 'places-test-key',
      androidCertSha1: '01:23:45:67:89:ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67',
      locationAdapter: grantedLocationAdapter(10.77691, 106.70091),
      cacheTtlMs: 60_000,
    });

    const first = await repo.fetchNearbyPlaces({
      resultId: 'res-1',
      winnerDishId: 'dish-pho',
      dishName: 'Phở bò',
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.status).toBe('ready');
      expect(first.data.places).toHaveLength(1);
    }

    // Second read for another result with micro GPS jitter uses cache and omits duplicate fetch.
    const second = await repo.fetchNearbyPlaces({
      resultId: 'res-2',
      winnerDishId: 'dish-pho',
      dishName: 'Phở bò',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual(expect.objectContaining({
      'X-Android-Package': 'vn.gicungduoc.mobile',
      'X-Android-Cert': '0123456789ABCDEF0123456789ABCDEF01234567',
    }));

    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data.resultId).toBe('res-2');
      expect(second.data.winnerDishId).toBe('dish-pho');
      expect(second.data.places[0]?.name).toBe('Phở Hòa');
    }

    // Different dish misses cache cleanly.
    await repo.fetchNearbyPlaces({
      resultId: 'res-3',
      winnerDishId: 'dish-bun',
      dishName: 'Bún chả',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('does not cache 403/429 quota errors and clears cache on dispose()', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ error: { status: 'PERMISSION_DENIED' } }) })
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED' } }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          places: [{ id: 'p2', displayName: { text: 'Cơm Tấm Cali' } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ places: [] }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const repo = new LivePlacesRepository({
      locationAdapter: grantedLocationAdapter(),
      config: {
        apiKey: 'places-test-key',
        cacheTtlMs: 60_000,
      },
    });

    const err403 = await repo.fetchNearbyPlaces({
      resultId: 'res-err-403',
      winnerDishId: 'dish-com',
      dishName: 'Cơm tấm',
    });
    expect(err403).toEqual({
      ok: true,
      data: expect.objectContaining({
        resultId: 'res-err-403',
        winnerDishId: 'dish-com',
        status: 'error',
        places: [],
      }),
    });

    const err429 = await repo.fetchNearbyPlaces({
      resultId: 'res-err-429',
      winnerDishId: 'dish-com',
      dishName: 'Cơm tấm',
    });
    expect(err429).toEqual({
      ok: true,
      data: expect.objectContaining({
        resultId: 'res-err-429',
        winnerDishId: 'dish-com',
        status: 'error',
        places: [],
      }),
    });

    const recovered = await repo.fetchNearbyPlaces({
      resultId: 'res-ok',
      winnerDishId: 'dish-com',
      dishName: 'Cơm tấm',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(recovered.ok).toBe(true);
    if (recovered.ok) {
      expect(recovered.data.status).toBe('ready');
      expect(recovered.data.places[0]?.name).toBe('Cơm Tấm Cali');
    }

    repo.dispose();
  });
});
