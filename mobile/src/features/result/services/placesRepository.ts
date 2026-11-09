import { Linking } from 'react-native';
import type { ReadResult } from '../../../data/api/contracts';
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
 * GM-30 — Places repository and Google Places client integration.
 */

export interface PlacesConfig {
  apiKey?: string;
  language?: string;
  radiusM?: number;
  maxResults?: number;
  isDevSimulated?: boolean;
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

export class LivePlacesRepository implements PlacesRepository {
  private readonly locationAdapter: LocationAdapter;
  private readonly config: PlacesConfig;
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

    // Real Google Places API (New) Call directly from app
    try {
      const response = await fetch(GOOGLE_PLACES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({
          textQuery: `quán ${dishName}`,
          languageCode: this.config.language ?? 'vi',
          locationBias: coords ? {
            circle: {
              center: { latitude: coords.latitude, longitude: coords.longitude },
              radius: this.config.radiusM ?? DEFAULT_PLACES_RADIUS_M,
            },
          } : undefined,
          maxResultCount: this.config.maxResults ?? DEFAULT_MAX_PLACES,
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

      return {
        ok: true,
        data: {
          resultId,
          winnerDishId,
          status: places.length > 0 ? 'ready' : 'empty',
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

  dispose(): void {
    this.disposed = true;
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
} = {}): PlacesRepository {
  const envKey = getPlacesApiKeyFromEnv();
  const effectiveKey = options.apiKey ?? envKey;
  const envSimulated = isPlacesSimulatedFromEnv();
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
  const effectiveSimulated = options.isDevSimulated !== undefined
    ? (isDev ? options.isDevSimulated : false)
    : (isDev && envSimulated);

  return new LivePlacesRepository({
    locationAdapter: options.locationAdapter,
    config: {
      apiKey: effectiveKey,
      isDevSimulated: effectiveSimulated,
    },
  });
}
