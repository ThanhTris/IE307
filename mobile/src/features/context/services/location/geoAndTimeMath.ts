/**
 * GM-24 — Pure domain calculations for distance, nearest anchor, server time, and privacy sanitization.
 */
import type { PublicAnchor, RoomContext } from '../../../../data/api/contracts';
import {
  DEFAULT_EAT_NOW_BUFFER_MINUTES,
  DEFAULT_MAX_COVERAGE_RADIUS_M,
  MAX_ALLOWED_RADIUS_M,
  MAX_FUTURE_SECONDS,
  type AnchorWithDistance,
  type ContextDraft,
  type LocationCoordinates,
} from './types';

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
 * Takes the authoritative server time and adds the designated buffer (15 minutes by default) ONCE.
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
