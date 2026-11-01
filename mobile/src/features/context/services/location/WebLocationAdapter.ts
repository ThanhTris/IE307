/**
 * Web Geolocation Adapter:
 * Uses standard browser navigator.geolocation when available in web environments.
 * Strictly checks for window and navigator.geolocation existence.
 */
import type {
  LocationAdapter,
  LocationCoordinates,
  LocationPermissionStatus,
} from './types';

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
 * Backward compatibility alias for legacy imports
 */
export const BrowserNativeLocationAdapter = WebLocationAdapter;
