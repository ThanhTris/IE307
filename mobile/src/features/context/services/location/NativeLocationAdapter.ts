/**
 * Android Native Foreground Location Adapter:
 * Uses React Native PermissionsAndroid on Android devices for foreground-only permission.
 * Supports injected or runtime-detected NativeLocationProvider (such as Expo Location SDK).
 * Never requests background location tracking.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import type {
  LocationAdapter,
  LocationCoordinates,
  LocationPermissionStatus,
} from './types';

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

    throw new Error('NATIVE_GPS_UNAVAILABLE');
  }
}
