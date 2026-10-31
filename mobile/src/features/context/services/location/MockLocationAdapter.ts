/**
 * In-memory Mock Location Adapter for deterministic automated unit/component tests,
 * manual scenario simulation (grant, deny, GPS-off, outside coverage, error).
 */
import type {
  LocationAdapter,
  LocationCoordinates,
  LocationPermissionStatus,
} from './types';

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
