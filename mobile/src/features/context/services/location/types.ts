/**
 * GM-24 — Location types, interfaces, and policy constants.
 */
import type {
  MealSlot,
  PublicAnchor,
  ServiceMode,
  TimeHint,
} from '../../../../data/api/contracts';

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

export const DEFAULT_MAX_COVERAGE_RADIUS_M = 15000; // 15 km limit to be considered inside anchor area
export const DEFAULT_EAT_NOW_BUFFER_MINUTES = 15; // 15 minutes buffer for "Ăn ngay"
export const MAX_FUTURE_SECONDS = 7 * 24 * 60 * 60; // 7 days ahead limit per GM-18 API policy
export const MAX_ALLOWED_RADIUS_M = 10000; // 10,000m maximum discovery radius
