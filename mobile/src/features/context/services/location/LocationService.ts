/**
 * GM-24 — Composed Location Service & default adapter factory.
 */
import { Platform } from 'react-native';
import * as ExpoLocation from 'expo-location';
import type { PublicAnchor } from '../../../../data/api/contracts';
import {
  calculateDistanceM,
  computeEatNowTime,
  findNearestAnchor,
  validateDesiredTime,
} from './geoAndTimeMath';
import { MockLocationAdapter } from './MockLocationAdapter';
import { NativeLocationAdapter, type NativeLocationProvider } from './NativeLocationAdapter';
import {
  DEFAULT_EAT_NOW_BUFFER_MINUTES,
  DEFAULT_MAX_COVERAGE_RADIUS_M,
  type AnchorWithDistance,
  type LocationAdapter,
  type LocationCoordinates,
  type LocationResolution,
  type TimeResolution,
} from './types';
import { WebLocationAdapter } from './WebLocationAdapter';

/**
 * Automatically resolves the most appropriate location adapter based on runtime platform.
 */
export function createDefaultLocationAdapter(): LocationAdapter {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return new NativeLocationAdapter(ExpoLocation as unknown as NativeLocationProvider);
  }
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return new WebLocationAdapter();
  }
  return new MockLocationAdapter();
}

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
    this.adapter = options.adapter ?? createDefaultLocationAdapter();
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
  async resolveWithGps(anchors: PublicAnchor[]): Promise<LocationResolution> {
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
