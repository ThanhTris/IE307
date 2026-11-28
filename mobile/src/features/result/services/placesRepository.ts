import { Linking } from 'react-native';
import Constants from 'expo-constants';
import type { ReadResult } from '../../../data/api/contracts';
import { isDevRuntime } from '../../../shared/lib/appEnv';
import {
  type LocationAdapter,
  type LocationCoordinates,
  type LocationPermissionStatus,
} from '../../context/services/location/types';
import { calculateDistanceM } from '../../context/services/location/geoAndTimeMath';
import { NativeLocationAdapter } from '../../context/services/location/NativeLocationAdapter';
import { MockLocationAdapter } from '../../context/services/location/MockLocationAdapter';
import type { NearbyPlace, NearbyState, NearbyStatus } from './resultPresentation';
import type { FetchNearbyPlacesParams } from './resultRepository';

/**
 * GM-30 / GM-54 — Places repository and Google Places client integration.
 */

export const DEFAULT_ANDROID_PACKAGE = 'vn.gicungduoc.mobile';
export const DEFAULT_PLACES_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_PLACES_CACHE_ENTRIES = 30;
const PLACES_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location';

export interface PlacesConfig {
  apiKey?: string;
  language?: string;
  radiusM?: number;
  maxResults?: number;
  isDevSimulated?: boolean;
  androidPackage?: string;
  androidCertSha1?: string;
  cacheTtlMs?: number;
}

/** Normalize Android signing SHA-1 hex (strip colons/whitespace, uppercase 40 hex chars). */
export function normalizeAndroidCertSha1(raw?: string): string | undefined {
  const cleaned = raw?.replace(/[:\s-]/g, '').trim().toUpperCase();
  return cleaned && /^[0-9A-F]{40}$/.test(cleaned) ? cleaned : undefined;
}

export function getAndroidPackageFromConfig(): string {
  return Constants.expoConfig?.android?.package?.trim() || DEFAULT_ANDROID_PACKAGE;
}

export function getAndroidCertSha1FromEnv(): string | undefined {
  const extraCert = typeof Constants.expoConfig?.extra?.androidCertSha1 === 'string'
    ? Constants.expoConfig.extra.androidCertSha1
    : undefined;
  return normalizeAndroidCertSha1(process.env.EXPO_PUBLIC_ANDROID_CERT_SHA1 ?? extraCert);
}

/** Build Google Places (New) HTTP headers including Android app restriction headers. */
export function buildPlacesRequestHeaders(params: {
  apiKey: string;
  androidPackage?: string;
  androidCertSha1?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': params.apiKey,
    'X-Goog-FieldMask': PLACES_FIELD_MASK,
    'X-Android-Package': params.androidPackage?.trim() || DEFAULT_ANDROID_PACKAGE,
  };
  const cert = normalizeAndroidCertSha1(params.androidCertSha1);
  if (cert) {
    headers['X-Android-Cert'] = cert;
  }
  return headers;
}

export interface PlacesRepository {
  fetchNearbyPlaces(params: FetchNearbyPlacesParams): Promise<ReadResult<NearbyState>>;
  getLocationPermission(): Promise<LocationPermissionStatus>;
  requestLocationPermission(): Promise<LocationPermissionStatus>;
  openLocationSettings(): Promise<boolean>;
  dispose?(): void;
}

const DEFAULT_PLACES_RADIUS_M = 5000;
const DEFAULT_MAX_PLACES = 5;
const GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';
const SIMULATED_ATTRIBUTION = 'Dữ liệu mô phỏng trên máy ảo AVD · Google Places thật cần billing key';
const GOOGLE_ATTRIBUTION = 'Dữ liệu quán từ Google Places API';

interface GooglePlaceLocation {
  latitude?: number;
  longitude?: number;
}

interface GooglePlaceItem {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: GooglePlaceLocation;
}

interface GooglePlacesResponse {
  places?: GooglePlaceItem[];
  error?: { code?: number; message?: string; status?: string };
}

interface CachedPlacesEntry {
  status: 'ready' | 'empty';
  places: NearbyPlace[];
  expiresAt: number;
}

export class LivePlacesRepository implements PlacesRepository {
  private readonly locationAdapter: LocationAdapter;
  private readonly config: PlacesConfig;
  private readonly responseCache = new Map<string, CachedPlacesEntry>();
  private currentAbortController: AbortController | null = null;
  private epoch = 0;
  private disposed = false;

  constructor(options: {
    locationAdapter?: LocationAdapter;
    config?: PlacesConfig;
  } = {}) {
    this.config = options.config ?? {};
    this.locationAdapter =
      options.locationAdapter ??
      (this.config.isDevSimulated ? new MockLocationAdapter('granted') : new NativeLocationAdapter());
  }

  async getLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      return await this.locationAdapter.getPermissionStatus();
    } catch {
      return 'unavailable';
    }
  }

  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      return await this.locationAdapter.requestPermission();
    } catch {
      return 'denied';
    }
  }

  async openLocationSettings(): Promise<boolean> {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  }

  async fetchNearbyPlaces(params: FetchNearbyPlacesParams): Promise<ReadResult<NearbyState>> {
    if (this.disposed) {
      return { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Repository is disposed' } };
    }

    const { resultId, winnerDishId } = params;
    const dishName = (params.dishName ?? '').trim();
    if (!resultId || !winnerDishId || !dishName) {
      return { ok: false, error: { messageKey: 'INVALID_INPUT', message: 'Missing required result or dish information' } };
    }

    // Cancel in-flight request if any
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    const currentEpoch = ++this.epoch;
    const abortController = new AbortController();
    this.currentAbortController = abortController;

    const isCurrent = () => !this.disposed && currentEpoch === this.epoch && !abortController.signal.aborted;

    // Check location permission
    const permission = await this.getLocationPermission();
    if (!isCurrent()) {
      return { ok: false, error: { messageKey: 'CONTEXT_CHANGED', message: 'Request superseded' } };
    }

    if (permission === 'undetermined') {
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: 'permission',
          places: [],
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    if (permission === 'denied') {
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: 'denied',
          places: [],
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    if (permission === 'off') {
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: 'location-off',
          places: [],
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    if (permission === 'unavailable') {
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: 'unsupported',
          places: [],
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    // Permission granted: acquire coordinates
    let coords: LocationCoordinates | null = null;
    try {
      coords = await this.locationAdapter.getCurrentCoordinates();
    } catch {
      if (!isCurrent()) return { ok: false, error: { messageKey: 'CONTEXT_CHANGED' } };
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: 'error',
          places: [],
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    if (!isCurrent()) {
      return { ok: false, error: { messageKey: 'CONTEXT_CHANGED' } };
    }

    // Fetch places: real Google Places API or Dev Simulated AVD Adapter
    const apiKey = this.config.apiKey?.trim();
    if (this.config.isDevSimulated) {
      const simulated = this.generateSimulatedPlaces(dishName, coords);
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: simulated.length > 0 ? 'ready' : 'empty',
          places: simulated,
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    if (!apiKey) {
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: 'unsupported',
          places: [],
          fetchedAt: new Date().toISOString(),
        },
      };
    }

    const language = this.config.language ?? 'vi';
    const radiusM = this.config.radiusM ?? DEFAULT_PLACES_RADIUS_M;
    const maxResults = this.config.maxResults ?? DEFAULT_MAX_PLACES;
    const cacheTtlMs = this.config.cacheTtlMs ?? DEFAULT_PLACES_CACHE_TTL_MS;
    const cacheKey = this.buildCacheKey(dishName, coords, language, radiusM, maxResults);

    if (cacheTtlMs > 0) {
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        if (Date.now() < cached.expiresAt) {
          return {
            ok: true,
            data: {
              resultId,
              winnerDishId,
              status: cached.status,
              places: cached.places.map(place => ({ ...place })),
              fetchedAt: new Date().toISOString(),
            },
          };
        }
        this.responseCache.delete(cacheKey);
      }
    }

    // Real Google Places API (New) Call directly from app
    try {
      const response = await fetch(GOOGLE_PLACES_API_URL, {
        method: 'POST',
        headers: buildPlacesRequestHeaders({
          apiKey,
          androidPackage: this.config.androidPackage ?? getAndroidPackageFromConfig(),
          androidCertSha1: this.config.androidCertSha1 ?? getAndroidCertSha1FromEnv(),
        }),
        body: JSON.stringify({
          textQuery: `quán ${dishName}`,
          languageCode: language,
          locationBias: coords ? {
            circle: {
              center: { latitude: coords.latitude, longitude: coords.longitude },
              radius: radiusM,
            },
          } : undefined,
          maxResultCount: maxResults,
        }),
        signal: abortController.signal,
      });

      if (!isCurrent()) {
        return { ok: false, error: { messageKey: 'CONTEXT_CHANGED' } };
      }

      if (!response.ok) {
        return {
          ok: true,
          data: {
            resultId,
            winnerDishId,
            status: 'error',
            places: [],
            fetchedAt: new Date().toISOString(),
          },
        };
      }

      const body = (await response.json()) as GooglePlacesResponse;
      if (!isCurrent()) {
        return { ok: false, error: { messageKey: 'CONTEXT_CHANGED' } };
      }

      const rawPlaces = body.places ?? [];
      const places: NearbyPlace[] = rawPlaces.flatMap((item, index) => {
        const id = item.id?.trim() || `google_place_${index}`;
        const name = item.displayName?.text?.trim();
        if (!name) return [];

        const lat = item.location?.latitude;
        const lng = item.location?.longitude;
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

        const distanceM = hasCoords && coords
          ? Math.round(calculateDistanceM(coords.latitude, coords.longitude, lat!, lng!))
          : null;

        return [{
          id,
          name,
          address: item.formattedAddress?.trim() || null,
          latitude: hasCoords ? lat! : null,
          longitude: hasCoords ? lng! : null,
          distanceM,
          attribution: GOOGLE_ATTRIBUTION,
        }];
      });

      const status: 'ready' | 'empty' = places.length > 0 ? 'ready' : 'empty';
      if (cacheTtlMs > 0) {
        this.writeCache(cacheKey, {
          status,
          places: places.map(place => ({ ...place })),
          expiresAt: Date.now() + cacheTtlMs,
        });
      }

      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status,
          places,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (err: unknown) {
      if (!isCurrent()) {
        return { ok: false, error: { messageKey: 'CONTEXT_CHANGED' } };
      }
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort) {
        return { ok: false, error: { messageKey: 'CONTEXT_CHANGED' } };
      }
      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: 'error',
          places: [],
          fetchedAt: new Date().toISOString(),
        },
      };
    } finally {
      if (this.currentAbortController === abortController) {
        this.currentAbortController = null;
      }
    }
  }

  private generateSimulatedPlaces(dishName: string, coords: LocationCoordinates | null): NearbyPlace[] {
    const baseLat = coords?.latitude ?? 10.7769; // TP.HCM center
    const baseLng = coords?.longitude ?? 106.7009;

    return [
      {
        id: 'sim_place_01',
        name: `Quán ${dishName} Cô Ba`,
        address: '123 Đường Số 7, Phường Linh Trung, TP. Thủ Đức',
        latitude: baseLat + 0.003,
        longitude: baseLng + 0.002,
        distanceM: 420,
        attribution: SIMULATED_ATTRIBUTION,
      },
      {
        id: 'sim_place_02',
        name: `${dishName} Gia Truyền 1985`,
        address: '45 Đường Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức',
        latitude: baseLat - 0.004,
        longitude: baseLng + 0.005,
        distanceM: 780,
        attribution: SIMULATED_ATTRIBUTION,
      },
      {
        id: 'sim_place_03',
        name: `Bếp Nhà Mình — Chuyên ${dishName}`,
        address: '78 Đường Đặng Văn Bi, Phường Trường Thọ, TP. Thủ Đức',
        latitude: baseLat + 0.008,
        longitude: baseLng - 0.006,
        distanceM: 1350,
        attribution: SIMULATED_ATTRIBUTION,
      },
    ];
  }

  private buildCacheKey(
    dishName: string,
    coords: LocationCoordinates | null,
    language: string,
    radiusM: number,
    maxResults: number,
  ): string {
    const normalizedDish = dishName.trim().toLocaleLowerCase('vi');
    const coordPart = coords
      ? `${(Math.round(coords.latitude * 1000) / 1000).toFixed(3)},${(Math.round(coords.longitude * 1000) / 1000).toFixed(3)}`
      : 'no-coords';
    return `${normalizedDish}|${coordPart}|${language}|${radiusM}|${maxResults}`;
  }

  private writeCache(key: string, entry: CachedPlacesEntry): void {
    if (this.responseCache.has(key)) {
      this.responseCache.delete(key);
    } else if (this.responseCache.size >= MAX_PLACES_CACHE_ENTRIES) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.responseCache.delete(oldestKey);
      }
    }
    this.responseCache.set(key, entry);
  }

  dispose(): void {
    this.disposed = true;
    this.responseCache.clear();
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
}

export class MockPlacesRepository implements PlacesRepository {
  private status: NearbyStatus;
  private places: NearbyPlace[];
  private permission: LocationPermissionStatus;

  constructor(options: {
    status?: NearbyStatus;
    places?: NearbyPlace[];
    permission?: LocationPermissionStatus;
  } = {}) {
    this.status = options.status ?? 'ready';
    this.places = options.places ?? [];
    this.permission = options.permission ?? 'granted';
  }

  async getLocationPermission(): Promise<LocationPermissionStatus> {
    return this.permission;
  }

  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    this.permission = 'granted';
    return 'granted';
  }

  async openLocationSettings(): Promise<boolean> {
    return true;
  }

  async fetchNearbyPlaces(params: FetchNearbyPlacesParams): Promise<ReadResult<NearbyState>> {
    return {
      ok: true,
      data: {
        resultId: params.resultId,
        winnerDishId: params.winnerDishId,
        status: this.status,
        places: this.status === 'ready' ? this.places : [],
        fetchedAt: new Date().toISOString(),
      },
    };
  }
}

export function getPlacesApiKeyFromEnv(): string | undefined {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_PLACES_API_KEY;
}

export function isPlacesSimulatedFromEnv(): boolean {
  const val = process.env.EXPO_PUBLIC_PLACES_SIMULATED;
  return val === '1' || val === 'true';
}

export function createPlacesRepository(options: {
  isDevSimulated?: boolean;
  apiKey?: string;
  locationAdapter?: LocationAdapter;
  androidPackage?: string;
  androidCertSha1?: string;
  cacheTtlMs?: number;
} = {}): PlacesRepository {
  const envKey = getPlacesApiKeyFromEnv();
  const effectiveKey = options.apiKey ?? envKey;
  const envSimulated = isPlacesSimulatedFromEnv();
  const isDev = isDevRuntime();
  const effectiveSimulated = options.isDevSimulated !== undefined
    ? (isDev ? options.isDevSimulated : false)
    : (isDev && envSimulated);

  return new LivePlacesRepository({
    locationAdapter: options.locationAdapter,
    config: {
      apiKey: effectiveKey,
      isDevSimulated: effectiveSimulated,
      androidPackage: options.androidPackage ?? getAndroidPackageFromConfig(),
      androidCertSha1: options.androidCertSha1 ?? getAndroidCertSha1FromEnv(),
      cacheTtlMs: options.cacheTtlMs,
    },
  });
}
