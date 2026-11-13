import { Linking } from 'react-native';
import { getActivePushDriver } from '../../inbox/services/expoPushDriver';
import { NativeLocationAdapter } from '../../context/services/location/NativeLocationAdapter';
import { NativeQrScannerAdapter } from '../../rooms/services/joinLinks';

/** The three things the app may ask the phone for. */
export type PermissionKind = 'notifications' | 'camera' | 'location';
/** What the phone knows before asking. `undetermined`: never asked, or can be asked again. */
export type RawPermission = 'granted' | 'undetermined' | 'denied' | 'unavailable';
/**
 * Result of asking:
 * - `granted`: allowed;
 * - `denied`: refused this time, the app may ask again later when the feature is used;
 * - `blocked`: refused again after an earlier refusal, so the phone will not show the question; only Settings can allow it;
 * - `unavailable`: this phone or build cannot give it (for example remote notifications in Expo Go).
 */
export type PermissionOutcome = 'granted' | 'denied' | 'blocked' | 'unavailable';

export interface PermissionDriver {
  status(): Promise<RawPermission>;
  request(): Promise<RawPermission>;
}
export type PermissionDrivers = Record<PermissionKind, PermissionDriver>;

export interface PermissionService {
  status(kind: PermissionKind): Promise<RawPermission>;
  /** Asks only when needed; safe to call every time a feature needs the permission (it asks again after a refusal). */
  ensure(kind: PermissionKind): Promise<PermissionOutcome>;
  openSettings(): Promise<void>;
}

export function createPermissionService(drivers: PermissionDrivers = defaultDrivers(), openSettings: () => Promise<void> = openAppSettings): PermissionService {
  const safe = async (run: () => Promise<RawPermission>): Promise<RawPermission> => {
    try { return await run(); } catch { return 'unavailable'; }
  };
  return {
    status: kind => safe(() => drivers[kind].status()),
    async ensure(kind) {
      const before = await safe(() => drivers[kind].status());
      if (before === 'granted') return 'granted';
      if (before === 'unavailable') return 'unavailable';
      const after = await safe(() => drivers[kind].request());
      if (after === 'granted') return 'granted';
      if (after === 'unavailable') return 'unavailable';
      return before === 'denied' ? 'blocked' : 'denied';
    },
    openSettings,
  };
}

async function openAppSettings(): Promise<void> {
  try { await Linking.openSettings(); } catch { /* nothing else to try */ }
}

function defaultDrivers(): PermissionDrivers {
  const camera = new NativeQrScannerAdapter();
  const location = new NativeLocationAdapter();
  const fromCamera = (value: string): RawPermission => value === 'granted' ? 'granted' : value === 'undetermined' ? 'undetermined' : value === 'unavailable' ? 'unavailable' : 'denied';
  const fromLocation = (value: string): RawPermission => value === 'granted' ? 'granted' : value === 'undetermined' ? 'undetermined' : value === 'unavailable' ? 'unavailable' : 'denied';
  return {
    camera: { status: async () => fromCamera(await camera.getPermissionStatus()), request: async () => fromCamera(await camera.requestPermission()) },
    location: { status: async () => fromLocation(await location.getPermissionStatus()), request: async () => fromLocation(await location.requestPermission()) },
    notifications: {
      async status() {
        const driver = getActivePushDriver();
        if (driver.availability() !== 'available') return 'unavailable';
        const state = await driver.getPermissionStatus();
        return state === 'granted' || state === 'provisional' ? 'granted' : state === 'denied' ? 'denied' : 'undetermined';
      },
      async request() {
        const driver = getActivePushDriver();
        if (driver.availability() !== 'available') return 'unavailable';
        const state = await driver.requestPermission();
        return state === 'granted' || state === 'provisional' ? 'granted' : state === 'denied' ? 'denied' : 'undetermined';
      },
    },
  };
}

/** Copy for the permissions screen and for the "allow it in Settings" hint. */
export const permissionCopy: Record<PermissionKind, { title: string; reason: string }> = {
  notifications: { title: 'Thông báo', reason: 'Biết ngay khi có lời mời kết bạn, lời rủ ăn hoặc kết quả phòng.' },
  camera: { title: 'Camera', reason: 'Quét mã QR để vào phòng nhanh.' },
  location: { title: 'Vị trí', reason: 'Tìm quán gần bạn cho món được chọn. Tọa độ không gửi lên máy chủ.' },
};
