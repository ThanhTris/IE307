/**
 * GM-24 — Location và coverage native integration
 *
 * Location service & adapter implementing foreground device GPS resolution,
 * nearest public anchor suggestion, manual fallback, server-time buffer calculation,
 * and strict privacy sanitization (raw GPS coordinates NEVER sent to server/log/database).
 */

import { PermissionsAndroid, Platform } from 'react-native';
import type {
  MealSlot,
  PublicAnchor,
  RoomContext,
  ServiceMode,
  TimeHint,
} from '../../../data/api/contracts';

// ============================================================================
// 1. Types & Interfaces
// ============================================================================

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type LocationPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'off';

export type LocationMode = 'gps' | 'manual';

export interface AnchorWithDistance extends PublicAnchor {
  distanceM: number;
  isOutsideCoverage: boolean;
}

export interface LocationResolution {
  mode: LocationMode;
  permission: LocationPermissionStatus;
  coords: LocationCoordinates | null; // strictly client-side local memory
  selectedAnchor: PublicAnchor | null;
  distanceM: number | null;
  isOutsideCoverage: boolean;
  sortedAnchors: AnchorWithDistance[];
  errorMessage: string | null;
}

export interface TimeResolution {
  mode: 'now' | 'scheduled';
  serverTime: string; // ISO
  bufferMinutes: number;
  desiredAt: string; // ISO
  isPast: boolean;
  requiresConfirmation: boolean;
  confirmedPast: boolean;
  isTooFarFuture: boolean;
}

export interface ContextDraft {
  anchorId: string;
  anchorName?: string;
  radiusM: number;
  desiredAt: string;
  serviceMode: ServiceMode;
  mealSlot: MealSlot;
  timeHint?: TimeHint;
  budget?: number | null;
  avoidRecent: boolean;
}

export interface LocationAdapter {
  getPermissionStatus(): Promise<LocationPermissionStatus>;
  requestPermission(): Promise<LocationPermissionStatus>;
  getCurrentCoordinates(): Promise<LocationCoordinates>;
}

// ============================================================================
// 2. Constants & Pure Domain Calculations
// ============================================================================

export const DEFAULT_MAX_COVERAGE_RADIUS_M = 15000; // 15 km limit to be considered inside anchor area
export const DEFAULT_EAT_NOW_BUFFER_MINUTES = 30; // 30 minutes buffer for "Ăn ngay"
export const MAX_FUTURE_SECONDS = 7 * 24 * 60 * 60; // 7 days ahead limit per GM-18 API policy
export const MAX_ALLOWED_RADIUS_M = 10000; // 10,000m maximum discovery radius

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 */
export function calculateDistanceM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Number.NaN;
  }
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000; // Earth mean radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates candidate public anchors against the user's local GPS coordinates,
 * sorting them by distance and determining whether the closest anchor is within coverage range.
 */
export function findNearestAnchor(
  userCoords: LocationCoordinates,
  anchors: PublicAnchor[],
  maxCoverageRadiusM = DEFAULT_MAX_COVERAGE_RADIUS_M
): {
  nearest: PublicAnchor | null;
  distanceM: number | null;
  isOutsideCoverage: boolean;
  sortedAnchors: AnchorWithDistance[];
} {
  if (!anchors || anchors.length === 0) {
    return {
      nearest: null,
      distanceM: null,
      isOutsideCoverage: true,
      sortedAnchors: [],
    };
  }

  const sorted: AnchorWithDistance[] = anchors
    .map((anchor) => {
      const distance = calculateDistanceM(
        userCoords.latitude,
        userCoords.longitude,
        anchor.lat,
        anchor.lng
      );
      return {
        ...anchor,
        distanceM: Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY,
        isOutsideCoverage: distance > maxCoverageRadiusM,
      };
    })
    .sort((a, b) => a.distanceM - b.distanceM);

  const nearest = sorted[0];
  const isOutsideCoverage = !nearest || nearest.distanceM > maxCoverageRadiusM;

  return {
    nearest: nearest ?? null,
    distanceM: nearest ? nearest.distanceM : null,
    isOutsideCoverage,
    sortedAnchors: sorted,
  };
}

/**
 * Computes the target timestamp for "Ăn ngay" (Eat Now).
 * Takes the authoritative server time and adds the designated buffer (e.g. 30 minutes) ONCE.
 */
export function computeEatNowTime(
  serverTimeIso: string,
  bufferMinutes = DEFAULT_EAT_NOW_BUFFER_MINUTES
): string {
  const baseTime = Date.parse(serverTimeIso);
  if (!Number.isFinite(baseTime)) {
    throw new Error('INVALID_SERVER_TIME');
  }
  const targetTime = new Date(baseTime + bufferMinutes * 60 * 1000);
  return targetTime.toISOString();
}

/**
 * Validates a desired meal time against the authoritative server time.
 * - Does not add buffer again for scheduled mode.
 * - Checks whether the chosen time is in the past.
 * - Checks whether the time exceeds the 7-day maximum horizon.
 */
export function validateDesiredTime(
  desiredAtIso: string,
  serverTimeIso: string,
  maxFutureSeconds = MAX_FUTURE_SECONDS
): {
  isValid: boolean;
  isPast: boolean;
  isTooFarFuture: boolean;
  messageKey?: string;
} {
  const desired = Date.parse(desiredAtIso);
  const server = Date.parse(serverTimeIso);

  if (!Number.isFinite(desired) || !Number.isFinite(server)) {
    return {
      isValid: false,
      isPast: false,
      isTooFarFuture: false,
      messageKey: 'INVALID_INPUT',
    };
  }

  const isPast = desired < server;
  const isTooFarFuture = desired > server + maxFutureSeconds * 1000;

  if (isPast) {
    return {
      isValid: false,
      isPast: true,
      isTooFarFuture: false,
      messageKey: 'DESIRED_TIME_PASSED',
    };
  }

  if (isTooFarFuture) {
    return {
      isValid: false,
      isPast: false,
      isTooFarFuture: true,
      messageKey: 'DESIRED_TIME_TOO_FAR',
    };
  }

  return {
    isValid: true,
    isPast: false,
    isTooFarFuture: false,
  };
}

// ============================================================================
// 3. Privacy Boundary & Sanitization
// ============================================================================

/**
 * Strict Privacy Sanitizer:
 * Ensures the object transmitted to server / rooms API / outbox contains ONLY
 * the authorized discovery fields (anchorId, radiusM, desiredAt, etc.)
 * and NEVER contains user coordinates (latitude, longitude, accuracy, etc.).
 */
export function sanitizeContextForServer(draft: ContextDraft): RoomContext {
  if (!draft.anchorId || typeof draft.anchorId !== 'string') {
    throw new Error('INVALID_ANCHOR_ID');
  }
  if (!Number.isFinite(draft.radiusM) || draft.radiusM <= 0) {
    throw new Error('INVALID_RADIUS');
  }
  if (draft.radiusM > MAX_ALLOWED_RADIUS_M) {
    throw new Error('RADIUS_EXCEEDS_POLICY');
  }
  if (!draft.desiredAt || typeof draft.desiredAt !== 'string') {
    throw new Error('INVALID_DESIRED_TIME');
  }

  // Pure projection of allowed RoomContext properties
  const cleanContext: RoomContext = {
    anchorId: draft.anchorId,
    anchorName: draft.anchorName,
    radiusM: Math.round(draft.radiusM),
    desiredAt: draft.desiredAt,
    serviceMode: draft.serviceMode,
    mealSlot: draft.mealSlot,
    timeHint: draft.timeHint,
    budget: draft.budget ?? null,
    avoidRecent: Boolean(draft.avoidRecent),
  };

  // Defensive check: guarantee no coordinate keys exist
  const forbiddenKeys = ['lat', 'lng', 'latitude', 'longitude', 'coords', 'rawGps'];
  for (const key of forbiddenKeys) {
    if (key in (cleanContext as unknown as Record<string, unknown>)) {
      delete (cleanContext as unknown as Record<string, unknown>)[key];
    }
  }

  return cleanContext;
}

/**
 * Recursively redacts coordinate fields from log objects to prevent accidental leaks.
 */
export function redactLocationFromLog<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(redactLocationFromLog) as unknown as T;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (
      ['latitude', 'longitude', 'lat', 'lng', 'coords', 'rawGps', 'userCoords'].includes(
        key
      )
    ) {
      redacted[key] = '[REDACTED_GPS]';
    } else if (typeof val === 'object' && val !== null) {
      redacted[key] = redactLocationFromLog(val);
    } else {
      redacted[key] = val;
    }
  }
  return redacted as T;
}

// ============================================================================
// 4. Native & Mock Location Adapters
// ============================================================================

/**
 * In-memory Mock Location Adapter for deterministic automated unit/component tests,
 * manual scenario simulation (grant, deny, GPS-off, outside coverage, error).
 */
export class MockLocationAdapter implements LocationAdapter {
  private status: LocationPermissionStatus;
  private coords: LocationCoordinates;
  private shouldFailNextCoordinates = false;
  private delayMs = 0;

  constructor(
    initialStatus: LocationPermissionStatus = 'undetermined',
    initialCoords: LocationCoordinates = { latitude: 10.7828, longitude: 106.6958 } // Hồ Con Rùa
  ) {
    this.status = initialStatus;
    this.coords = initialCoords;
  }

  setPermissionStatus(status: LocationPermissionStatus) {
    this.status = status;
  }

  setCoordinates(coords: LocationCoordinates) {
    this.coords = coords;
  }

  setSimulateFailure(fail: boolean) {
    this.shouldFailNextCoordinates = fail;
  }

  setDelay(ms: number) {
    this.delayMs = ms;
  }

  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    return this.status;
  }

  async requestPermission(): Promise<LocationPermissionStatus> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.status === 'undetermined') {
      this.status = 'granted';
    }
    return this.status;
  }

  async getCurrentCoordinates(): Promise<LocationCoordinates> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.status !== 'granted') {
      throw new Error('PERMISSION_NOT_GRANTED');
    }
    if (this.shouldFailNextCoordinates) {
      throw new Error('GPS_POSITION_UNAVAILABLE');
    }
    return { ...this.coords };
  }
}

/**
 * Web Geolocation Adapter:
 * Uses standard browser navigator.geolocation when available in web environments.
 * Strictly checks for window and navigator.geolocation existence.
 */
export class WebLocationAdapter implements LocationAdapter {
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.permissions &&
      navigator.permissions.query
    ) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (result.state === 'granted') return 'granted';
        if (result.state === 'denied') return 'denied';
        return 'undetermined';
      } catch {
        return 'undetermined';
      }
    }
    return typeof navigator !== 'undefined' && 'geolocation' in navigator
      ? 'undetermined'
      : 'unavailable';
  }

  async requestPermission(): Promise<LocationPermissionStatus> {
    try {
      await this.getCurrentCoordinates();
      return 'granted';
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 1) return 'denied';
      if (code === 2) return 'off';
      return 'unavailable';
    }
  }

  async getCurrentCoordinates(): Promise<LocationCoordinates> {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      throw new Error('GEOLOCATION_UNAVAILABLE');
    }

    return new Promise<LocationCoordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }
}

/**
 * Interface for pluggable or dynamically injected native GPS providers
 * (e.g. Expo Location API or custom native modules).
 */
export interface NativeLocationProvider {
  requestForegroundPermissionsAsync?(): Promise<{ status: string; granted: boolean }>;
  getForegroundPermissionsAsync?(): Promise<{ status: string; granted: boolean }>;
  getCurrentPositionAsync?(options?: { accuracy?: number }): Promise<{
    coords: { latitude: number; longitude: number; accuracy?: number };
  }>;
}

/**
 * Android Native Foreground Location Adapter:
 * Uses React Native PermissionsAndroid on Android devices for foreground-only permission.
 * Supports injected or runtime-detected NativeLocationProvider (such as Expo Location SDK57).
 * Never requests background location tracking.
 */
export class NativeLocationAdapter implements LocationAdapter {
  private readonly provider?: NativeLocationProvider;

  constructor(provider?: NativeLocationProvider) {
    this.provider = provider;
  }

  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    if (this.provider?.getForegroundPermissionsAsync) {
      try {
        const res = await this.provider.getForegroundPermissionsAsync();
        if (res.status === 'granted' || res.granted) return 'granted';
        if (res.status === 'denied') return 'denied';
        return 'undetermined';
      } catch {
        return 'unavailable';
      }
    }

    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return hasPermission ? 'granted' : 'undetermined';
      } catch {
        return 'unavailable';
      }
    }

    return 'unavailable';
  }

  async requestPermission(): Promise<LocationPermissionStatus> {
    if (this.provider?.requestForegroundPermissionsAsync) {
      try {
        const res = await this.provider.requestForegroundPermissionsAsync();
        if (res.status === 'granted' || res.granted) return 'granted';
        if (res.status === 'denied') return 'denied';
        return 'undetermined';
      } catch {
        return 'unavailable';
      }
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Quyền truy cập vị trí',
            message:
              'Gì Cũng Được cần quyền vị trí để gợi ý điểm hẹn công cộng gần bạn nhất. Tọa độ không bao giờ được gửi lên máy chủ.',
            buttonPositive: 'Đồng ý',
            buttonNegative: 'Từ chối',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return 'granted';
        }
        if (granted === PermissionsAndroid.RESULTS.DENIED) {
          return 'denied';
        }
        if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return 'denied';
        }
        return 'denied';
      } catch {
        return 'unavailable';
      }
    }

    return 'unavailable';
  }

  async getCurrentCoordinates(): Promise<LocationCoordinates> {
    if (this.provider?.getCurrentPositionAsync) {
      try {
        const res = await this.provider.getCurrentPositionAsync({ accuracy: 3 });
        return {
          latitude: res.coords.latitude,
          longitude: res.coords.longitude,
          accuracy: res.coords.accuracy,
        };
      } catch (err: unknown) {
        throw new Error((err as { message?: string })?.message ?? 'GPS_POSITION_UNAVAILABLE');
      }
    }

    // Check runtime Expo modules if available
    const expoModules = (globalThis as unknown as { expo?: { modules?: Record<string, unknown> } })?.expo?.modules;
    if (expoModules?.ExpoLocation) {
      const expoLocation = expoModules.ExpoLocation as {
        getCurrentPositionAsync?: (options?: unknown) => Promise<{
          coords: { latitude: number; longitude: number; accuracy?: number };
        }>;
      };
      if (typeof expoLocation.getCurrentPositionAsync === 'function') {
        const res = await expoLocation.getCurrentPositionAsync({});
        return {
          latitude: res.coords.latitude,
          longitude: res.coords.longitude,
          accuracy: res.coords.accuracy,
        };
      }
    }

    throw new Error('NATIVE_GPS_UNAVAILABLE');
  }
}

/**
 * Backward compatibility alias for legacy imports
 */
export const BrowserNativeLocationAdapter = WebLocationAdapter;

/**
 * Automatically resolves the most appropriate location adapter based on runtime platform.
 */
export function createDefaultLocationAdapter(): LocationAdapter {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return new NativeLocationAdapter();
  }
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return new WebLocationAdapter();
  }
  return new MockLocationAdapter();
}

// ============================================================================
// 5. Composed Location Service
// ============================================================================

export interface LocationServiceOptions {
  adapter?: LocationAdapter;
  maxCoverageRadiusM?: number;
  defaultBufferMinutes?: number;
}

export class LocationService {
  private adapter: LocationAdapter;
  private maxCoverageRadiusM: number;
  private defaultBufferMinutes: number;

  constructor(options: LocationServiceOptions = {}) {
    this.adapter = options.adapter ?? new BrowserNativeLocationAdapter();
    this.maxCoverageRadiusM = options.maxCoverageRadiusM ?? DEFAULT_MAX_COVERAGE_RADIUS_M;
    this.defaultBufferMinutes = options.defaultBufferMinutes ?? DEFAULT_EAT_NOW_BUFFER_MINUTES;
  }

  getAdapter(): LocationAdapter {
    return this.adapter;
  }

  setAdapter(adapter: LocationAdapter) {
    this.adapter = adapter;
  }

  /**
   * One-shot foreground GPS resolution:
   * 1. Requests permission.
   * 2. If granted, retrieves foreground coordinates (kept client-side only).
   * 3. Matches with public anchors to find closest anchor.
   * 4. Flags outside coverage if distance exceeds coverage threshold.
   * 5. If denied/unavailable, falls back gracefully to manual selection mode.
   */
  async resolveWithGps(
    anchors: PublicAnchor[]
  ): Promise<LocationResolution> {
    try {
      const permission = await this.adapter.requestPermission();
      if (permission !== 'granted') {
        return {
          mode: 'manual',
          permission,
          coords: null,
          selectedAnchor: anchors[0] ?? null,
          distanceM: null,
          isOutsideCoverage: false,
          sortedAnchors: anchors.map((a) => ({
            ...a,
            distanceM: Number.POSITIVE_INFINITY,
            isOutsideCoverage: false,
          })),
          errorMessage:
            permission === 'denied'
              ? 'Quyền vị trí bị từ chối. Vui lòng chọn điểm hẹn công cộng thủ công.'
              : 'Không thể định vị GPS. Vui lòng chọn điểm hẹn thủ công.',
        };
      }

      const coords = await this.adapter.getCurrentCoordinates();
      const match = findNearestAnchor(coords, anchors, this.maxCoverageRadiusM);

      return {
        mode: match.isOutsideCoverage ? 'manual' : 'gps',
        permission: 'granted',
        coords,
        selectedAnchor: match.nearest,
        distanceM: match.distanceM,
        isOutsideCoverage: match.isOutsideCoverage,
        sortedAnchors: match.sortedAnchors,
        errorMessage: match.isOutsideCoverage
          ? 'Vị trí hiện tại nằm ngoài khu vực hỗ trợ. Vui lòng chọn điểm hẹn công cộng thủ công.'
          : null,
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        mode: 'manual',
        permission: 'unavailable',
        coords: null,
        selectedAnchor: anchors[0] ?? null,
        distanceM: null,
        isOutsideCoverage: false,
        sortedAnchors: anchors.map((a) => ({
          ...a,
          distanceM: Number.POSITIVE_INFINITY,
          isOutsideCoverage: false,
        })),
        errorMessage: err.message ?? 'Lỗi định vị vị trí.',
      };
    }
  }

  /**
   * Manual public anchor selection:
   * Retains manual mode without relying on GPS.
   */
  resolveManual(
    anchorId: string,
    anchors: PublicAnchor[],
    userCoords?: LocationCoordinates | null
  ): LocationResolution {
    const selected = anchors.find((a) => a.id === anchorId) ?? anchors[0] ?? null;
    let distanceM: number | null = null;
    let isOutside = false;

    if (userCoords && selected) {
      distanceM = calculateDistanceM(
        userCoords.latitude,
        userCoords.longitude,
        selected.lat,
        selected.lng
      );
      isOutside = distanceM > this.maxCoverageRadiusM;
    }

    const sortedAnchors: AnchorWithDistance[] = anchors.map((a) => {
      const dist = userCoords
        ? calculateDistanceM(userCoords.latitude, userCoords.longitude, a.lat, a.lng)
        : Number.POSITIVE_INFINITY;
      return {
        ...a,
        distanceM: dist,
        isOutsideCoverage: dist > this.maxCoverageRadiusM,
      };
    });

    return {
      mode: 'manual',
      permission: userCoords ? 'granted' : 'undetermined',
      coords: userCoords ?? null,
      selectedAnchor: selected,
      distanceM,
      isOutsideCoverage: isOutside,
      sortedAnchors,
      errorMessage: null,
    };
  }

  /**
   * Initializes time context for "Ăn ngay" mode:
   * Adds buffer once to authoritative server time.
   */
  resolveEatNow(serverTimeIso: string, bufferMinutes?: number): TimeResolution {
    const buffer = bufferMinutes ?? this.defaultBufferMinutes;
    const desiredAt = computeEatNowTime(serverTimeIso, buffer);
    return {
      mode: 'now',
      serverTime: serverTimeIso,
      bufferMinutes: buffer,
      desiredAt,
      isPast: false,
      requiresConfirmation: false,
      confirmedPast: false,
      isTooFarFuture: false,
    };
  }

  /**
   * Initializes or updates time context for "Đặt giờ" (Scheduled mode):
   * Does NOT add buffer; validates against server time.
   * If desiredAt is past server time, requires explicit user confirmation.
   */
  resolveScheduledTime(
    desiredAtIso: string,
    serverTimeIso: string,
    confirmedPast = false
  ): TimeResolution {
    const validation = validateDesiredTime(desiredAtIso, serverTimeIso);
    return {
      mode: 'scheduled',
      serverTime: serverTimeIso,
      bufferMinutes: 0,
      desiredAt: desiredAtIso,
      isPast: validation.isPast,
      requiresConfirmation: validation.isPast && !confirmedPast,
      confirmedPast,
      isTooFarFuture: validation.isTooFarFuture,
    };
  }

  /**
   * Adjusts an invalid or past scheduled time to a valid future time
   * by applying the designated buffer once to the authoritative server time.
   */
  adjustToValidServerTime(
    serverTimeIso: string,
    bufferMinutes = DEFAULT_EAT_NOW_BUFFER_MINUTES
  ): TimeResolution {
    const desiredAt = computeEatNowTime(serverTimeIso, bufferMinutes);
    return {
      mode: 'scheduled',
      serverTime: serverTimeIso,
      bufferMinutes: 0,
      desiredAt,
      isPast: false,
      requiresConfirmation: false,
      confirmedPast: false,
      isTooFarFuture: false,
    };
  }
}

export const locationService = new LocationService();
